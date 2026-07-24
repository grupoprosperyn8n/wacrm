import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { processInboundText } from '@/lib/messaging/dispatcher'
import { createWebChatConversation } from '@/lib/messaging/providers/webchat'
import { requireRole, toErrorResponse } from '@/lib/auth/account'

/**
 * POST /api/webchat — Receive messages from the Web Chat widget.
 *
 * Body: { account_id, session_id, text }
 * The widget sends the visitor's text. We resolve/create a conversation
 * and process it through the standard inbound pipeline.
 */
export async function POST(request: Request) {
  let body: { account_id?: string; session_id?: string; text?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.account_id || !body.session_id || !body.text) {
    return NextResponse.json({ error: 'account_id, session_id, and text are required' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const externalMessageId = crypto.randomUUID()

  const result = await processInboundText(
    supabase, body.account_id, 'web', body.session_id, body.text, externalMessageId,
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

/**
 * POST /api/webchat/init — Initialize a new Web Chat session.
 *
 * Body: { account_id, session_id }
 * Returns the conversation ID so the widget can subscribe to Realtime.
 */
export async function PUT(request: Request) {
  let body: { account_id?: string; session_id?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.account_id || !body.session_id) {
    return NextResponse.json({ error: 'account_id and session_id are required' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const result = await createWebChatConversation(supabase, body.account_id, body.session_id)
  if (!result) {
    return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 })
  }

  return NextResponse.json({ conversationId: result.conversationId })
}
