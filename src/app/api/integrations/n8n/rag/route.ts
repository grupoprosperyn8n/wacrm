import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/flows/admin-client'

export async function POST(request: Request) {
  const token = request.headers.get('x-n8n-token')
  if (!token) return NextResponse.json({ error: 'Token requerido' }, { status: 401 })

  const db = supabaseAdmin()
  const { data: integrations } = await db.from('ecommerce_integrations')
    .select('account_id').eq('platform', 'webhook').filter('config->>n8n_token', 'eq', token).limit(1)
  if (!integrations?.length) return NextResponse.json({ error: 'Token invalido' }, { status: 401 })

  const body = await request.json()
  const query = (body.query || body.text || '').trim()
  if (!query) return NextResponse.json({ error: 'query requerida' }, { status: 400 })

  // Forward to the RAG API within the same request
  const ragReq = new Request('http://localhost:3000/api/rag/query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, limit: body.limit || 5 }),
  })
  const ragRes = await fetch(ragReq)
  const ragData = await ragRes.json()
  return NextResponse.json(ragData)
}
