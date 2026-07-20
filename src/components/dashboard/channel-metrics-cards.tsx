import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  MessageSquare,
  MessageCircle,
  Globe,
  Users,
  Camera,
} from 'lucide-react'
import type { ChannelMetricPoint } from '@/lib/dashboard/types'
import { cn } from '@/lib/utils'
import { useTranslations } from 'next-intl'

/* ── Channel icon + colour map ─────────────────────────────────── */

interface ChannelConfig {
  icon: typeof MessageSquare
  dot: string // Tailwind dot colour
}

const CHANNEL_CONFIG: Record<string, ChannelConfig> = {
  whatsapp: { icon: MessageSquare, dot: 'bg-green-500' },
  telegram: { icon: MessageCircle, dot: 'bg-blue-500' },
  facebook: { icon: Users, dot: 'bg-indigo-600' },
  instagram: { icon: Camera, dot: 'bg-pink-500' },
  web: { icon: Globe, dot: 'bg-amber-500' },
}

/* ── Props ──────────────────────────────────────────────────────── */

interface ChannelMetricsCardsProps {
  metrics: ChannelMetricPoint[]
  loading?: boolean
}

/* ── Component ──────────────────────────────────────────────────── */

export function ChannelMetricsCards({
  metrics,
  loading = false,
}: ChannelMetricsCardsProps) {
  const t = useTranslations('Dashboard')

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    )
  }

  return (
    <section>
      <h3 className="mb-4 text-lg font-semibold">{t('channelCards.perChannelOverview')}</h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {metrics.map((m) => (
          <ChannelCard key={m.channel} metric={m} />
        ))}
      </div>
    </section>
  )
}

/* ── Individual channel card ────────────────────────────────────── */

function ChannelCard({ metric }: { metric: ChannelMetricPoint }) {
  const t = useTranslations('Dashboard')
  const config = CHANNEL_CONFIG[metric.channel] ?? {
    icon: MessageSquare,
    dot: 'bg-muted-foreground',
  }
  const Icon = config.icon

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between gap-3 pb-3">
        <div className="flex items-center gap-2">
          <span className={cn('h-2.5 w-2.5 shrink-0 rounded-full', config.dot)} />
          <CardTitle className="text-sm font-medium">
            {metric.channelLabel}
          </CardTitle>
        </div>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="space-y-2 pb-4">
        <StatRow label={t('channelCards.messagesToday')} value={metric.messagesToday} />
        <StatRow label={t('channelCards.newConversations')} value={metric.newConversationsToday} />
        <StatRow label={t('channelCards.openConversations')} value={metric.openConversations} />
        <StatRow label={t('channelCards.totalContacts')} value={metric.totalContacts} subtle />
      </CardContent>
    </Card>
  )
}

/* ── Mini stat row ──────────────────────────────────────────────── */

function StatRow({
  label,
  value,
  subtle = false,
}: {
  label: string
  value: number
  subtle?: boolean
}) {
  return (
    <div className="flex items-center justify-between">
      <span
        className={cn(
          'text-xs',
          subtle ? 'text-muted-foreground' : 'text-muted-foreground',
        )}
      >
        {label}
      </span>
      <span
        className={cn(
          'text-sm font-semibold tabular-nums',
          subtle ? 'text-muted-foreground' : 'text-foreground',
        )}
      >
        {value}
      </span>
    </div>
  )
}

/* ── Skeleton placeholder ───────────────────────────────────────── */

function SkeletonCard() {
  return (
    <Card className="animate-pulse overflow-hidden">
      <CardHeader className="pb-3">
        <div className="h-4 w-24 rounded bg-muted" />
      </CardHeader>
      <CardContent className="space-y-2 pb-4">
        <div className="h-3 w-32 rounded bg-muted" />
        <div className="h-3 w-28 rounded bg-muted" />
        <div className="h-3 w-24 rounded bg-muted" />
      </CardContent>
    </Card>
  )
}
