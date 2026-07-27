import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAccount, toErrorResponse } from '@/lib/auth/account'
import { supabaseAdmin } from '@/lib/automations/admin-client'

/**
 * GET /api/slack/config
 * Obtiene la configuracion Slack de la cuenta actual
 */
export async function GET() {
  try {
    const ctx = await getCurrentAccount()
    const db = supabaseAdmin()

    const { data, error } = await db
      .from('slack_integrations')
      .select('*')
      .eq('account_id', ctx.accountId)
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ config: data ?? null })
  } catch (err) {
    return toErrorResponse(err)
  }
}

/**
 * POST /api/slack/config
 * Crea o actualiza la configuracion Slack
 */
export async function POST(req: NextRequest) {
  try {
    const ctx = await getCurrentAccount()
    const db = supabaseAdmin()
    const body = await req.json()

    // Validar webhook_url
    if (!body.webhook_url || typeof body.webhook_url !== 'string') {
      return NextResponse.json({ error: 'webhook_url es requerido' }, { status: 400 })
    }

    if (!body.webhook_url.startsWith('https://hooks.slack.com/')) {
      return NextResponse.json(
        { error: 'URL invalida. Debe ser un Incoming Webhook de Slack (https://hooks.slack.com/...)' },
        { status: 400 },
      )
    }

    const payload = {
      account_id: ctx.accountId,
      webhook_url: body.webhook_url,
      channel_name: body.channel_name ?? null,
      notify_new_lead: body.notify_new_lead ?? true,
      notify_new_deal: body.notify_new_deal ?? true,
      notify_conversation_assigned: body.notify_conversation_assigned ?? true,
      is_active: body.is_active ?? true,
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await db
      .from('slack_integrations')
      .upsert(payload, { onConflict: 'account_id' })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ config: data })
  } catch (err) {
    return toErrorResponse(err)
  }
}

/**
 * DELETE /api/slack/config
 * Elimina la configuracion Slack
 */
export async function DELETE() {
  try {
    const ctx = await getCurrentAccount()
    const db = supabaseAdmin()

    const { error } = await db
      .from('slack_integrations')
      .delete()
      .eq('account_id', ctx.accountId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    return toErrorResponse(err)
  }
}
