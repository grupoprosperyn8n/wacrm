import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/flows/admin-client'


export async function POST(request: Request) {
  let body: any
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const topic = body.topic || body.resource?.split('/')?.[0]
  if (topic !== 'questions') return NextResponse.json({ ok: true })

  const questionId = body.resource?.split('/')?.pop()
  if (!questionId) return NextResponse.json({ ok: true })

  const db = supabaseAdmin()

  // Find MercadoLibre integration by scanning for ML integrations
  const { data: integrations } = await db.from('ecommerce_integrations').select('*').eq('platform', 'mercadolibre').eq('enabled', true)
  if (!integrations?.length) return NextResponse.json({ ok: true })

  for (const integration of integrations) {
    const token = (integration.config as any)?.access_token
    if (!token) continue

    // Fetch question details from MercadoLibre API
    const qRes = await fetch(`https://api.mercadolibre.com/questions/${questionId}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    if (!qRes.ok) continue
    const question = await qRes.json()
    if (!question?.text || !question?.from?.id) continue

    // Create a contact for the buyer and process the question as an inbound message
    // Buscar o crear contacto para el comprador
    const { data: existing } = await db.from('contacts').select('id').eq('account_id', integration.account_id).eq('phone', String(question.from.id)).maybeSingle()
    let contactId = existing?.id
    if (!contactId) {
      const { data: newContact } = await db.from('contacts').insert({
        account_id: integration.account_id,
        name: question.from?.name || 'Comprador ML',
        phone: String(question.from.id),
      }).select('id').single()
      contactId = newContact?.id
    }
    // Crear nota en el contacto
    if (contactId) {
      await db.from('contact_notes').insert({
        account_id: integration.account_id,
        contact_id: contactId,
        note_text: '🧾 Pregunta ML: ' + String(question.text || ''),
        user_id: integration.account_id,
      })
    }
  }

  return NextResponse.json({ ok: true })
}
