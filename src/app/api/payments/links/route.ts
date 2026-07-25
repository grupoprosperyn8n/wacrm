import { NextResponse } from 'next/server'
import { getCurrentAccount, requireRole, toErrorResponse } from '@/lib/auth/account'
import { supabaseAdmin } from '@/lib/automations/admin-client'

export async function GET() {
  try { const { supabase, accountId } = await getCurrentAccount()
    const { data } = await supabase.from('payment_links').select('*, gateway:payment_gateways(name, platform)').eq('account_id', accountId).order('created_at', { ascending: false })
    return NextResponse.json({ links: data ?? [] })
  } catch (err) { return toErrorResponse(err) }
}

export async function POST(request: Request) {
  try {
    const ctx = await requireRole('agent')
    const b = await request.json()
    if (!b.title || !b.amount) return NextResponse.json({ error: 'title y amount requeridos' }, { status: 400 })
    const admin = supabaseAdmin()

    // Get gateway config to create payment link
    let linkUrl = ''
    if (b.gateway_id) {
      const { data: gw } = await admin.from('payment_gateways').select('*').eq('id', b.gateway_id).single()
      if (gw?.platform === 'mercadopago' && gw.config?.access_token) {
        const mpRes = await fetch('https://api.mercadopago.com/checkout/preferences', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + gw.config.access_token },
          body: JSON.stringify({
            items: [{ title: b.title, quantity: 1, unit_price: Number(b.amount), currency_id: b.currency || 'ARS' }],
            back_urls: { success: process.env.NEXT_PUBLIC_APP_URL + '/payments/success' },
            notification_url: process.env.NEXT_PUBLIC_APP_URL + '/api/payments/webhook/mercadopago',
            auto_return: 'approved',
          }),
        })
        const mpData = await mpRes.json()
        linkUrl = mpData?.init_point || ''
      }
    }

    const { data, error } = await admin.from('payment_links').insert({
      account_id: ctx.accountId, gateway_id: b.gateway_id || null,
      title: b.title, description: b.description, amount: b.amount, currency: b.currency || 'ARS',
      link_url: linkUrl, contact_id: b.contact_id || null, contact_phone: b.contact_phone || null,
    }).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ link: data }, { status: 201 })
  } catch (err) { return toErrorResponse(err) }
}
