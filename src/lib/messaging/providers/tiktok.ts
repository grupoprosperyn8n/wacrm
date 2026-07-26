// TikTok messaging provider — TikTok Business API (v1.3)
// Uses the TikTok Business API for sending messages to users.
import type { SupabaseClient } from '@supabase/supabase-js'

export interface TikTokConfig {
  access_token: string
}

const TIKTOK_API = 'https://business-api.tiktok.com/open_api/v1.3'

export async function getTikTokConfig(
  db: SupabaseClient,
  accountId: string,
): Promise<TikTokConfig | null> {
  const { data } = await db
    .from('channels')
    .select('config')
    .eq('account_id', accountId)
    .eq('type', 'tiktok')
    .eq('is_active', true)
    .maybeSingle()
  if (!data?.config) return null
  const c = data.config as Record<string, unknown>
  if (!c.access_token || typeof c.access_token !== 'string') return null
  return { access_token: c.access_token }
}

export async function sendTikTokText(
  config: TikTokConfig,
  recipientId: string,
  text: string,
): Promise<{ messageId: string; externalMessageId: string }> {
  const res = await fetch(TIKTOK_API + '/message/send/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Access-Token': config.access_token },
    body: JSON.stringify({ recipient_ids: [recipientId], message_type: 'TEXT', text }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error('TikTok API error: ' + res.status + ' - ' + (err.message || ''))
  }
  const data = await res.json()
  const messageId = data?.data?.message_id || String(Date.now())
  return { messageId: 'tt-' + messageId, externalMessageId: messageId }
}
