import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/flows/admin-client'

export async function POST(request: Request, { params }: { params: Promise<{ gateway: string }> }) {
  const { gateway } = await params
  const body = await request.json()
  const db = supabaseAdmin()

  if (gateway === 'mercadopago') {
    const paymentId = body?.data?.id
    if (!paymentId) return NextResponse.json({ ok: true })
    // Get payment details
    const mpRes = await fetch(`https://api.mercadolibre.com/mercadopago/v1/payments/${paymentId}`, {
      headers: { 'Authorization': 'Bearer ' + (body.access_token || '') },
    })
    const payment = await mpRes.json()
    const status = payment.status === 'approved' ? 'completed' : 'cancelled'
    const externalId = String(paymentId)

    // Update payment link status
    const { data: links } = await db.from('payment_links').update({ status, external_id: externalId }).eq('external_id', externalId).select()
    
    // Dispatch outgoing webhooks
    if (links?.length) {
      const { dispatchEntityEvent } = await import('@/lib/webhooks/dispatch')
      for (const link of links) {
        dispatchEntityEvent(link.account_id, 'booking', 'updated', { ...link, payment_status: status }).catch(() => {})
      }
    }
  }

  return NextResponse.json({ ok: true })
}
