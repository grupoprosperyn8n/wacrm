'use client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Sparkles, Activity, CheckCircle2 } from 'lucide-react'

interface Props { metrics: { totalConfigs: number; activeConfigs: number; totalTokensUsed: number } | null; loading: boolean }

export function AiUsageMiniCard({ metrics, loading }: Props) {
  return (
    <Card>
      <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-sm"><Sparkles className="h-4 w-4 text-primary" /> AI Agents</CardTitle></CardHeader>
      <CardContent>
        {loading ? <div className="h-8 animate-pulse bg-muted rounded" /> : (
          <div className="grid grid-cols-3 gap-2 text-center">
            <div><CheckCircle2 className="h-4 w-4 mx-auto text-emerald-400" /><p className="text-lg font-bold mt-1">{metrics?.activeConfigs ?? 0}</p><p className="text-[10px] text-muted-foreground">Activos</p></div>
            <div><Activity className="h-4 w-4 mx-auto text-muted-foreground" /><p className="text-lg font-bold mt-1">{metrics?.totalConfigs ?? 0}</p><p className="text-[10px] text-muted-foreground">Configs</p></div>
            <div><Sparkles className="h-4 w-4 mx-auto text-muted-foreground" /><p className="text-lg font-bold mt-1">{(metrics?.totalTokensUsed ?? 0) >= 1000 ? Math.round((metrics?.totalTokensUsed ?? 0) / 1000) + 'k' : (metrics?.totalTokensUsed ?? 0)}</p><p className="text-[10px] text-muted-foreground">Tokens</p></div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
