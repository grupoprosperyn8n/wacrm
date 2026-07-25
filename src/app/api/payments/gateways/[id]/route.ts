import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/automations/admin-client'
import { requireRole, toErrorResponse } from '@/lib/auth/account'

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireRole('admin')
    const { id } = await params
    await supabaseAdmin().from('payment_gateways').delete().eq('id', id).eq('account_id', ctx.accountId)
    return NextResponse.json({ success: true })
  } catch (err) { return toErrorResponse(err) }
}
