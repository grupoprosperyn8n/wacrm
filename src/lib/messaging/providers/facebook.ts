// ============================================================
// Facebook Messenger provider — outbound send + inbound parser
// Uses Graph API v21.0. Config stored in channels.config as:
// {
//   page_access_token: string,
//   page_id: string,
//   verify_token?: string
// }
// ============================================================

import type { SupabaseClient } from '@supabase/supabase-js';

export interface FacebookConfig {
  page_access_token: string;
  page_id: string;
  verify_token?: string;
}

/**
 * Read the active Facebook Messenger config for an account.
 */
export async function getFacebookConfig(
  db: SupabaseClient,
  accountId: string,
): Promise<FacebookConfig | null> {
  const { data } = await db
    .from('channels')
    .select('config')
    .eq('account_id', accountId)
    .eq('type', 'facebook')
    .eq('is_active', true)
    .maybeSingle();

  if (!data?.config) return null;
  const c = data.config as Record<string, unknown>;
  if (
    !c.page_access_token ||
    typeof c.page_access_token !== 'string' ||
    !c.page_id ||
    typeof c.page_id !== 'string'
  )
    return null;
  return {
    page_access_token: c.page_access_token,
    page_id: c.page_id,
    verify_token: typeof c.verify_token === 'string' ? c.verify_token : undefined,
  };
}

/** Outbound — send a plain text message via Facebook Graph API. */
export async function sendFacebookText(
  config: FacebookConfig,
  recipientId: string, // PSID (page-scoped ID) of the recipient
  text: string,
): Promise<{ messageId: string; externalMessageId: string }> {
  const body: Record<string, unknown> = {
    recipient: { id: recipientId },
    message: { text },
    messaging_type: 'RESPONSE',
  };

  const res = await fetch(
    `https://graph.facebook.com/v21.0/${config.page_id}/messages?access_token=${config.page_access_token}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  );
  const json = await res.json();
  if (!res.ok || json.error) {
    throw new Error(
      `Facebook API error: ${json.error?.message ?? JSON.stringify(json)}`,
    );
  }
  const extId = String(json.message_id ?? '');
  return { messageId: `fb-${extId}`, externalMessageId: extId };
}

// ── Webhook parsing ──────────────────────────────────────────────

export interface FacebookIncomingMessage {
  messageId: string | null;
  externalMessageId: string;
  senderId: string;
  text: string;
  timestamp: string;
}

/**
 * Parse a Facebook Messenger webhook entry into an incoming message.
 * Returns null for echo messages, unsupported content, or non‑message entries.
 */
export function parseFacebookEntry(
  entry: Record<string, unknown>,
): FacebookIncomingMessage[] {
  const messages: FacebookIncomingMessage[] = [];
  const messaging = (entry.messaging as Record<string, unknown>[]) ?? [];
  for (const event of messaging) {
    const sender = (event.sender as Record<string, unknown>) ?? {};
    const message = (event.message as Record<string, unknown>) ?? {};
    const senderId = String(sender.id ?? '');
    const extId = String(message.mid ?? '');
    const text = String(message.text ?? '');
    const ts = String(event.timestamp ?? Date.now());

    // Skip echo (outbound messages reflected back)
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
  return messages;
}

/**
 * Validate Facebook webhook GET verification.
 * Meta sends hub.mode=subscribe, hub.verify_token=…, hub.challenge=…
 */
export function validateFacebookWebhook(
  config: FacebookConfig,
  query: Record<string, string | string[] | undefined>,
): string | null {
  const mode = query['hub.mode'];
  const token = query['hub.verify_token'];
  const challenge = query['hub.challenge'];
  if (
    typeof mode === 'string' &&
    mode === 'subscribe' &&
    typeof token === 'string' &&
    typeof challenge === 'string' &&
    token === (config.verify_token || config.page_access_token)
  ) {
    return challenge;
  }
  return null;
}
