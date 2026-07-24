import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/flows/admin-client'
import { processInboundText } from '@/lib/messaging/dispatcher'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const challenge = searchParams.get('challenge')
  if (challenge) return new NextResponse(challenge, { status: 200 })
  return NextResponse.json({ error: 'Missing challenge' }, { status: 400 })
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ channelId: string }> },
) {
  const { channelId } = await params
  let body: Record<string, unknown>
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const db = supabaseAdmin()
  const { data: channel } = await db.from('channels').select('account_id').eq('id', channelId).maybeSingle()
  if (!channel) return NextResponse.json({ error: 'Channel not found' }, { status: 404 })

  const msg = (body as any).message
  if (!msg?.text) return NextResponse.json({ ok: true })

  const senderId = String(msg.sender?.id ?? (body as any).sender?.id ?? '')
  if (!senderId) return NextResponse.json({ error: 'Missing sender' }, { status: 400 })

  const result = await processInboundText(
    db as any, channel.account_id, 'tiktok', senderId, String(msg.text), String(msg.id ?? Date.now()),
  )

  if (!result.success) return NextResponse.json({ error: result.error }, { status: 500 })
  return NextResponse.json({ ok: true })
}
