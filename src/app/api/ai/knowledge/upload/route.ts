import { NextResponse } from 'next/server'
import { requireRole, toErrorResponse } from '@/lib/auth/account'
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from '@/lib/rate-limit'
import { loadEmbeddingsKey } from '@/lib/ai/config'
import { ingestDocument } from '@/lib/ai/knowledge'
import { AiError, type AiConfig } from '@/lib/ai/types'

export async function POST(request: Request) {
  try {
    const ctx = await requireRole('admin')
    const limit = checkRateLimit(`ai-kb:${ctx.userId}`, RATE_LIMITS.adminAction)
    if (!limit.success) return rateLimitResponse(limit)

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    if (!file || !file.name.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json({ error: 'Se requiere un archivo PDF' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const { PDFParse } = await import('pdf-parse')
    const parser = new PDFParse(buffer)

    // Access load method via prototype to bypass TS private check
    const loadFn = (parser as any).constructor.prototype.load.bind(parser)
    await loadFn()

    const result = await parser.getText()
    const text = typeof result === 'string' ? result : (result as any)?.text ?? ''
    const title = (formData.get('title') as string)?.trim() || file.name.replace(/\.pdf$/i, '')

    if (!text || text.length < 20) {
      return NextResponse.json({ error: 'No se pudo extraer texto del PDF' }, { status: 400 })
    }

    const { data: doc, error } = await ctx.supabase
      .from('ai_knowledge_documents')
      .insert({ account_id: ctx.accountId, created_by: ctx.userId, title, content: text })
      .select('id')
      .single()
    if (error || !doc) {
      return NextResponse.json({ error: 'Error al guardar el documento' }, { status: 500 })
    }

    const { key: embeddingsApiKey } = await loadEmbeddingsKey(ctx.supabase, ctx.accountId)
    try {
      await ingestDocument(ctx.supabase, ctx.accountId, { embeddingsApiKey } as Pick<AiConfig, 'embeddingsApiKey'>, doc.id, text)
    } catch (err) {
      const msg = err instanceof AiError ? err.message : 'indexing failed'
      return NextResponse.json({ success: true, id: doc.id, warning: `Guardado, pero el índice semántico falló (${msg}).` })
    }
    return NextResponse.json({ success: true, id: doc.id })
  } catch (err) {
    return toErrorResponse(err)
  }
}
