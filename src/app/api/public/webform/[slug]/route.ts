import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/automations/admin-client'
import { dispatchEntityEvent } from '@/lib/webhooks/dispatch'

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params; const body = await request.json()
    const db = supabaseAdmin()
    const { data: form } = await db.from('webforms').select('*').eq('slug', slug).eq('enabled', true).single()
    if (!form) return NextResponse.json({ error: 'Formulario no encontrado' }, { status: 404 })
    for (const field of form.fields || []) { if (field.required && !body.data?.[field.key]) return NextResponse.json({ error: 'Campo requerido: ' + (field.label || field.key) }, { status: 400 }) }
    let contactId = null; let dealId = null
    if (form.create_lead) {
      const phone = body.data?.phone || body.data?.telefono || ''; const name = body.data?.name || body.data?.nombre || 'Lead Web'
      const { data: contact } = await db.from('contacts').insert({ account_id: form.account_id, name, phone, source: 'webform' }).select().single()
      if (contact) { contactId = contact.id; dispatchEntityEvent(form.account_id, 'contact', 'created', contact).catch(() => {}) }
      if (form.lead_pipeline_id && contactId) {
        const { data: deal } = await db.from('deals').insert({ account_id: form.account_id, title: name + ' - Webform', contact_id: contactId, pipeline_id: form.lead_pipeline_id, stage_id: form.lead_stage_id, status: 'open' }).select().single()
        if (deal) { dealId = deal.id; dispatchEntityEvent(form.account_id, 'deal', 'created', deal).catch(() => {}) }
      }
    }
    await db.from('webform_submissions').insert({ webform_id: form.id, account_id: form.account_id, data: body.data || {}, contact_id: contactId, deal_id: dealId, page_url: body.page_url || '', ip_address: request.headers.get('x-forwarded-for') || '', user_agent: request.headers.get('user-agent') || '' })
    await db.from('webforms').update({ submission_count: (form.submission_count || 0) + 1 }).eq('id', form.id)
    return NextResponse.json({ ok: true, message: form.config?.success_message || 'Gracias por contactarnos', contactId, dealId })
  } catch (err) { return NextResponse.json({ error: String(err) }, { status: 500 }) }
}
