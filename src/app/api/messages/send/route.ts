import { NextResponse } from 'next/server'
import { getCurrentAccount, toErrorResponse } from '@/lib/auth/account'
import { supabaseAdmin } from '@/lib/flows/admin-client'
import { dispatcherSend, dispatcherSendButtons } from '@/lib/messaging/dispatcher'
import type { ChannelType } from '@/types'

export async function POST(request: Request) {
  try {
    const ctx = await getCurrentAccount()
    const body = await request.json()
    const { conversation_id, message_type, content_text, reply_to_message_id, interactive } = body
    if (!conversation_id) return NextResponse.json({ error: 'conversation_id requerido' }, { status: 400 })

    const db = supabaseAdmin()
    const { data: conv, error: convErr } = await db
      .from('conversations').select('id, channel, account_id').eq('id', conversation_id).eq('account_id', ctx.accountId).single()
    if (convErr || !conv) return NextResponse.json({ error: 'Conversacion no encontrada' }, { status: 404 })

    const channel = conv.channel as ChannelType

    if (message_type === 'interactive' && interactive) {
      const result = await dispatcherSendButtons(db, ctx.accountId, channel, conversation_id, content_text, interactive.buttons || [])
      return NextResponse.json(result)
    }

    const result = await dispatcherSend(db, {
      accountId: ctx.accountId, channel, conversationId: conversation_id,
      text: content_text || '', replyToExternalId: reply_to_message_id,
    })
    return NextResponse.json(result)
  } catch (err) { return toErrorResponse(err) }
}
