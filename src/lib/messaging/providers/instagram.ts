// ============================================================
// Instagram provider — outbound send + inbound parser
// Uses Instagram Graph API (v21.0, same Graph infrastructure as
// Messenger). Config stored in channels.config as:
// {
//   ig_user_id: string,
//   ig_access_token: string,
//   verify_token?: string
// }
// ============================================================

import type { SupabaseClient } from '@supabase/supabase-js';

export interface InstagramConfig {
  ig_user_id: string;
  ig_access_token: string;
  verify_token?: string;
}

/**
 * Read the active Instagram config for an account.
 */
export async function getInstagramConfig(
  db: SupabaseClient,
  accountId: string,
): Promise<InstagramConfig | null> {
  const { data } = await db
    .from('channels')
    .select('config')
    .eq('account_id', accountId)
    .eq('type', 'instagram')
    .eq('is_active', true)
    .maybeSingle();

  if (!data?.config) return null;
  const c = data.config as Record<string, unknown>;
  if (
    !c.ig_user_id || typeof c.ig_user_id !== 'string' ||
    !c.ig_access_token || typeof c.ig_access_token !== 'string'
  ) return null;
  return {
    ig_user_id: c.ig_user_id,
    ig_access_token: c.ig_access_token,
    verify_token: typeof c.verify_token === 'string' ? c.verify_token : undefined,
  };
}

/** Outbound — send a plain text message via Instagram Graph API. */
export async function sendInstagramText(
  config: InstagramConfig,
  recipientId: string, // IG-scoped ID (PSID for the Instagram user)
  text: string,
): Promise<{ messageId: string; externalMessageId: string }> {
  const body: Record<string, unknown> = {
    recipient: { id: recipientId },
    message: { text },
    messaging_type: 'RESPONSE',
  };

  const res = await fetch(
    `https://graph.facebook.com/v21.0/${config.ig_user_id}/messages?access_token=${config.ig_access_token}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  );
  const json = await res.json();
  if (!res.ok || json.error) {
    throw new Error(
      `Instagram API error: ${json.error?.message ?? JSON.stringify(json)}`,
    );
  }
  const extId = String(json.message_id ?? '');
  return { messageId: `ig-${extId}`, externalMessageId: extId };
}

// ── Webhook parsing ──────────────────────────────────────────────

export interface InstagramIncomingMessage {
  messageId: string | null;
  externalMessageId: string;
  senderId: string;
  text: string;
  timestamp: string;
}

/**
 * Parse an Instagram webhook entry (same structure as Messenger).
 * Returns null for echo messages, unsupported content, or non‑message entries.
 */
export function parseInstagramEntry(
  entry: Record<string, unknown>,
): InstagramIncomingMessage[] {
  const messages: InstagramIncomingMessage[] = [];
  const changes =
    (entry.changes as { field: string; value: Record<string, unknown> }[]) ?? [];
  for (const change of changes) {
    if (change.field !== 'messages') continue;
    const value = change.value ?? {};
    const messaging: Record<string, unknown>[] = (value.messaging as Record<string, unknown>[] | undefined) ?? [];
    for (const event of messaging) {
      const sender = (event.sender as Record<string, unknown>) ?? {};
      const message = (event.message as Record<string, unknown>) ?? {};
      const senderId = String(sender.id ?? '');
      const extId = String(message.mid ?? '');
      const text = String(message.text ?? '');
      const ts = String(event.timestamp ?? Date.now());

      if (message.is_echo) continue;
      if (!senderId || !text) continue;

      messages.push({
        messageId: null,
        externalMessageId: extId,
        senderId,
        text,
        timestamp: new Date(Number(ts)).toISOString(),
      });
    }
  }
  return messages;
}

/**
 * Validate Instagram webhook GET verification (same pattern as Messenger).
 */
export function validateInstagramWebhook(
  config: InstagramConfig,
  query: Record<string, string | string[] | undefined>,
): string | null {
  const mode = query['hub.mode'];
  const token = query['hub.verify_token'];
  const challenge = query['hub.challenge'];
  if (
    typeof mode === 'string' && mode === 'subscribe' &&
    typeof token === 'string' && typeof challenge === 'string' &&
    token === (config.verify_token || config.ig_access_token)
  ) {
    return challenge;
  }
  return null;
}
