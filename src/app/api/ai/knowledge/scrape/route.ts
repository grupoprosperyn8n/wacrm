import { NextResponse } from 'next/server'
import { getCurrentAccount, requireRole, toErrorResponse } from '@/lib/auth/account'
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from '@/lib/rate-limit'
import { loadEmbeddingsKey } from '@/lib/ai/config'
import { ingestDocument } from '@/lib/ai/knowledge'
import { AiError } from '@/lib/ai/types'
import * as cheerio from 'cheerio'

export async function POST(request: Request) {
  try {
    const { supabase, accountId, userId } = await requireRole('admin')
    const limit = checkRateLimit(`ai-kb:${userId}`, RATE_LIMITS.adminAction)
    if (!limit.success) return rateLimitResponse(limit)

    const body = await request.json().catch(() => null)
    const url = typeof body?.url === 'string' ? body.url.trim() : ''
    if (!url) {
      return NextResponse.json({ error: 'Se requiere una URL' }, { status: 400 })
    }

    // Scrapear URL
    const res = await fetch(url, { headers: { 'User-Agent': 'CRM-Agentico/1.0' } })
    if (!res.ok) {
      return NextResponse.json({ error: `Error al acceder a la URL: ${res.status}` }, { status: 400 })
    }
    const html = await res.text()
    const $ = cheerio.load(html)

    // Remover elementos no deseados
    $('script, style, nav, footer, header, iframe').remove()
    const title = $('title').first().text().trim() || url
    const content = $('body').text().replace(/\s+/g, ' ').trim().slice(0, 50000)

    if (!content || content.length < 50) {
      return NextResponse.json({ error: 'No se pudo extraer contenido de la URL' }, { status: 400 })
    }

    // Guardar documento
    const { data: doc, error } = await supabase
      .from('ai_knowledge_documents')
      .insert({ account_id: accountId, created_by: userId, title, content })
      .select('id')
      .single()
    if (error || !doc) {
      return NextResponse.json({ error: 'Error al guardar el documento' }, { status: 500 })
    }

    // Indexar
    const { key: embeddingsApiKey } = await loadEmbeddingsKey(supabase, accountId)
    try {
      await ingestDocument(supabase, accountId, { embeddingsApiKey }, doc.id, content)
    } catch (err) {
      const msg = err instanceof AiError ? err.message : 'indexing failed'
      return NextResponse.json({ success: true, id: doc.id, warning: `Guardado, pero el índice semántico falló (${msg}).` })
    }
    return NextResponse.json({ success: true, id: doc.id, charsExtracted: content.length })
  } catch (err) {
    return toErrorResponse(err)
  }
}
