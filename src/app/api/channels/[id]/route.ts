import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getCurrentAccount, requireRole, toErrorResponse } from '@/lib/auth/account'
import { supabaseAdmin } from '@/lib/automations/admin-client'

const VALID_CHANNEL_TYPES = ['whatsapp', 'telegram', 'facebook', 'instagram', 'web'] as const
type ChannelType = (typeof VALID_CHANNEL_TYPES)[number]

// ---------------------------------------------------------------------------
// GET /api/channels/[id] — get a single channel (RLS-scoped)
// ---------------------------------------------------------------------------
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { supabase } = await getCurrentAccount()
    const { id } = await params

    const { data, error } = await supabase
      .from('channels')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!data) return NextResponse.json({ error: 'Channel not found' }, { status: 404 })

    return NextResponse.json({ data })
  } catch (err) {
    return toErrorResponse(err)
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/channels/[id] — update a channel (admin only)
// ---------------------------------------------------------------------------
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  let ctx
  try {
    ctx = await requireRole('admin')
  } catch (err) {
    return toErrorResponse(err)
  }

  const { id } = await params

  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })

  const updates: Record<string, unknown> = {}

  if (body.name !== undefined) {
    if (typeof body.name !== 'string' || body.name.trim().length === 0) {
      return NextResponse.json({ error: 'Field "name" must be a non-empty string' }, { status: 400 })
    }
    updates.name = body.name.trim()
  }

  if (body.type !== undefined) {
    if (!VALID_CHANNEL_TYPES.includes(body.type as ChannelType)) {
      return NextResponse.json(
        { error: `Field "type" must be one of: ${VALID_CHANNEL_TYPES.join(', ')}` },
        { status: 400 },
      )
    }
    updates.type = body.type
  }

  if (body.config !== undefined) {
    if (typeof body.config !== 'object' || body.config === null || Array.isArray(body.config)) {
      return NextResponse.json({ error: 'Field "config" must be a JSON object' }, { status: 400 })
    }
    updates.config = body.config
  }

  if (body.is_active !== undefined) {
    updates.is_active = Boolean(body.is_active)
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields provided' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin()
    .from('channels')
    .update(updates)
    .eq('id', id)
    .eq('account_id', ctx.accountId)
    .select()
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 })
    }
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'An active channel of this type already exists.' },
        { status: 409 },
      )
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data })
}

// ---------------------------------------------------------------------------
// DELETE /api/channels/[id] — delete a channel (admin only)
// ---------------------------------------------------------------------------
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  let ctx
  try {
    ctx = await requireRole('admin')
  } catch (err) {
    return toErrorResponse(err)
  }

  const { id } = await params

  const { data, error } = await supabaseAdmin()
    .from('channels')
    .delete()
    .eq('id', id)
    .eq('account_id', ctx.accountId)
    .select()
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Channel not found' }, { status: 404 })

  return NextResponse.json({ success: true })
}
