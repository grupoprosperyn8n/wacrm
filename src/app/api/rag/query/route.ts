import { NextResponse } from 'next/server'
import { getCurrentAccount, toErrorResponse } from '@/lib/auth/account'
import { supabaseAdmin } from '@/lib/automations/admin-client'

export async function POST(request: Request) {
  try {
    const ctx = await getCurrentAccount()
    const body = await request.json()
    const query = (body.query || body.text || '').toLowerCase().trim()
    const limit = Math.min(body.limit || 5, 20)
    if (!query) return NextResponse.json({ error: 'query requerida' }, { status: 400 })

    const db = supabaseAdmin()
    const results: any[] = []

    // 1. Products
    const { data: products } = await db.from('ecommerce_products')
      .select('*').eq('account_id', ctx.accountId)
      .or('title.ilike.%' + query + '%,description.ilike.%' + query + '%')
      .limit(limit)
    if (products?.length) results.push(...products.map(p => ({ type: 'product', score: 1, data: { id: p.id, title: p.title, price: p.price, stock: p.stock, image_url: p.image_url, product_url: p.product_url, category: p.category } })))

    // 2. Knowledge chunks
    const { data: chunks } = await db.from('ai_knowledge_chunks')
      .select('content, document:ai_knowledge_documents!inner(title, account_id)')
      .eq('document.account_id', ctx.accountId)
      .textSearch('content', query, { type: 'websearch' })
      .limit(limit)
    if (chunks?.length) results.push(...chunks.map((c: any) => ({ type: 'knowledge', score: 0.9, data: { title: c.document?.title, content: c.content } })))

    // 3. Generate AI answer
    let answer = ''
    const { data: aiConfig } = await db.from('ai_config').select('provider, model, api_key').eq('account_id', ctx.accountId).single()
    if (aiConfig?.api_key && results.length > 0) {
      const context = results.slice(0, 5).map((r: any) => {
        if (r.type === 'product') return `Producto: ${r.data.title} - $${r.data.price} - Stock: ${r.data.stock}`
        return `Info: ${r.data.content?.slice(0, 200)}`
      }).join('\n\n')
      const r = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + aiConfig.api_key },
        body: JSON.stringify({
          model: aiConfig.model || 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'Respondé con datos precisos. Incluí precios y stock si están disponibles.' },
            { role: 'user', content: 'Datos:\n' + context + '\n\nPregunta: ' + query },
          ],
          temperature: 0.3,
        }),
      })
      const d = await r.json()
      answer = d.choices?.[0]?.message?.content || ''
    }

    return NextResponse.json({ query, results: results.slice(0, limit), total: results.length, answer, _rag: true })
  } catch (err) { return toErrorResponse(err) }
}
