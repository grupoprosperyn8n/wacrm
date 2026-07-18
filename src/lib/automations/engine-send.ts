import { supabaseAdmin } from '@/lib/automations/admin-client'
import { dispatcherSend } from '@/lib/messaging/dispatcher'
import type { ChannelType } from '@/lib/messaging/dispatcher'

export interface EngineDispatcherSendParams {
  accountId: string
  conversationId: string
  channel: ChannelType
  text: string
}

/**
 * Send a text message through the multi-channel dispatcher from
 * within an automation step.
 *
 * Wraps `dispatcherSend` with the server-side Supabase client so
 * callers in engine.ts don't need to pass `db` directly.
 */
export async function engineDispatcherSend(
  params: EngineDispatcherSendParams,
): Promise<{ messageId: string }> {
  const db = supabaseAdmin()
  const result = await dispatcherSend(db, {
    accountId: params.accountId,
    channel: params.channel,
    conversationId: params.conversationId,
    text: params.text,
  })
  return { messageId: result.messageId }
}
