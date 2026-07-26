import { NextResponse } from 'next/server'
import { getCurrentAccount, toErrorResponse } from '@/lib/auth/account'
import { supabaseAdmin } from '@/lib/automations/admin-client'
import { dispatchEntityEvent } from '@/lib/webhooks/dispatch'

// GET /api/products - list products
export async function GET(request: Request) {
  try {
    const ctx = await getCurrentAccount()
    const url = new URL(request.url)
    const search = url.searchParams.get('search') || ''
    const integrationId = url.searchParams.get('integration_id')

    let query = supabaseAdmin().from('ecommerce_products').select('*').eq('account_id', ctx.accountId)
    if (search) query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`)
    if (integrationId) query = query.eq('integration_id', integrationId)
    query = query.order('created_at', { ascending: false }).limit(100)

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ products: data || [] })
  } catch (err) { return toErrorResponse(err) }
}

// POST /api/products - create product
export async function POST(request: Request) {
  try {
    const ctx = await getCurrentAccount()
    const body = await request.json()
    const { data, error } = await supabaseAdmin().from('ecommerce_products').insert({
      account_id: ctx.accountId,
      platform_product_id: body.platform_product_id || `manual_${Date.now()}`,
      title: body.title || '',
      description: body.description || '',
      price: body.price || 0,
      currency: body.currency || 'USD',
      image_url: body.image_url || '',
      product_url: body.product_url || '',
      stock: body.stock ?? 0,
      category: body.category || '',
      tags: body.tags || [],
      metadata: body.metadata || {},
    }).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    dispatchEntityEvent(ctx.accountId, 'product', 'created', data).catch(() => {})
    return NextResponse.json(data)
  } catch (err) { return toErrorResponse(err) }
}
