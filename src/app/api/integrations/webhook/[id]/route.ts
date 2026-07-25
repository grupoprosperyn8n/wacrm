import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/flows/admin-client'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const db = supabaseAdmin()
  const { data: integration } = await db.from('ecommerce_integrations').select('*').eq('id', id).single()
  if (!integration || integration.platform !== 'webhook') return NextResponse.json({ error: 'Not found' }, { status: 404 })

  let body: any
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const cfg = integration.config as Record<string, any>
  const entityType = cfg.entity_type || 'product'
  const fieldMap = cfg.field_map || {}
  const secret = cfg.webhook_secret
  const receivedSecret = request.headers.get('x-webhook-secret')
  if (secret && receivedSecret !== secret) return NextResponse.json({ error: 'Invalid secret' }, { status: 401 })

  const items = Array.isArray(body) ? body : [body]
  let imported = 0

  for (const item of items) {
    const mapped: Record<string, any> = {}
    for (const [ourField, theirField] of Object.entries(fieldMap as Record<string, unknown>))
      mapped[ourField] = String(theirField).split(".").reduce((acc: any, p: string) => acc?.[p], item)

    if (entityType === 'task') {
      await db.from('tasks').insert({
        account_id: integration.account_id,
        title: mapped.title || item.title || 'Tarea externa',
        description: mapped.description || '',
        priority: mapped.priority || 'medium',
        due_date: mapped.due_date || null,
        status: 'pending',
      })
      imported++
    } else if (entityType === 'product') {
      await db.from('ecommerce_products').upsert({
        account_id: integration.account_id, integration_id: id,
        platform_product_id: mapped.platform_product_id || String(item.id || Date.now()),
        title: mapped.title || item.name || '', description: mapped.description || '',
        price: parseFloat(mapped.price ?? item.price ?? 0), currency: mapped.currency || 'USD',
        image_url: mapped.image_url || '', product_url: mapped.product_url || '',
        stock: parseInt(mapped.stock ?? item.stock ?? 0), category: mapped.category || '',
        metadata: item, synced_at: new Date().toISOString(),
      }, { onConflict: 'platform_product_id', ignoreDuplicates: false })
      imported++
    } else if (entityType === 'contact') {
      const contactData = { account_id: integration.account_id, name: mapped.name || item.name || '',
        phone: mapped.phone || item.phone || '', email: mapped.email || item.email || '',
        company: mapped.company || '' }
      const { data: existing } = await db.from('contacts').select('id').eq('account_id', integration.account_id).eq('phone', contactData.phone).maybeSingle()
      if (existing) await db.from('contacts').update(contactData).eq('id', existing.id)
      else await db.from('contacts').insert(contactData)
      imported++
    }
  }

  await db.from('ecommerce_integrations').update({ last_synced_at: new Date().toISOString() }).eq('id', id)
  return NextResponse.json({ ok: true, imported })
}
