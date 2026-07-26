'use client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CreditCard, CheckCircle2, XCircle } from 'lucide-react'
import { SkeletonCard } from './skeleton'

interface Props { metrics: { totalGateways: number; activeGateways: number } | null; loading: boolean }

export function PaymentsMiniCard({ metrics, loading }: Props) {
  if (loading) return <SkeletonCard />
  return (
    <Card>
      <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-sm"><CreditCard className="h-4 w-4 text-primary" /> Pasarelas de Pago</CardTitle></CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-400" /><span className="text-lg font-bold">{metrics?.activeGateways ?? 0}</span><span className="text-xs text-muted-foreground">activas</span></div>
          <div className="flex items-center gap-2"><XCircle className="h-4 w-4 text-muted-foreground" /><span className="text-lg font-bold">{(metrics?.totalGateways ?? 0) - (metrics?.activeGateways ?? 0)}</span><span className="text-xs text-muted-foreground">inactivas</span></div>
        </div>
      </CardContent>
    </Card>
  )
}
