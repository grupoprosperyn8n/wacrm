import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/automations/admin-client'
import { requireRole, toErrorResponse } from '@/lib/auth/account'
import { dispatchEntityEvent } from '@/lib/webhooks/dispatch'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireRole('agent')
    const { id } = await params
    const body = await request.json()
    if (body.status === 'completed') body.completed_at = new Date().toISOString()
    const { data } = await supabaseAdmin().from('tasks').update(body).eq('id', id).eq('account_id', ctx.accountId).select().single()
    dispatchEntityEvent(ctx.accountId, 'task', 'updated', data).catch(()=>{})
    return NextResponse.json({ task: data })
  } catch (err) { return toErrorResponse(err) }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireRole('agent')
    const { id } = await params
    await supabaseAdmin().from('tasks').delete().eq('id', id).eq('account_id', ctx.accountId)
    dispatchEntityEvent(ctx.accountId, 'task', 'deleted', { id }).catch(()=>{})
    return NextResponse.json({ success: true })
  } catch (err) { return toErrorResponse(err) }
}
