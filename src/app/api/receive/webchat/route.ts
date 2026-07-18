// ============================================================
// Web Chat inbound endpoint
//
// POST — receive messages from the web chat widget
// URL: /api/receive/webchat
//
// Unlike Telegram / Facebook / Instagram, Web Chat doesn't use
// a third-party webhook. The widget sends messages directly via
// fetch() to this endpoint. Authentication is through a session
// token embedded in the widget configuration.
//
// The channel is identified by the `channel_id` in the request
// body (sent by the widget initialization).
// ============================================================

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/automations/admin-client'
import { resolveChannelById } from '@/lib/messaging/resolve-channel'
import { processInboundText } from '@/lib/messaging/dispatcher'

// POST — Receive a message from the web chat widget
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({})) as Record<string, unknown>

    const channelId = String(body.channel_id ?? '')
    const text = String(body.text ?? '').trim()
    const visitorId = String(body.visitor_id ?? '')
    const externalMessageId = String(body.external_message_id ?? `wc-${Date.now()}`)

    if (!channelId || !text || !visitorId) {
      return NextResponse.json(
        { error: 'Missing required fields: channel_id, text, visitor_id' },
        { status: 400 },
      )
    }

    // Resolve channel — must be active and of type 'webchat'
    const channel = await resolveChannelById(
      supabaseAdmin(),
      channelId,
      'web',
    )
    if (!channel) {
      return NextResponse.json({ error: 'Channel not found or inactive' }, { status: 404 })
    }

    // Process through the inbound pipeline
    await processInboundText(
      supabaseAdmin(),
      channel.account_id,
      'web',
      visitorId,          // visitor session — stored in conversations.phone
      text,
      externalMessageId,
    )

    return NextResponse.json({ status: 'ok' })
  } catch (err) {
    console.error('[webchat-inbound] POST error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
