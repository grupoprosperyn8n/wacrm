import { NextResponse } from 'next/server'
import { getCurrentAccount, toErrorResponse } from '@/lib/auth/account'
import { supabaseAdmin } from '@/lib/automations/admin-client'
import { dispatchEntityEvent } from '@/lib/webhooks/dispatch'

// PATCH /api/products/[id] - update product
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await getCurrentAccount()
    const { id } = await params
    const body = await request.json()
    const { data, error } = await supabaseAdmin().from('ecommerce_products')
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq('id', id).eq('account_id', ctx.accountId)
      .select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    dispatchEntityEvent(ctx.accountId, 'product', 'updated', data).catch(() => {})
    return NextResponse.json(data)
  } catch (err) { return toErrorResponse(err) }
}

// DELETE /api/products/[id] - delete product
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await getCurrentAccount()
    const { id } = await params
    await supabaseAdmin().from('ecommerce_products').delete().eq('id', id).eq('account_id', ctx.accountId)
    dispatchEntityEvent(ctx.accountId, 'product', 'deleted', { id }).catch(() => {})
    return NextResponse.json({ ok: true })
  } catch (err) { return toErrorResponse(err) }
}
