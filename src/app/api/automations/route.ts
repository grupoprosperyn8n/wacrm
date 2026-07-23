import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireRole, toErrorResponse } from '@/lib/auth/account'
import { supabaseAdmin } from '@/lib/automations/admin-client'
import { getTemplate } from '@/lib/automations/templates'
import { sanitizeTemplateCloneConfig } from '@/lib/templates/sanitize-clone'
import {
  insertSteps,
  type BuilderStepInput,
} from '@/lib/automations/steps-tree'
import {
  validateStepsForActivation,
  validateTriggerForActivation,
} from '@/lib/automations/validate'

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('automations')
    .select('*')
    .order('created_at', { ascending: false })
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ automations: data ?? [] })
}

export async function POST(request: Request) {
  // Creating an automation is a write — the RLS automations_insert policy
  // requires `agent`, but this route inserts via the service-role client
  // which bypasses RLS, so the role must be enforced here.
  try {
    await requireRole('agent')
  } catch (err) {
    return toErrorResponse(err)
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Resolve the caller's account_id — `automations.account_id` is NOT
  // NULL post-017, so an INSERT without it trips the not-null constraint
  // even though the admin client bypasses RLS.
  const { data: profile } = await supabase
    .from('profiles')
    .select('account_id')
    .eq('user_id', user.id)
    .single()
  const accountId = profile?.account_id as string | undefined
  if (!accountId) {
    return NextResponse.json(
      { error: 'Your profile is not linked to an account.' },
      { status: 403 }
    )
  }

  const body = await request.json().catch(() => null)
  if (!body)
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })

  const {
    name,
    description,
    trigger_type,
    trigger_config,
    is_active,
    steps,
    template,
  } = body

  const templateDefinition =
    typeof template === 'string' ? getTemplate(template) : null
  const shouldUseTemplateSeed =
    !!templateDefinition && (!steps || steps.length === 0)

  let effectiveSteps: BuilderStepInput[] | undefined = steps
  let effectiveName = name
  let effectiveDescription = description
  let effectiveTriggerType = trigger_type
  let effectiveTriggerConfig = trigger_config

  if (shouldUseTemplateSeed) {
    const t = templateDefinition
    if (t) {
      effectiveName = effectiveName ?? t.name
      effectiveDescription = effectiveDescription ?? t.description
      effectiveTriggerType = effectiveTriggerType ?? t.trigger_type
      effectiveTriggerConfig = effectiveTriggerConfig ?? t.trigger_config
      effectiveSteps = t.steps as unknown as BuilderStepInput[]
    }
  }

  if (!effectiveName || !effectiveTriggerType) {
    return NextResponse.json(
      { error: 'name and trigger_type are required' },
      { status: 400 }
    )
  }

  // Block activation of a clearly broken automation up-front instead of
  // letting every trigger silently produce a failed log row. Drafts
  // (is_active=false) are allowed to be incomplete so users can save
  // progress mid-build.
  if (is_active) {
    const issues = [
      ...validateTriggerForActivation(
        effectiveTriggerType,
        effectiveTriggerConfig ?? {}
      ),
      ...validateStepsForActivation(
        (effectiveSteps ?? []) as unknown as {
          step_type: string
          step_config: Record<string, unknown>
        }[]
      ),
    ]
    if (issues.length > 0) {
      return NextResponse.json(
        {
          error: 'Cannot activate automation with invalid configuration',
          issues,
        },
        { status: 400 }
      )
    }
  }

  const admin = supabaseAdmin()
  const insertPayload = buildAutomationInsert({
    userId: user.id,
    accountId,
    name: effectiveName,
    description: effectiveDescription,
    triggerType: effectiveTriggerType,
    triggerConfig: effectiveTriggerConfig,
    isActive: is_active,
    templateDefinition,
  })
  const { data: automation, error: insertErr } = await admin
    .from('automations')
    .insert(insertPayload)
    .select()
    .single()

  if (insertErr || !automation) {
    return NextResponse.json(
      { error: insertErr?.message ?? 'insert failed' },
      { status: 500 }
    )
  }

  if (effectiveSteps && effectiveSteps.length > 0) {
    const stepsForInsert = shouldUseTemplateSeed
      ? sanitizeTemplateDerivedSteps(effectiveSteps)
      : effectiveSteps
    const err = await insertSteps(automation.id, stepsForInsert)
    if (err) return NextResponse.json({ error: err }, { status: 500 })
  }

  return NextResponse.json({ automation }, { status: 201 })
}

export function buildAutomationInsert({
  userId,
  accountId,
  name,
  description,
  triggerType,
  triggerConfig,
  isActive,
  templateDefinition,
}: {
  userId: string
  accountId: string
  name: string
  description?: string | null
  triggerType: string
  triggerConfig?: Record<string, unknown> | null
  isActive?: boolean
  templateDefinition?: {
    slug: string
    version: string
    schema_version: number
  } | null
}) {
  const insertPayload: Record<string, unknown> = {
    user_id: userId,
    account_id: accountId,
    name,
    description: description ?? null,
    trigger_type: triggerType,
    trigger_config: triggerConfig ?? {},
    is_active: !!isActive,
  }

  if (templateDefinition) {
    insertPayload.source_template_slug = templateDefinition.slug
    insertPayload.source_template_version = templateDefinition.version
    insertPayload.source_template_schema_version =
      templateDefinition.schema_version
  }

  return insertPayload
}

function sanitizeTemplateDerivedSteps(
  steps: BuilderStepInput[]
): BuilderStepInput[] {
  return steps.map((step) => ({
    ...step,
    step_config: sanitizeTemplateCloneConfig(step.step_config),
    branches: step.branches
      ? {
          yes: step.branches.yes
            ? sanitizeTemplateDerivedSteps(step.branches.yes)
            : undefined,
          no: step.branches.no
            ? sanitizeTemplateDerivedSteps(step.branches.no)
            : undefined,
        }
      : undefined,
  }))
}
