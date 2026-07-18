// ============================================================
// Web Chat provider — internal messaging for embedded widgets
// Unlike Telegram/Facebook/Instagram, Web Chat does NOT use an
// external API. Instead:
//   inbound  → API endpoint on wacrm (POST /api/webchat/incoming)
//   outbound → push via Realtime subscription on messages table
//
// Config stored in channels.config as:
// {
//   allowed_origins?: string[]  — CORS allowlist for the widget
// }
// ============================================================

import type { SupabaseClient } from '@supabase/supabase-js';

export interface WebChatConfig {
  allowed_origins?: string[];
}

/**
 * Read the active Web Chat config for an account.
 */
export async function getWebChatConfig(
  db: SupabaseClient,
  accountId: string,
): Promise<WebChatConfig | null> {
  const { data } = await db
    .from('channels')
    .select('config')
    .eq('account_id', accountId)
    .eq('type', 'web')
    .eq('is_active', true)
    .maybeSingle();

  if (!data?.config) return null;
  const c = data.config as Record<string, unknown>;
  const origins = c.allowed_origins;
  return {
    allowed_origins: Array.isArray(origins) ? (origins as string[]) : undefined,
  };
}

/**
 * Create an initial conversation entry for a web chat visitor.
 * Returns the conversation ID so the widget can subscribe to Realtime.
 */
export async function createWebChatConversation(
  db: SupabaseClient,
  accountId: string,
  sessionId: string,
): Promise<{ conversationId: string } | null> {
  const { data, error } = await db
    .from('conversations')
    .insert({
      account_id: accountId,
      channel: 'web',
      phone: sessionId,
      status: 'open',
      last_message_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (error || !data) {
    console.error('Failed to create web chat conversation:', error);
    return null;
  }
  return { conversationId: data.id };
}

/**
 * Find an existing web chat conversation by session ID.
 */
export async function findWebChatConversation(
  db: SupabaseClient,
  accountId: string,
  sessionId: string,
): Promise<{ conversationId: string } | null> {
  const { data } = await db
    .from('conversations')
    .select('id')
    .eq('account_id', accountId)
    .eq('channel', 'web')
    .eq('phone', sessionId)
    .eq('status', 'open')
    .maybeSingle();

  if (!data) return null;
  return { conversationId: data.id };
}
