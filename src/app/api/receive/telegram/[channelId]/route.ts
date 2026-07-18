// ============================================================
// Telegram inbound webhook
//
// GET  — webhook verification (Telegram Bot API)
// POST — receive incoming messages
//
// URL: /api/receive/telegram/[channelId]
// ============================================================

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/automations/admin-client'
import { resolveChannelById } from '@/lib/messaging/resolve-channel'
import {
  parseTelegramUpdate,
  validateTelegramWebhook,
} from '@/lib/messaging/providers/telegram'
import { processInboundText } from '@/lib/messaging/dispatcher'

// ---------------------------------------------------------------------------
// GET — Webhook verification
// Telegram calls this with ?hub.verify_token=<bot_token>&hub.challenge=<n>
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
      'telegram',
    )
    if (!channel) {
      return NextResponse.json({ error: 'Channel not found or inactive' }, { status: 404 })
    }

    const query = Object.fromEntries(request.nextUrl.searchParams.entries())
    const challenge = validateTelegramWebhook(
      { bot_token: channel.config.bot_token as string },
      query,
    )

    if (challenge) {
      return new NextResponse(challenge, { status: 200 })
    }

    return NextResponse.json({ error: 'Invalid verify token' }, { status: 403 })
  } catch (err) {
    console.error('[telegram-webhook] GET error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// ---------------------------------------------------------------------------
// POST — Receive incoming Telegram messages
// ---------------------------------------------------------------------------
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ channelId: string }> },
) {
  try {
    const { channelId } = await params

    // Resolve channel → account_id
    const channel = await resolveChannelById(
      supabaseAdmin(),
      channelId,
      'telegram',
    )
    if (!channel) {
      return NextResponse.json({ error: 'Channel not found or inactive' }, { status: 404 })
    }

    // Parse body
    const body: Record<string, unknown> = await request.json().catch(() => ({}))
    const parsed = parseTelegramUpdate(body)
    if (!parsed) {
      // Non-message update (e.g. callback_query, polling error) — ack 200
      return NextResponse.json({ ok: true })
    }

    // Process through the inbound pipeline
    await processInboundText(
      supabaseAdmin(),
      channel.account_id,
      'telegram',
      parsed.chatId,       // externalUserId — stored in conversations.phone
      parsed.text,
      parsed.externalMessageId,
    )

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[telegram-webhook] POST error:', err)
    // Always return 200 to Telegram to prevent re-delivery retries
    return NextResponse.json({ ok: true })
  }
}
