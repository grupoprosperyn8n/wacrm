// ============================================================
// Shared channel resolver — used by every inbound webhook route
// to load config & tenancy from the channels table.
// ============================================================

import type { SupabaseClient } from '@supabase/supabase-js'

export interface ResolvedChannel {
  id: string
  account_id: string
  type: string
  config: Record<string, unknown>
  is_active: boolean
}

/**
 * Load a channel row by its UUID. Returns null if not found,
 * inactive, or the type doesn't match (belt-and-suspenders).
 *
 * Every inbound webhook calls this to obtain the owning account_id
 * and the provider-specific credentials needed for outbound replies.
 */
export async function resolveChannelById(
  db: SupabaseClient,
  channelId: string,
  expectedType: string,
): Promise<ResolvedChannel | null> {
  const { data, error } = await db
    .from('channels')
    .select('id, account_id, type, config, is_active')
    .eq('id', channelId)
    .maybeSingle()

  if (error || !data) {
    console.error(`[resolve-channel] channel ${channelId} not found:`, error?.message ?? 'no row')
    return null
  }

  if (!data.is_active) {
    console.warn(`[resolve-channel] channel ${channelId} is inactive`)
    return null
  }

  if (data.type !== expectedType) {
    console.warn(
      `[resolve-channel] channel ${channelId} type mismatch: expected ${expectedType}, got ${data.type}`,
    )
    return null
  }

  return {
    id: data.id,
    account_id: data.account_id,
    type: data.type,
    config: (data.config as Record<string, unknown>) ?? {},
    is_active: data.is_active,
  }
}
