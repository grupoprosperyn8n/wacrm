// ============================================================
// Instagram inbound webhook
//
// GET  — webhook verification (Meta Graph API, same as Facebook)
// POST — receive incoming messages
//
// URL: /api/receive/instagram/[channelId]
// ============================================================

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/automations/admin-client'
import { resolveChannelById } from '@/lib/messaging/resolve-channel'
import { parseInstagramEntry } from '@/lib/messaging/providers/instagram'
import { processInboundText } from '@/lib/messaging/dispatcher'

// ---------------------------------------------------------------------------
// GET — Webhook verification
// Meta sends ?hub.mode=subscribe&hub.verify_token=<token>&hub.challenge=<n>
// ---------------------------------------------------------------------------
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ channelId: string }> },
) {
  try {
    const { channelId } = await params
    const channel = await resolveChannelById(
      supabaseAdmin(),
      channelId,
      'instagram',
    )
    if (!channel) {
      return NextResponse.json({ error: 'Channel not found or inactive' }, { status: 404 })
    }

    const query = Object.fromEntries(request.nextUrl.searchParams.entries())

    if (query['hub.mode'] !== 'subscribe' || !query['hub.challenge']) {
      return NextResponse.json({ error: 'Invalid verification request' }, { status: 400 })
    }

    const expectedToken = (channel.config.verify_token as string) ?? ''
    if (!expectedToken || query['hub.verify_token'] !== expectedToken) {
      return NextResponse.json({ error: 'Invalid verify token' }, { status: 403 })
    }

    return new NextResponse(query['hub.challenge'], { status: 200 })
  } catch (err) {
    console.error('[instagram-webhook] GET error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// ---------------------------------------------------------------------------
// POST — Receive incoming Instagram messages
// ---------------------------------------------------------------------------
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ channelId: string }> },
) {
  try {
    const { channelId } = await params

    const channel = await resolveChannelById(
      supabaseAdmin(),
      channelId,
      'instagram',
    )
    if (!channel) {
      return NextResponse.json({ error: 'Channel not found or inactive' }, { status: 404 })
    }

    const body = await request.json().catch(() => ({})) as Record<string, unknown>
    const entries = (body.entry as Record<string, unknown>[]) ?? []

    for (const entry of entries) {
      const messages = parseInstagramEntry(entry)
      for (const msg of messages) {
        await processInboundText(
          supabaseAdmin(),
          channel.account_id,
          'instagram',
          msg.senderId,     // IG-scoped ID — stored in conversations.phone
          msg.text,
          msg.externalMessageId,
        )
      }
    }

    return NextResponse.json({ status: 'ok' })
  } catch (err) {
    console.error('[instagram-webhook] POST error:', err)
    return NextResponse.json({ status: 'ok' })
  }
}
