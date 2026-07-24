import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/flows/admin-client'
import { processInboundText } from '@/lib/messaging/dispatcher'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const mode = searchParams.get('hub.mode')
  const challenge = searchParams.get('hub.challenge')
  const token = searchParams.get('hub.verify_token')
  if (mode === 'subscribe' && challenge && token) {
    return new NextResponse(challenge, { status: 200 })
  }
  return NextResponse.json({ error: 'Verificación fallida' }, { status: 400 })
}

export async function POST(request: Request) {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  const db = supabaseAdmin()
  const accountId = request.headers.get('x-account-id')
  if (!accountId) return NextResponse.json({ error: 'Se requiere el header x-account-id' }, { status: 400 })

  const entries = body.entry as Array<Record<string, unknown>> | undefined
  if (!entries) return NextResponse.json({ ok: true })

  for (const entry of entries) {
    const messaging = entry.messaging as Array<Record<string, unknown>> | undefined
    if (!messaging) continue
    for (const event of messaging) {
      const message = event.message as Record<string, unknown> | undefined
      if (!message || !message.text || typeof message.text !== 'string') continue
      const sender = event.sender as Record<string, unknown> | undefined
      const psid = sender?.id?.toString()
      if (!psid) continue
      const text = message.text as string
      const externalMessageId = message.mid?.toString() ?? crypto.randomUUID()
      const result = await processInboundText(
        db as any, accountId, 'facebook', psid, text, externalMessageId,
      )
      if (!result.success) {
        console.error(`[facebook-webhook] processInboundText error:`, result.error)
      }
    }
  }
  return NextResponse.json({ ok: true })
}
