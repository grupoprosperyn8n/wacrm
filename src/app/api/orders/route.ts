import { NextResponse } from 'next/server'
import { getCurrentAccount, toErrorResponse } from '@/lib/auth/account'
import { supabaseAdmin } from '@/lib/automations/admin-client'
import { dispatchEntityEvent } from '@/lib/webhooks/dispatch'

export async function POST(request: Request) {
  try {
    const ctx = await getCurrentAccount()
    const body = await request.json()

    const { data, error } = await supabaseAdmin().from('ecommerce_orders').insert({
      account_id: ctx.accountId,
      platform_order_id: 'chat_' + Date.now(),
      customer_name: body.customer_name || '',
      customer_email: body.customer_email || '',
      customer_phone: body.customer_phone || '',
      total: body.price || 0,
      currency: body.currency || 'USD',
      status: body.status || 'pending',
      items: [{ product_id: body.product_id, title: body.title, price: body.price, quantity: body.quantity || 1 }],
      metadata: { conversation_id: body.conversation_id, source: 'chat' },
    }).select().single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Dispatch event so sync systems know
    dispatchEntityEvent(ctx.accountId, 'product', 'updated', { id: body.product_id, stock_sold: true }).catch(() => {})
    dispatchEntityEvent(ctx.accountId, 'booking', 'created', data).catch(() => {})

    return NextResponse.json(data)
  } catch (err) { return toErrorResponse(err) }
}
