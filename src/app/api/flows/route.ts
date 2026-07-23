import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireRole, toErrorResponse } from '@/lib/auth/account'
import { supabaseAdmin } from '@/lib/flows/admin-client'
import { getFlowTemplate } from '@/lib/flows/templates'
import { sanitizeTemplateCloneConfig } from '@/lib/templates/sanitize-clone'
import { normalizeChannelTypes, validateChannelTypes } from '@/lib/channels/channel-scope'

/**
 * GET /api/flows — list the caller's flows.
 * POST /api/flows — create a new (draft) flow.
 *
 * Available to every authenticated user. The previous per-account
 * beta gate was removed when Flows went to soft-GA; the UI still
 * shows a "Beta" label so users know the surface is young, but the
 * routes themselves are open.
 */

async function requireUser(): Promise<
  | { ok: true; userId: string; supabase: Awaited<ReturnType<typeof createClient>> }
  | { ok: false; status: number; body: { error: string } }
> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { ok: false, status: 401, body: { error: 'Unauthorized' } }
  }
  return { ok: true, userId: user.id, supabase }
}

export async function GET() {
  const guard = await requireUser()
  if (!guard.ok) {
    return NextResponse.json(guard.body, { status: guard.status })
  }
  const { supabase } = guard

  const { data, error } = await supabase
    .from('flows')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ flows: data ?? [] })
}

export async function POST(request: Request) {
  // Creating a flow is a write — the RLS flows_insert policy requires
  // `agent`, but this route inserts via the service-role client which
  // bypasses RLS, so the role must be enforced here.
  try {
    await requireRole('agent')
  } catch (err) {
    return toErrorResponse(err)
  }

  const guard = await requireUser()
  if (!guard.ok) {
    return NextResponse.json(guard.body, { status: guard.status })
  }
  const { userId, supabase } = guard

  // Resolve the caller's account_id — `flows.account_id` is NOT NULL
  // post-017, so an INSERT without it trips the not-null constraint
  // even though the admin client below bypasses RLS.
  const { data: profile } = await supabase
    .from('profiles')
    .select('account_id')
    .eq('user_id', userId)
    .single()
  const accountId = profile?.account_id as string | undefined
  if (!accountId) {
    return NextResponse.json(
      { error: 'Your profile is not linked to an account.' },
      { status: 403 },
    )
  }

  const body = (await request.json().catch(() => null)) as
    | {
        name?: string
        description?: string | null
        trigger_type?: 'keyword' | 'first_inbound_message' | 'manual'
        trigger_config?: Record<string, unknown>
        channel_types?: unknown
        /**
         * If set, clone the matching template's name + trigger +
         * entry_node_id + nodes[] into a fresh draft for this user.
         * `name` from the body overrides the template default if
         * provided.
         */
        template_slug?: string
        source_flow_id?: string
      }
    | null
  if (!body) {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const admin = supabaseAdmin()

  const channelTypesResult = validateChannelTypes(body.channel_types)
  if (!channelTypesResult.ok) {
    return NextResponse.json({ error: channelTypesResult.error }, { status: 400 })
  }

  if (body.template_slug && body.source_flow_id) {
    return NextResponse.json(
      { error: 'template_slug and source_flow_id cannot be used together' },
      { status: 400 },
    )
  }

  // -------- Existing-flow snapshot clone path --------
  if (body.source_flow_id) {
    const { data: source, error: sourceErr } = await admin
      .from('flows')
      .select('*')
      .eq('id', body.source_flow_id)
      .eq('account_id', accountId)
      .maybeSingle()
    if (sourceErr) {
      return NextResponse.json({ error: sourceErr.message }, { status: 500 })
    }
    if (!source) {
      return NextResponse.json({ error: 'Source flow not found' }, { status: 404 })
    }

    const { data: sourceNodes, error: sourceNodesErr } = await admin
      .from('flow_nodes')
      .select('node_key, node_type, config, position_x, position_y')
      .eq('flow_id', source.id)
      .order('created_at', { ascending: true })
    if (sourceNodesErr) {
      return NextResponse.json({ error: sourceNodesErr.message }, { status: 500 })
    }

    const { data: flow, error: flowErr } = await admin
      .from('flows')
      .insert({
        user_id: userId,
        account_id: accountId,
        name: body.name?.trim() || `${source.name} (Copy)`,
        description: body.description ?? source.description,
        status: 'draft',
        trigger_type: source.trigger_type,
        trigger_config: source.trigger_config,
        entry_node_id: source.entry_node_id,
        fallback_policy: source.fallback_policy,
        channel_types:
          body.channel_types === undefined
            ? normalizeChannelTypes(source.channel_types)
            : channelTypesResult.channel_types,
        source_flow_id: source.id,
        source_template_slug: source.source_template_slug,
        source_template_version: source.source_template_version,
        source_template_schema_version: source.source_template_schema_version,
        execution_count: 0,
        last_executed_at: null,
      })
      .select()
      .single()
    if (flowErr || !flow) {
      return NextResponse.json(
        { error: flowErr?.message ?? 'flow insert failed' },
        { status: 500 },
      )
    }

    if (sourceNodes && sourceNodes.length > 0) {
      const { error: nodesErr } = await admin.from('flow_nodes').insert(
        sourceNodes.map((node) => ({
          flow_id: flow.id,
          node_key: node.node_key,
          node_type: node.node_type,
          // This is an explicit same-account duplicate, not a system
          // template clone. Preserve account-owned resource references;
          // system template clones remain sanitized below.
          config: node.config,
          position_x: node.position_x ?? 0,
          position_y: node.position_y ?? 0,
        })),
      )
      if (nodesErr) {
        await admin.from('flows').delete().eq('id', flow.id)
        return NextResponse.json({ error: nodesErr.message }, { status: 500 })
      }
    }

    return NextResponse.json({ flow }, { status: 201 })
  }

  // -------- Template clone path --------
  if (body.template_slug) {
    const template = getFlowTemplate(body.template_slug)
    if (!template) {
      return NextResponse.json(
        { error: `Unknown template_slug "${body.template_slug}"` },
        { status: 400 },
      )
    }
    const { data: flow, error: flowErr } = await admin
      .from('flows')
      .insert({
        user_id: userId,
        account_id: accountId,
        name: body.name?.trim() || template.name,
        description: template.description,
        status: 'draft',
        trigger_type: template.trigger_type,
        trigger_config: template.trigger_config,
        entry_node_id: template.entry_node_id,
        source_template_slug: template.slug,
        source_template_version: template.version,
        source_template_schema_version: template.schema_version,
        channel_types:
          body.channel_types === undefined
            ? template.channel_types
            : channelTypesResult.channel_types,
      })
      .select()
      .single()
    if (flowErr || !flow) {
      return NextResponse.json(
        { error: flowErr?.message ?? 'flow insert failed' },
        { status: 500 },
      )
    }
    if (template.nodes.length > 0) {
      const { error: nodesErr } = await admin.from('flow_nodes').insert(
        template.nodes.map((n) => ({
          flow_id: flow.id,
          node_key: n.node_key,
          node_type: n.node_type,
          config: sanitizeTemplateCloneConfig(n.config),
        })),
      )
      if (nodesErr) {
        // Roll back the parent flow so a half-cloned template doesn't
        // sit as an empty draft. CASCADE on flow_id removes the
        // (probably zero) nodes too.
        await admin.from('flows').delete().eq('id', flow.id)
        return NextResponse.json(
          { error: nodesErr.message },
          { status: 500 },
        )
      }
    }
    return NextResponse.json({ flow }, { status: 201 })
  }

  // -------- Plain (empty) create path --------
  if (!body.name?.trim()) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 })
  }
  const trigger_type = body.trigger_type ?? 'keyword'

  const { data, error } = await admin
    .from('flows')
    .insert({
      user_id: userId,
      account_id: accountId,
      name: body.name.trim(),
      description: body.description ?? null,
      status: 'draft',
      trigger_type,
      trigger_config: body.trigger_config ?? {},
      channel_types: channelTypesResult.channel_types,
    })
    .select()
    .single()
  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? 'insert failed' },
      { status: 500 },
    )
  }
  return NextResponse.json({ flow: data }, { status: 201 })
}
