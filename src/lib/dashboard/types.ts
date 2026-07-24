// Shared result shapes the dashboard components consume. Centralised
// here so each component stays thin and the page-level loader wires
// them up without type gymnastics.

export interface MetricDelta {
  current: number
  previous: number
}

export interface MetricsBundle {
  activeConversations: MetricDelta
  newContactsToday: MetricDelta
  openDealsValue: number
  openDealsCount: number
  messagesSentToday: MetricDelta
}

export interface ConversationsSeriesPoint {
  day: string // YYYY-MM-DD local
  incoming: number
  outgoing: number
}

export interface PipelineStageSlice {
  id: string
  name: string
  color: string
  dealCount: number
  totalValue: number
}

export interface PipelineDonutData {
  stages: PipelineStageSlice[]
  totalValue: number
}

export interface ResponseTimeBucket {
  /** 0 = Mon … 6 = Sun (Monday-first). */
  dow: number
  /** Average first-response time in minutes. Null means no samples. */
  avgMinutes: number | null
  samples: number
}

export interface ResponseTimeSummary {
  buckets: ResponseTimeBucket[]
  thisWeekAvg: number | null
  lastWeekAvg: number | null
}

export type ActivityKind =
  | 'message'
  | 'deal'
  | 'broadcast'
  | 'automation'
  | 'contact'

export interface ActivityItem {
  id: string
  kind: ActivityKind
  /** ISO timestamp the item happened at, drives relative-time + sort. */
  at: string
  /** Optional deep-link for the whole row (not all items have a target). */
  href?: string
  // ── Structured data for i18n rendering (text is built in TSX) ──
  /** Contact / actor name for message, contact, and automation items. */
  actorName?: string
  /** Channel/platform this activity belongs to. */
  channel?: string
  /** Message content_text (short preview). */
  messageContent?: string
  /** Deal title. */
  dealTitle?: string
  /** Pipeline stage name the deal is in. */
  stageName?: string
  /** Broadcast name. */
  broadcastName?: string
  /** Broadcast status: 'sent', 'completed', 'failed', 'draft'. */
  broadcastStatus?: string
  /** Total recipients for a broadcast. */
  totalRecipients?: number
  /** Automation name. */
  automationName?: string
  /** Automation status: 'failed', 'triggered'. */
  automationStatus?: string
}

// ── Channel metrics ─────────────────────────────────────────────────

export interface ChannelMetricPoint {
  /** Channel type string stored in conversations/messages. */
  channel: string
  /** Human-readable label for the UI. */
  channelLabel: string
  /** Messages from this channel today (customer + agent). */
  messagesToday: number
  /** Conversations created today with this channel. */
  newConversationsToday: number
  /** Currently open conversations on this channel. */
  openConversations: number
  /** Total contacts linked to this channel (subset is nice-to-have). */
  totalContacts: number
}
