import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/flows/admin-client'
import { processInboundText } from '@/lib/messaging/dispatcher'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const challenge = searchParams.get('hub.challenge')
  if (challenge) return new NextResponse(challenge, { status: 200 })
  return NextResponse.json({ error: 'Falta el challenge de verificación' }, { status: 400 })
}

export async function POST(request: Request) {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  const msg = body.message as Record<string, unknown> | undefined
  if (!msg || !msg.text || typeof msg.text !== 'string') {
    return NextResponse.json({ ok: true })
  }

  const chat = msg.chat as Record<string, unknown> | undefined
  const chatId = chat?.id?.toString()
  if (!chatId) return NextResponse.json({ error: 'Falta el chat_id de Telegram' }, { status: 400 })

  const text = msg.text as string
  const externalMessageId = msg.message_id?.toString() ?? crypto.randomUUID()
  const externalUserId = chatId

  // For test/Dev Webhooks the account_id is resolved from the channel config.
  // Since Telegram doesn't include account info in the webhook payload,
  // we use x-account-id header (provided by the app when testing).
  // In production, each bot has a unique webhook URL.
  const accountId = request.headers.get('x-account-id')
  if (!accountId) {
    return NextResponse.json({ error: 'Se requiere el header x-account-id con el ID de la cuenta del bot.' }, { status: 400 })
  }

  const db = supabaseAdmin()
  const result = await processInboundText(
    db as any, accountId, 'telegram', externalUserId, text, externalMessageId,
  )

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
