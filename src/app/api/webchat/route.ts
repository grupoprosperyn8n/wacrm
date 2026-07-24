import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/flows/admin-client'
import { processInboundText } from '@/lib/messaging/dispatcher'

export async function POST(request: Request) {
  let body: { account_id?: string; session_id?: string; text?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  if (!body.account_id || !body.session_id || !body.text) {
    return NextResponse.json({ error: 'se requieren account_id, session_id y text' }, { status: 400 })
  }

  const db = supabaseAdmin()
  const externalMessageId = crypto.randomUUID()

  const result = await processInboundText(
    db as any, body.account_id, 'web', body.session_id, body.text, externalMessageId,
  )

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    conversationId: result.conversationId,
    messageId: result.messageId,
  })
}
