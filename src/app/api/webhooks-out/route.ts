import { NextResponse } from 'next/server'
import { getCurrentAccount, requireRole, toErrorResponse } from '@/lib/auth/account'
import { supabaseAdmin } from '@/lib/automations/admin-client'

export async function GET() {
  try {
    const { supabase, accountId } = await getCurrentAccount()
    const { data } = await supabase.from('webhook_outgoing').select('*').eq('account_id', accountId).order('created_at', { ascending: false })
    return NextResponse.json({ webhooks: data ?? [] })
  } catch (err) { return toErrorResponse(err) }
}

export async function POST(request: Request) {
  try {
    const ctx = await requireRole('admin')
    const body = await request.json()
    if (!body.url || !body.event) return NextResponse.json({ error: 'url y event requeridos' }, { status: 400 })
    const admin = supabaseAdmin()
    const { data, error } = await admin.from('webhook_outgoing').insert({
      account_id: ctx.accountId, created_by: ctx.userId,
      url: body.url, event: body.event, secret: body.secret || null,
      enabled: body.enabled ?? true,
    }).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ webhook: data }, { status: 201 })
  } catch (err) { return toErrorResponse(err) }
}
