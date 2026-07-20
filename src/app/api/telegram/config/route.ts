// ============================================================
// Telegram bot configuration API
//
// GET  — health check (bot info + webhook status)
// POST — validate bot token, save channel, configure webhook
//
// Telegram config is stored in the `channels` table as a
// row with type='telegram' and config = { bot_token, ... }.
// ============================================================

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Resolve the caller's account_id from their auth session. */
async function resolveAccountId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('account_id')
    .eq('user_id', userId)
    .maybeSingle();
  if (error || !data?.account_id) return null;
  return data.account_id as string;
}

/** Call Telegram Bot API getMe to validate a bot token and return bot info. */
async function telegramGetMe(
  botToken: string,
): Promise<{ ok: boolean; bot?: { id: number; username: string; first_name: string }; error?: string }> {
  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/getMe`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    const data = await res.json();
    if (!data.ok) {
      return { ok: false, error: data.description || 'Invalid bot token' };
    }
    return {
      ok: true,
      bot: {
        id: data.result.id,
        username: data.result.username,
        first_name: data.result.first_name,
      },
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Network error' };
  }
}

/** Call Telegram Bot API setWebhook for a given bot token and webhook URL. */
async function telegramSetWebhook(
  botToken: string,
  webhookUrl: string,
): Promise<{ ok: boolean; description?: string }> {
  try {
    const res = await fetch(
      `https://api.telegram.org/bot${botToken}/setWebhook?url=${encodeURIComponent(webhookUrl)}`,
      { method: 'GET' },
    );
    const data = await res.json();
    return { ok: data.ok, description: data.description };
  } catch (err) {
    return { ok: false, description: err instanceof Error ? err.message : 'Network error' };
  }
}

/** Build the webhook URL for a given channel ID based on the request origin. */
function buildWebhookUrl(channelId: string): string {
  // In dev, the origin is localhost. In prod it's the deployed domain.
  // We accept the Host header as the best guess.
  return `${process.env.NEXT_PUBLIC_APP_URL || 'https://crmssag.sistemasagenticos.cloud'}/api/receive/telegram/${channelId}`;
}

// ---------------------------------------------------------------------------
// GET — Health check
// ---------------------------------------------------------------------------
export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const accountId = await resolveAccountId(supabase, user.id);
    if (!accountId) {
      return NextResponse.json({ connected: false, reason: 'no_account', message: 'Profile not linked to an account.' });
    }

    // Find the Telegram channel for this account
    const { data: channel, error: channelError } = await supabase
      .from('channels')
      .select('id, name, config, is_active')
      .eq('type', 'telegram')
      .eq('account_id', accountId)
      .maybeSingle();

    if (channelError) {
      console.error('[telegram/config GET] DB error:', channelError);
      return NextResponse.json({ connected: false, reason: 'db_error', message: 'Failed to fetch configuration' });
    }

    if (!channel) {
      return NextResponse.json({ connected: false, reason: 'no_config', message: 'No Telegram bot configured yet.' });
    }

    const botToken = (channel.config as Record<string, unknown>)?.bot_token as string | undefined;
    if (!botToken) {
      return NextResponse.json({ connected: false, reason: 'no_token', message: 'Bot token is missing in config.' });
    }

    // Validate the token with Telegram
    const botInfo = await telegramGetMe(botToken);
    if (!botInfo.ok) {
      return NextResponse.json({
        connected: false,
        reason: 'telegram_api_error',
        message: botInfo.error,
        channel_id: channel.id,
        is_active: channel.is_active,
      });
    }

    return NextResponse.json({
      connected: true,
      bot: botInfo.bot,
      channel_id: channel.id,
      is_active: channel.is_active,
      name: channel.name,
    });
  } catch (error) {
    console.error('[telegram/config GET] Error:', error);
    return NextResponse.json({ connected: false, reason: 'unknown', message: 'Internal server error' }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// POST — Save / validate bot token
// ---------------------------------------------------------------------------
export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const accountId = await resolveAccountId(supabase, user.id);
    if (!accountId) {
      return NextResponse.json({ error: 'Profile not linked to an account.' }, { status: 403 });
    }

    const body = await request.json();
    const { bot_token, name } = body;

    if (!bot_token || typeof bot_token !== 'string' || !bot_token.trim()) {
      return NextResponse.json({ error: 'bot_token is required' }, { status: 400 });
    }

    const trimmedToken = bot_token.trim();

    // 1. Validate the token with Telegram's getMe
    const botInfo = await telegramGetMe(trimmedToken);
    if (!botInfo.ok) {
      return NextResponse.json({ error: botInfo.error || 'Invalid bot token' }, { status: 400 });
    }

    // 2. Build channel name from bot info or user-provided name
    const channelName = name?.trim() || `@${botInfo.bot?.username || 'Telegram Bot'}`;
    const webhookUrl = buildWebhookUrl(''); // We'll update after we have the channel ID

    // 3. Check if this account already has a Telegram channel
    const { data: existingChannel, error: existingError } = await supabase
      .from('channels')
      .select('id, config')
      .eq('type', 'telegram')
      .eq('account_id', accountId)
      .maybeSingle();

    if (existingError) {
      console.error('[telegram/config POST] Check existing error:', existingError);
      return NextResponse.json({ error: 'Failed to check existing configuration' }, { status: 500 });
    }

    let channelId: string;
    let isNew = false;

    if (existingChannel) {
      // Update existing channel
      channelId = existingChannel.id;
      const { error: updateError } = await supabase
        .from('channels')
        .update({
          name: channelName,
          config: { bot_token: trimmedToken },
          is_active: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', channelId);

      if (updateError) {
        console.error('[telegram/config POST] Update error:', updateError);
        return NextResponse.json({ error: 'Failed to update channel' }, { status: 500 });
      }
    } else {
      // Create new channel
      isNew = true;
      const { data: newChannel, error: insertError } = await supabase
        .from('channels')
        .insert({
          account_id: accountId,
          name: channelName,
          type: 'telegram',
          config: { bot_token: trimmedToken },
          is_active: true,
        })
        .select('id')
        .single();

      if (insertError || !newChannel) {
        console.error('[telegram/config POST] Insert error:', insertError);
        return NextResponse.json({ error: 'Failed to create channel' }, { status: 500 });
      }
      channelId = newChannel.id;
    }

    // 4. Configure the webhook on Telegram's side
    const actualWebhookUrl = buildWebhookUrl(channelId);
    const webhookResult = await telegramSetWebhook(trimmedToken, actualWebhookUrl);

    return NextResponse.json({
      success: true,
      webhook_configured: webhookResult.ok,
      webhook_description: webhookResult.description,
      channel_id: channelId,
      bot: botInfo.bot,
      webhook_url: actualWebhookUrl,
    });
  } catch (error) {
    console.error('[telegram/config POST] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
