import type { SupabaseClient } from '@supabase/supabase-js'

export interface TikTokConfig {
  access_token: string
}

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
  // TikTok doesn't have a public messaging API yet (as of 2025)
  // This is a placeholder for when they release it
  const extId = String(Date.now())
  return { messageId: `tt-${extId}`, externalMessageId: extId }
}
