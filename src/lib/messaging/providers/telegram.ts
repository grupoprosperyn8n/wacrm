// ============================================================
// Telegram provider — outbound text send + inbound parser
// Uses Bot API sendMessage. Config stored in channels.config
// as { bot_token: string }.
// ============================================================

import type { SupabaseClient } from '@supabase/supabase-js';

export interface TelegramConfig {
  bot_token: string;
}

/**
 * Read the active Telegram config for an account.
 */
export async function getTelegramConfig(
  db: SupabaseClient,
  accountId: string,
): Promise<TelegramConfig | null> {
  const { data } = await db
    .from('channels')
    .select('config')
    .eq('account_id', accountId)
    .eq('type', 'telegram')
    .eq('is_active', true)
    .maybeSingle();

  if (!data?.config) return null;
  const c = data.config as Record<string, unknown>;
  if (!c.bot_token || typeof c.bot_token !== 'string') return null;
  return { bot_token: c.bot_token };
}

/** Outbound — send a plain text message via the Telegram Bot API. */
export async function sendTelegramText(
  config: TelegramConfig,
  chatId: string, // Telegram chat_id (can be negative for groups)
  text: string,
  replyToMessageId?: string,
): Promise<{ messageId: string; externalMessageId: string }> {
  const body: Record<string, unknown> = {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
  };
  if (replyToMessageId) {
    body.reply_to_message_id = Number(replyToMessageId);
  }

  const res = await fetch(
    `https://api.telegram.org/bot${config.bot_token}/sendMessage`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  );
  const json = await res.json();
  if (!res.ok || !json.ok) {
    throw new Error(
      `Telegram API error: ${json.description ?? JSON.stringify(json)}`,
    );
  }
  const extId = String(json.result?.message_id ?? '');
  return { messageId: `tg-${extId}`, externalMessageId: extId };
}

// ── Webhook parsing ──────────────────────────────────────────────

export interface TelegramIncomingMessage {
  /** Unique wacrm message ID (null until persisted). */
  messageId: string | null;
  externalMessageId: string;
  fromId: string;
  chatId: string;
  text: string;
  timestamp: string;
}

/**
 * Parse a Telegram update into an incoming message shape.
 * Returns null for non‑message updates or unsupported types.
 */
export function parseTelegramUpdate(
  update: Record<string, unknown>,
): TelegramIncomingMessage | null {
  // Telegram sends { update_id, message: { ... } } or { update_id, edited_message: { ... } }
  const msg =
    (update.message as Record<string, unknown> | undefined) ??
    (update.edited_message as Record<string, unknown> | undefined);
  if (!msg) return null;

  const messageId = String(msg.message_id ?? '');
  const from = (msg.from as Record<string, unknown>) ?? {};
  const chat = (msg.chat as Record<string, unknown>) ?? {};
  const fromId = String(from.id ?? '');
  const chatId = String(chat.id ?? '');
  const text = String(msg.text ?? '');
  const date = Number(msg.date ?? Date.now() / 1000);

  if (!chatId || !text) return null;

  return {
    messageId: null,
    externalMessageId: messageId,
    fromId,
    chatId,
    text,
    timestamp: new Date(date * 1000).toISOString(),
  };
}

/**
 * Telegram verify token (set in channels.config as `verify_token`).
 * Bot API webhook calls GET with ?hub.verify_token=…&hub.challenge=…
 */
export function validateTelegramWebhook(
  config: TelegramConfig,
  query: Record<string, string | string[] | undefined>,
): string | null {
  // Telegram's webhook verification sends the bot token itself as the
  // verify token by convention. Some deployments set a custom token.
  const token = query['hub.verify_token'];
  const challenge = query['hub.challenge'];
  if (
    typeof token === 'string' &&
    typeof challenge === 'string' &&
    token === config.bot_token
  ) {
    return challenge;
  }
  return null;
}

/** Outbound — send text with inline keyboard buttons via Telegram Bot API. */
export async function sendTelegramButtons(
  config: TelegramConfig,
  chatId: string,
  text: string,
  buttons: { id: string; title: string }[],
): Promise<{ messageId: string; externalMessageId: string }> {
  const body: Record<string, unknown> = {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: buttons.map((b) => [
        { text: b.title, callback_data: b.id },
      ]),
    },
  };

  const res = await fetch(
    `https://api.telegram.org/bot${config.bot_token}/sendMessage`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  );
  const json = await res.json();
  if (!res.ok || !json.ok) {
    throw new Error(
      `Telegram API error: ${json.description ?? JSON.stringify(json)}`,
    );
  }
  const extId = String(json.result?.message_id ?? '');
  return { messageId: `tg-${extId}`, externalMessageId: extId };
}
