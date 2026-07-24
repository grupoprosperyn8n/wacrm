// ============================================================
// Multi-channel dispatcher
//
// Central entry point for:
//   1) Outbound sends — route to the correct provider
//   2) Inbound processing — resolve conversation, persist message,
//      trigger automations, contacts, flows, webhooks
//
// The dispatcher does NOT handle the webhook itself. Each channel
// has its own webhook route that calls into here after authentication
// and validation.
// ============================================================

import type { SupabaseClient } from '@supabase/supabase-js';
import { sendMessageToConversation } from '@/lib/whatsapp/send-message';
import { sendTelegramText, getTelegramConfig } from './providers/telegram';
import { sendFacebookText, getFacebookConfig } from './providers/facebook';
import { sendInstagramText, getInstagramConfig } from './providers/instagram';
import { getWebChatConfig } from './providers/webchat';
import { dispatchInboundToFlows } from '@/lib/flows/engine';
import { runAutomationsForTrigger } from '@/lib/automations/engine';
import { dispatchInboundToAiReply } from '@/lib/ai/auto-reply';
import { dispatchWebhookEvent } from '@/lib/webhooks/deliver';
import { findExistingContact, isUniqueViolation } from '@/lib/contacts/dedupe';
import { resolveAuditUserId } from '@/lib/api/v1/contacts';
import type { ParsedInbound } from '@/lib/flows/types';
import type { AutomationTriggerType, ChannelType } from '@/types';

// ── Supported channel types ──────────────────────────────────────

export type { ChannelType } from '@/types';

export interface OutboundSendParams {
  accountId: string;
  channel: ChannelType;
  conversationId: string;
  text: string;
  replyToExternalId?: string; // provider-native message ID for threaded replies
  contactId?: string;
}

export interface SendResult {
  messageId: string;
  externalMessageId: string;
}

// ── Contact outcome ──────────────────────────────────────────────

interface ContactOutcome {
  contact: { id: string; phone: string; name?: string | null };
  wasCreated: boolean;
}

// ── Public API: outbound send ────────────────────────────────────

/**
 * Send a text message through the appropriate channel provider.
 *
 * The caller (typically the dashboard send-handler) provides the
 * account + conversation context. This function resolves the channel
 * config, calls the provider, and updates the message record.
 */
export async function dispatcherSend(
  db: SupabaseClient,
  params: OutboundSendParams,
): Promise<SendResult> {
  const { accountId, channel, text, replyToExternalId } = params;

  switch (channel) {
    case 'whatsapp': {
      // WhatsApp is handled by the existing send-message pipeline.
      const result = await sendMessageToConversation(db, accountId, {
        conversationId: params.conversationId,
        messageType: 'text',
        contentText: text,
        replyToMessageId: replyToExternalId,
      });
      return { messageId: result.messageId, externalMessageId: result.whatsappMessageId };
    }

    case 'telegram': {
      const config = await getTelegramConfig(db, accountId);
      if (!config) throw new Error('No active Telegram channel config found');
      // Look up the conversation's external chat ID from the DB
      const chatId = await getConversationExternalId(db, params.conversationId);
      const result = await sendTelegramText(config, chatId, text, replyToExternalId);
      return result;
    }

    case 'facebook': {
      const config = await getFacebookConfig(db, accountId);
      if (!config) throw new Error('No active Facebook channel config found');
      const psid = await getConversationExternalId(db, params.conversationId);
      const result = await sendFacebookText(config, psid, text);
      return result;
    }

    case 'instagram': {
      const config = await getInstagramConfig(db, accountId);
      if (!config) throw new Error('No active Instagram channel config found');
      const igId = await getConversationExternalId(db, params.conversationId);
      const result = await sendInstagramText(config, igId, text);
      return result;
    }

    case 'web': {
      // Web Chat is purely internal — outgoing messages are pushed via
      // Realtime, not sent to an external API.
      const config = await getWebChatConfig(db, accountId);
      if (config && config.allowed_origins) {
        // CORS validation happened upstream; no external HTTP call needed.
      }
      return { messageId: '', externalMessageId: '' };
    }

    default:
      throw new Error(`Unknown channel type: ${channel}`);
  }
}

// ── Inbound conversation resolution ──────────────────────────────

export interface ConversationRef {
  conversationId: string;
  wasCreated: boolean;
}

/**
 * Resolve or create a conversation for an inbound message.
 *
 * Each channel maps its external user ID to the `phone` column on
 * conversations. If an open conversation exists for that external ID
 * + channel, it is reused; otherwise a new one is created.
 */
export async function resolveInboundConversation(
  db: SupabaseClient,
  accountId: string,
  channel: ChannelType,
  externalUserId: string,
  contactId?: string,
  userId?: string,
): Promise<ConversationRef> {
  // If we have a contactId, match by contact_id + channel
  if (contactId) {
    const { data: existing } = await db
      .from('conversations')
      .select('id')
      .eq('account_id', accountId)
      .eq('channel', channel)
      .eq('contact_id', contactId)
      .eq('status', 'open')
      .maybeSingle();

    if (existing) {
      return { conversationId: existing.id, wasCreated: false };
    }
  } else {
    // Try to find by matching the contact's phone
    const { data: contacts } = await db
      .from('contacts')
      .select('id')
      .eq('account_id', accountId)
      .eq('phone', externalUserId)
      .limit(1);

    if (contacts && contacts.length > 0) {
      const cId = contacts[0].id;
      const { data: existing } = await db
        .from('conversations')
        .select('id')
        .eq('account_id', accountId)
        .eq('channel', channel)
        .eq('contact_id', cId)
        .eq('status', 'open')
        .maybeSingle();

      if (existing) {
        return { conversationId: existing.id, wasCreated: false };
      }
    }
  }

  // Create a new conversation (contact will be linked after creation)
  const { data: created, error } = await db
    .from('conversations')
    .insert({
      account_id: accountId,
      user_id: userId ?? null,
      contact_id: contactId ?? null,
      channel,
      status: 'open',
      last_message_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (error || !created) {
    throw new Error(`Failed to create conversation for ${channel}: ${error?.message ?? 'unknown'}`);
  }

  return { conversationId: created.id, wasCreated: true };
}

// ── Persist inbound message ──────────────────────────────────────

/**
 * Persist an inbound text message, update the parent conversation
 * timestamps, and increment the unread counter.
 */
export async function persistInboundMessage(
  db: SupabaseClient,
  conversationId: string,
  accountId: string,
  channel: ChannelType,
  text: string,
  externalMessageId: string,
  contactId?: string,
): Promise<string> {
  // Insert the message
  const { data, error } = await db
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_type: 'customer',
      content_text: text,
      channel,
      message_id: externalMessageId,
    })
    .select('id')
    .single();

  if (error || !data) {
    throw new Error(`Failed to persist inbound message: ${error?.message ?? 'unknown'}`);
  }

  // Touch the conversation timestamp and increment unread counter
  await db.rpc('increment_unread_count', { conv_id: conversationId });

  await db
    .from('conversations')
    .update({ last_message_at: new Date().toISOString() })
    .eq('id', conversationId);

  return data.id;
}

// ── Contact management ───────────────────────────────────────────

/**
 * Find or create a contact for an external user on a non-WhatsApp
 * channel. Uses the `externalUserId` (chat_id, PSID, visitor ID, etc.)
 * as the contact's `phone` value.
 *
 * Returns the contact record and whether it was newly created.
 */
async function findOrCreateContact(
  db: SupabaseClient,
  accountId: string,
  externalUserId: string,
  botUserId: string,
): Promise<ContactOutcome> {
  // Try to find an existing contact with this external ID
  const existing = await findExistingContact(db, accountId, externalUserId);
  if (existing) {
    return { contact: existing, wasCreated: false };
  }

  // Create a new contact
  const { data: newContact, error: createError } = await db
    .from('contacts')
    .insert({
      account_id: accountId,
      user_id: botUserId,
      phone: externalUserId,
      name: externalUserId,
    })
    .select()
    .single();

  if (createError) {
    if (isUniqueViolation(createError)) {
      // Lost a race — re-resolve
      const raced = await findExistingContact(db, accountId, externalUserId);
      if (raced) return { contact: raced, wasCreated: false };
    }
    throw new Error(`Failed to create contact: ${createError.message}`);
  }

  return { contact: newContact, wasCreated: true };
}

// ── Full inbound pipeline ────────────────────────────────────────

export interface InboundResult {
  success: boolean;
  conversationId?: string;
  messageId?: string;
  contactId?: string;
  error?: string;
}

/**
 * Full inbound pipeline for any channel:
 *   resolve conversation → find/create contact → persist message →
 *   flows → automations → AI reply → webhook events
 *
 * Webhook routes call this after auth/validation is complete.
 */
export async function processInboundText(
  db: SupabaseClient,
  accountId: string,
  channel: ChannelType,
  externalUserId: string,
  text: string,
  externalMessageId: string,
  contactId?: string,
): Promise<InboundResult> {
  try {
    // 0. Find or create contact FIRST (so we have contactId for conversation lookup)
    const botUserId = await resolveAuditUserId(db, accountId);
    const contactOutcome = contactId
      ? { contact: { id: contactId, phone: '', name: '' }, wasCreated: false }
      : await findOrCreateContact(db, accountId, externalUserId, botUserId);

    // 1. Resolve or create conversation (now with contactId)
    const { conversationId, wasCreated: conversationWasCreated } =
      await resolveInboundConversation(db, accountId, channel, externalUserId, contactOutcome.contact.id, botUserId);

    // 3. Determine first message from this customer
    const { count: priorMsgCount } = await db
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('conversation_id', conversationId)
      .eq('sender_type', 'customer');
    const isFirstInboundMessage = (priorMsgCount ?? 0) === 0;

    // 4. Persist the message (sets unread_count++, sender_type)
    const messageId = await persistInboundMessage(
      db,
      conversationId,
      accountId,
      channel,
      text,
      externalMessageId,
      contactOutcome.contact.id,
    );

    // 5. Fire-and-forget: conversation.created webhook event
    if (conversationWasCreated) {
      dispatchWebhookEvent(db, accountId, 'conversation.created', {
        conversationId,
        channel,
        externalUserId,
        contactId: contactOutcome.contact.id,
      }).catch(() => {});
    }

    // 6. Fire-and-forget: flow engine
    const flowPromise = dispatchInboundToFlows({
      accountId,
      userId: botUserId,
      contactId: contactOutcome.contact.id,
      conversationId,
      channel,
      message: { kind: 'text', text, meta_message_id: externalMessageId } satisfies ParsedInbound,
      isFirstInboundMessage,
    }).catch(() => null);

    // 7. Fire automations
    const triggers: AutomationTriggerType[] = ['new_message_received'];
    if (contactOutcome.wasCreated) triggers.unshift('new_contact_created');
    if (isFirstInboundMessage) triggers.unshift('first_inbound_message');

    for (const triggerType of triggers) {
      runAutomationsForTrigger({
        accountId,
        triggerType,
        channel,
        contactId: contactOutcome.contact.id,
      }).catch(() => {});
    }

    // 8. Wait for flow result, then AI reply if flows didn't consume
    const flowResult = await flowPromise;
    if (!flowResult?.consumed) {
      // Fire keyword_match automations when flows didn't handle it
      runAutomationsForTrigger({
        accountId,
        triggerType: 'keyword_match',
        channel,
        contactId: contactOutcome.contact.id,
      }).catch(() => {});

      dispatchInboundToAiReply({
        accountId,
        conversationId,
        contactId: contactOutcome.contact.id,
        configOwnerUserId: botUserId,
      }).catch(() => {});
    }

    // 9. Fire-and-forget: message.received webhook event
    dispatchWebhookEvent(db, accountId, 'message.received', {
      conversationId,
      channel,
      externalMessageId,
      text,
      externalUserId,
      contactId: contactOutcome.contact.id,
    }).catch(() => {});

    return {
      success: true,
      conversationId,
      messageId,
      contactId: contactOutcome.contact.id,
    };
  } catch (err) {
    console.error(`[dispatcher] processInboundText error:`, err);
    return { success: false, error: String(err) };
  }
}

// ── Helpers ──────────────────────────────────────────────────────

/**
 * Read the external user identifier (phone column) from a conversation.
 * For Telegram this is the chat_id, for Facebook the PSID, for
 * Instagram the IG-scoped ID, for WhatsApp the phone number.
 */
async function getConversationExternalId(
  db: SupabaseClient,
  conversationId: string,
): Promise<string> {
  const { data, error } = await db
    .from('conversations')
    .select('phone')
    .eq('id', conversationId)
    .single();

  if (error || !data?.phone) {
    throw new Error(
      `Cannot resolve external ID for conversation ${conversationId}: ${error?.message ?? 'no phone'}`,
    );
  }
  return data.phone;
}

// ── Interactive buttons ───────────────────────────────────────────

export interface InteractiveButton {
  id: string;
  title: string;
}

/**
 * Send interactive buttons through the appropriate channel.
 * WhatsApp uses its native interactive buttons,
 * Telegram uses InlineKeyboardMarkup,
 * Facebook uses quick_replies.
 */
export async function dispatcherSendButtons(
  db: SupabaseClient,
  accountId: string,
  channel: ChannelType,
  conversationId: string,
  text: string,
  buttons: InteractiveButton[],
): Promise<{ messageId: string; externalMessageId: string }> {
  const [config, extId] = await Promise.all([
    getConfigForChannel(db, accountId, channel),
    getConversationExternalId(db, conversationId),
  ]);

  switch (channel) {
    case 'whatsapp': {
      // WhatsApp is handled by engineSendInteractiveButtons in the engine
      throw new Error('WhatsApp buttons should use engineSendInteractiveButtons');
    }
    case 'telegram': {
      const { sendTelegramButtons } = await import('./providers/telegram');
      return sendTelegramButtons(config as any, extId, text, buttons);
    }
    case 'facebook': {
      const { sendFacebookQuickReplies } = await import('./providers/facebook');
      return sendFacebookQuickReplies(config as any, extId, text, buttons);
    }
    default:
      // Instagram / Web Chat: no native button support yet, send as text
      const { dispatcherSend } = await import('./dispatcher');
      const lines = [text, '', ...buttons.map((b, i) => `${i + 1}. ${b.title}`)];
      return dispatcherSend(db, { accountId, channel, conversationId, text: lines.join('\n') });
  }
}

async function getConfigForChannel(
  db: SupabaseClient,
  accountId: string,
  channel: ChannelType,
): Promise<unknown> {
  switch (channel) {
    case 'telegram':
      return getTelegramConfig(db, accountId);
    case 'facebook':
      return getFacebookConfig(db, accountId);
    case 'instagram':
      return getInstagramConfig(db, accountId);
    case 'web':
      return getWebChatConfig(db, accountId);
    default:
      return null;
  }
}
