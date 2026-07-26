import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/automations/admin-client'
import { dispatchEntityEvent } from '@/lib/webhooks/dispatch'
import { requireRole, toErrorResponse } from '@/lib/auth/account'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireRole('agent')
    const { id } = await params
    const body = await request.json()
    const { data } = await supabaseAdmin().from('bookings').update(body).eq('id', id).eq('account_id', ctx.accountId).select().single()
    dispatchEntityEvent(ctx.accountId, 'booking', 'updated', data).catch(() => {})
    return NextResponse.json(data)
  } catch (err) { return toErrorResponse(err) }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireRole('agent')
    const { id } = await params
    await supabaseAdmin().from('bookings').delete().eq('id', id).eq('account_id', ctx.accountId)
    return NextResponse.json({ success: true })
  } catch (err) { return toErrorResponse(err) }
}
