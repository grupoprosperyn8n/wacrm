import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { processInboundText } from '@/lib/messaging/dispatcher'
import { requireRole, toErrorResponse } from '@/lib/auth/account'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const challenge = searchParams.get('hub.challenge')
  if (challenge) return new NextResponse(challenge, { status: 200 })
  return NextResponse.json({ error: 'Missing challenge' }, { status: 400 })
}

export async function POST(request: Request) {
  try {
    await requireRole('agent')
  } catch (err) {
    return toErrorResponse(err)
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const accountId = request.headers.get('x-account-id')
  if (!accountId) {
    return NextResponse.json({ error: 'x-account-id header required' }, { status: 400 })
  }

  const msg = body.message as Record<string, unknown> | undefined
  if (!msg || !msg.text || typeof msg.text !== 'string') {
    return NextResponse.json({ ok: true })
  }

  const chat = msg.chat as Record<string, unknown> | undefined
  const chatId = chat?.id?.toString()
  if (!chatId) return NextResponse.json({ error: 'Missing chat_id' }, { status: 400 })

  const text = msg.text as string
  const externalMessageId = msg.message_id?.toString() ?? crypto.randomUUID()
  const externalUserId = chatId

  const result = await processInboundText(
    supabase, accountId, 'telegram', externalUserId, text, externalMessageId,
  )

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
