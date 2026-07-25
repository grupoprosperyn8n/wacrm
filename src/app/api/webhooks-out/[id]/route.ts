import { NextResponse } from 'next/server'
import { requireRole, toErrorResponse } from '@/lib/auth/account'
import { supabaseAdmin } from '@/lib/automations/admin-client'

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireRole('admin')
    const { id } = await params
    await supabaseAdmin().from('webhook_outgoing').delete().eq('id', id).eq('account_id', ctx.accountId)
    return NextResponse.json({ success: true })
  } catch (err) { return toErrorResponse(err) }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireRole('admin')
    const { id } = await params
    const body = await request.json()
    const admin = supabaseAdmin()
    const { data } = await admin.from('webhook_outgoing').update(body).eq('id', id).eq('account_id', ctx.accountId).select().single()
    return NextResponse.json({ webhook: data })
  } catch (err) { return toErrorResponse(err) }
}
