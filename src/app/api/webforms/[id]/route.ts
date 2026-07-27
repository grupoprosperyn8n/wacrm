import { NextResponse } from 'next/server'
import { getCurrentAccount, toErrorResponse } from '@/lib/auth/account'
import { supabaseAdmin } from '@/lib/automations/admin-client'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await getCurrentAccount()
    const { id } = await params
    const body = await request.json()
    const { data, error } = await supabaseAdmin().from('webforms').update(body).eq('id', id).eq('account_id', ctx.accountId).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch (err) { return toErrorResponse(err) }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await getCurrentAccount()
    const { id } = await params
    await supabaseAdmin().from('webforms').delete().eq('id', id).eq('account_id', ctx.accountId)
    return NextResponse.json({ ok: true })
  } catch (err) { return toErrorResponse(err) }
}
