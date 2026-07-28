import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAccount, toErrorResponse } from '@/lib/auth/account'
import { supabaseAdmin } from '@/lib/automations/admin-client'

/**
 * GET /api/calendar/config
 * Obtiene la configuracion de Google Calendar
 */
export async function GET() {
  try {
    const ctx = await getCurrentAccount()
    const db = supabaseAdmin()

    const { data, error } = await db
      .from('calendar_integrations')
      .select('id, account_id, google_email, sync_enabled, sync_description, calendar_id, last_synced_at, created_at')
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
 * PATCH /api/calendar/config
 * Actualiza la configuracion (sin tokens)
 */
export async function PATCH(req: NextRequest) {
  try {
    const ctx = await getCurrentAccount()
    const db = supabaseAdmin()
    const body = await req.json()

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }

    if (typeof body.sync_enabled === 'boolean') updates.sync_enabled = body.sync_enabled
    if (typeof body.sync_description === 'string') updates.sync_description = body.sync_description
    if (typeof body.calendar_id === 'string') updates.calendar_id = body.calendar_id

    const { error } = await db
      .from('calendar_integrations')
      .update(updates)
      .eq('account_id', ctx.accountId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    return toErrorResponse(err)
  }
}

/**
 * DELETE /api/calendar/config
 * Elimina la integracion (desconecta Calendar)
 */
export async function DELETE() {
  try {
    const ctx = await getCurrentAccount()
    const db = supabaseAdmin()

    const { error } = await db
      .from('calendar_integrations')
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
