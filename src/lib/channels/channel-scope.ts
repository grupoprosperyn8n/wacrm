import type { ChannelType } from '@/types'

/** The canonical channel order used by scopes, selectors, and templates. */
export const ALL_CHANNEL_TYPES = [
  'whatsapp',
  'web',
  'telegram',
  'instagram',
  'facebook',
] as const satisfies readonly ChannelType[]

const CHANNEL_TYPE_SET = new Set<ChannelType>(ALL_CHANNEL_TYPES)

export function isChannelType(value: unknown): value is ChannelType {
  return typeof value === 'string' && CHANNEL_TYPE_SET.has(value as ChannelType)
}

/**
 * Normalize persisted or legacy scope values to the canonical allowlist.
 * Missing, null, and empty values intentionally mean all channels.
 */
export function normalizeChannelTypes(value: unknown): ChannelType[] {
  if (!Array.isArray(value) || value.length === 0) {
    return [...ALL_CHANNEL_TYPES]
  }

  const selected = new Set(value.filter(isChannelType))
  if (selected.size === 0) return [...ALL_CHANNEL_TYPES]
  return ALL_CHANNEL_TYPES.filter((channel) => selected.has(channel))
}

export interface ChannelTypesValidation {
  ok: boolean
  channel_types: ChannelType[]
  error?: string
}

/** Validate API input before normalizing and persisting it. */
export function validateChannelTypes(value: unknown): ChannelTypesValidation {
  if (value === undefined || value === null) {
    return { ok: true, channel_types: [...ALL_CHANNEL_TYPES] }
  }
  if (!Array.isArray(value)) {
    return { ok: false, channel_types: [], error: 'channel_types must be an array' }
  }

  const invalid = value.filter((item) => !isChannelType(item))
  if (invalid.length > 0) {
    return {
      ok: false,
      channel_types: [],
      error: `channel_types contains unsupported values: ${invalid.join(', ')}`,
    }
  }

  return { ok: true, channel_types: normalizeChannelTypes(value) }
}

/** Legacy null/empty/missing scopes match every inbound channel. */
export function channelScopeMatches(
  scope: unknown,
  channel: ChannelType | undefined,
): boolean {
  if (!channel) return true
  return normalizeChannelTypes(scope).includes(channel)
}
