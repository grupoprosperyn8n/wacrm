"use client"

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { formatCurrency } from '@/lib/currency'
import {
  CalendarDays,
  CheckSquare,
  MessageSquare,
  RefreshCw,
  UserPlus,
  DollarSign,
  Send,
} from 'lucide-react'

import {
  loadActivity,
  loadChannelMetrics,
  loadConversationsSeries,
  loadMetrics,
  loadPipelineDonut,
  loadResponseTime,
  loadEcommerceMetrics,
  loadPaymentMetrics,
  loadAiUsageMetrics,
  loadTaskBookingMetrics,
  loadSyncMetrics,
  type EcommerceMetrics,
  type PaymentMetrics,
  type AiUsageMetrics,
  type TaskBookingMetrics,
  type SyncMetrics,
} from '@/lib/dashboard/queries'
import type {
  ActivityItem,
  ChannelMetricPoint,
  ConversationsSeriesPoint,
  MetricsBundle,
  PipelineDonutData,
  ResponseTimeSummary,
} from '@/lib/dashboard/types'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MetricCard } from '@/components/dashboard/metric-card'
import { SkeletonCard } from '@/components/dashboard/skeleton'
import { QuickActions } from '@/components/dashboard/quick-actions'
import { AgentStats } from '@/components/dashboard/agent-stats';
import { WidgetStatus } from '@/components/dashboard/widget-status'
import { ConversationsChart } from '@/components/dashboard/conversations-chart'
import { PipelineDonut } from '@/components/dashboard/pipeline-donut'
import { ResponseTimeChart } from '@/components/dashboard/response-time-chart'
import { ActivityFeed } from '@/components/dashboard/activity-feed'
import { ChannelMetricsCards } from '@/components/dashboard/channel-metrics-cards'
import { EcommerceMiniCard } from '@/components/dashboard/ecommerce-mini-card'
import { PaymentsMiniCard } from '@/components/dashboard/payments-mini-card'
import { AiUsageMiniCard } from '@/components/dashboard/ai-usage-mini-card'

import { useTranslations } from 'next-intl'

type RangeDays = 7 | 30 | 90

export default function DashboardPage() {
  const t = useTranslations('Dashboard.page')
  const { defaultCurrency } = useAuth()
  const [metrics, setMetrics] = useState<MetricsBundle | null>(null)
  const [metricsLoading, setMetricsLoading] = useState(true)

  const [range, setRange] = useState<RangeDays>(30)
  // Keep a cache per range so switching tabs doesn't re-fetch what we
  // already have. Ranges the user hasn't opened yet stay null and
  // trigger a fetch on first view.
  const [series, setSeries] = useState<Record<RangeDays, ConversationsSeriesPoint[] | null>>({
    7: null,
    30: null,
    90: null,
  })
  const [seriesLoading, setSeriesLoading] = useState(true)

  const [pipeline, setPipeline] = useState<PipelineDonutData | null>(null)
  const [pipelineLoading, setPipelineLoading] = useState(true)

  const [responseTime, setResponseTime] = useState<ResponseTimeSummary | null>(null)
  const [responseTimeLoading, setResponseTimeLoading] = useState(true)

  const [activity, setActivity] = useState<ActivityItem[] | null>(null)
  const [activityLoading, setActivityLoading] = useState(true)

  const [channelMetrics, setChannelMetrics] = useState<ChannelMetricPoint[] | null>(null)
  const [channelMetricsLoading, setChannelMetricsLoading] = useState(true)

const [ecommerceMetrics, setEcommerceMetrics] = useState<EcommerceMetrics | null>(null)
const [ecommerceMetricsLoading, setEcommerceMetricsLoading] = useState(true)
const [paymentMetrics, setPaymentMetrics] = useState<PaymentMetrics | null>(null)
const [paymentMetricsLoading, setPaymentMetricsLoading] = useState(true)
const [aiUsageMetrics, setAiUsageMetrics] = useState<AiUsageMetrics | null>(null)
const [aiUsageMetricsLoading, setAiUsageMetricsLoading] = useState(true)
const [taskBookingMetrics, setTaskBookingMetrics] = useState<TaskBookingMetrics | null>(null)
const [taskBookingMetricsLoading, setTaskBookingMetricsLoading] = useState(true)
const [syncMetrics, setSyncMetrics] = useState<SyncMetrics | null>(null)
const [syncMetricsLoading, setSyncMetricsLoading] = useState(true)

  const loadAll = useCallback(() => {
    const db = createClient()

    // Kick everything off in parallel. Each block has its own
    // setState + finally so a slow query doesn't hold up faster
    // sections — each widget shows its own skeleton independently.
    void loadMetrics(db)
      .then((m) => setMetrics(m))
      .catch((err) => console.error('[dashboard] metrics failed:', err))
      .finally(() => setMetricsLoading(false))

    void loadConversationsSeries(db, 30)
      .then((s) => setSeries((prev) => ({ ...prev, 30: s })))
      .catch((err) => console.error('[dashboard] series failed:', err))
      .finally(() => setSeriesLoading(false))

    void loadPipelineDonut(db)
      .then((p) => setPipeline(p))
      .catch((err) => console.error('[dashboard] pipeline failed:', err))
      .finally(() => setPipelineLoading(false))

    void loadResponseTime(db)
      .then((r) => setResponseTime(r))
      .catch((err) => console.error('[dashboard] response time failed:', err))
      .finally(() => setResponseTimeLoading(false))

    void loadChannelMetrics(db)
      .then((c) => setChannelMetrics(c))
      .catch((err) => console.error('[dashboard] channel metrics failed:', err))
      .finally(() => setChannelMetricsLoading(false))

    // Fetch up to 50 so the biggest page-size option in the feed
    // (50 rows) is already in memory — switching sizes then becomes
    // a pure client-side slice with no extra round trip.
    void loadActivity(db, 50)
      .then((a) => setActivity(a))
      .catch((err) => console.error('[dashboard] activity failed:', err))
      .finally(() => setActivityLoading(false))

    void loadEcommerceMetrics(db)
      .then((m) => setEcommerceMetrics(m))
      .catch(() => {})
      .finally(() => setEcommerceMetricsLoading(false))

    void loadPaymentMetrics(db)
      .then((m) => setPaymentMetrics(m))
      .catch(() => {})
      .finally(() => setPaymentMetricsLoading(false))

    void loadAiUsageMetrics(db)
      .then((m) => setAiUsageMetrics(m))
      .catch(() => {})
      .finally(() => setAiUsageMetricsLoading(false))

    void loadTaskBookingMetrics(db)
      .then((m) => setTaskBookingMetrics(m))
      .catch(() => {})
      .finally(() => setTaskBookingMetricsLoading(false))

    void loadSyncMetrics(db)
      .then((m) => setSyncMetrics(m))
      .catch(() => {})
      .finally(() => setSyncMetricsLoading(false))
  }, [])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  // Range switch handler — kept in an event callback (not an effect)
  // so the setState calls stay out of the react-hooks/set-state-in-effect
  // rule's way. The cached bucket check means switching back to a
  // previously-viewed range is instant and doesn't re-fetch.
  const handleRangeChange = useCallback(
    (r: RangeDays) => {
      setRange(r)
      if (series[r] !== null) return
      setSeriesLoading(true)
      const db = createClient()
      loadConversationsSeries(db, r)
        .then((s) => setSeries((prev) => ({ ...prev, [r]: s })))
        .catch((err) => console.error('[dashboard] series failed:', err))
        .finally(() => setSeriesLoading(false))
    },
    [series],
  )

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t('title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t('description')}
        </p>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metricsLoading || !metrics ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
        ) : (
          <>
            <MetricCard
              title={t('activeConversations')}
              value={metrics.activeConversations.current.toLocaleString()}
              icon={MessageSquare}
              delta={{
                sign: metrics.activeConversations.previous,
                label: deltaLabel(
                  metrics.activeConversations.previous, 
                  t('newTodayVsYesterday'), 
                  t('noChange', { suffix: t('newTodayVsYesterday') })
                ),
              }}
            />
            <MetricCard
              title={t('newContactsToday')}
              value={metrics.newContactsToday.current.toLocaleString()}
              icon={UserPlus}
              delta={{
                sign:
                  metrics.newContactsToday.current - metrics.newContactsToday.previous,
                label: deltaLabel(
                  metrics.newContactsToday.current - metrics.newContactsToday.previous,
                  t('vsYesterday'),
                  t('noChange', { suffix: t('vsYesterday') })
                ),
              }}
            />
            <MetricCard
              title={t('openDealsValue')}
              value={formatCurrency(metrics.openDealsValue, defaultCurrency)}
              icon={DollarSign}
              subtitle={t('openDeals', { count: metrics.openDealsCount })}
            />
            <MetricCard
              title={t('messagesSentToday')}
              value={metrics.messagesSentToday.current.toLocaleString()}
              icon={Send}
              delta={{
                sign:
                  metrics.messagesSentToday.current - metrics.messagesSentToday.previous,
                label: deltaLabel(
                  metrics.messagesSentToday.current - metrics.messagesSentToday.previous,
                  t('vsYesterday'),
                  t('noChange', { suffix: t('vsYesterday') })
                ),
              }}
            />
          </>
        )}
      </div>

      {/* Channel metrics per channel */}
      <ChannelMetricsCards
        metrics={channelMetrics ?? []}
        loading={channelMetricsLoading}
      />

      {/* Mini cards row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <EcommerceMiniCard metrics={ecommerceMetrics} loading={ecommerceMetricsLoading} />
        <PaymentsMiniCard metrics={paymentMetrics} loading={paymentMetricsLoading} />
        <AiUsageMiniCard metrics={aiUsageMetrics} loading={aiUsageMetricsLoading} />
        <Card><CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-sm"><CheckSquare className="h-4 w-4 text-primary" /> Tareas</CardTitle></CardHeader><CardContent>
          {taskBookingMetricsLoading ? <div className="h-8 animate-pulse bg-muted rounded" /> : <div className="grid grid-cols-2 gap-2 text-center">
            <div><p className="text-lg font-bold">{taskBookingMetrics?.pendingTasks ?? 0}</p><p className="text-[10px] text-muted-foreground">Pendientes</p></div>
            <div><CalendarDays className="h-4 w-4 mx-auto text-muted-foreground" /><p className="text-lg font-bold mt-1">{taskBookingMetrics?.upcomingBookings ?? 0}</p><p className="text-[10px] text-muted-foreground">Turnos</p></div>
          </div>}
        </CardContent></Card>
        <Card><CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-sm"><RefreshCw className="h-4 w-4 text-primary" /> Sync</CardTitle></CardHeader><CardContent>
          {syncMetricsLoading ? <div className="h-8 animate-pulse bg-muted rounded" /> : <div className="text-center">
            <p className="text-lg font-bold">{syncMetrics?.totalConnections ?? 0}</p><p className="text-[10px] text-muted-foreground">conexiones</p>
            {syncMetrics?.lastSyncAt && <p className="text-[10px] text-muted-foreground mt-1">Ultimo sync: {new Date(syncMetrics.lastSyncAt).toLocaleDateString()}</p>}
          </div>}
        </CardContent></Card>
      </div>

      {/* Quick actions */}
      <QuickActions />
      <AgentStats /><WidgetStatus />

      {/* Charts row */}
      {/* items-stretch (the grid default) stretches the two columns to
          match the tallest sibling; adding h-full on each wrapper and
          on the inner panels makes both cards actually fill that
          stretched height so their rounded borders line up. Without
          this, the pipeline card rendered at its natural (shorter)
          height while the line chart drove the row height. */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="h-full lg:col-span-3">
          <ConversationsChart
            series={series}
            loading={seriesLoading}
            range={range}
            onRangeChange={handleRangeChange}
          />
        </div>
        <div className="h-full lg:col-span-2">
          <PipelineDonut
            data={pipeline}
            loading={pipelineLoading}
            currency={defaultCurrency}
          />
        </div>
      </div>

      {/* Response time */}
      <ResponseTimeChart data={responseTime} loading={responseTimeLoading} />

      {/* Activity feed */}
      <ActivityFeed items={activity} loading={activityLoading} />
    </div>
  )
}

// ------------------------------------------------------------

function deltaLabel(delta: number, suffix: string, noChangeLabel: string): string {
  if (delta === 0) return noChangeLabel
  const sign = delta > 0 ? '+' : ''
  return `${sign}${delta.toLocaleString()} ${suffix}`
}
