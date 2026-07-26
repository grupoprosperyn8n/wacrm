'use client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ShoppingCart, Package, Store, TrendingUp } from 'lucide-react'
import { SkeletonCard } from './skeleton'

interface Props { metrics: { totalProducts: number; totalStock: number; activeIntegrations: number } | null; loading: boolean }

export function EcommerceMiniCard({ metrics, loading }: Props) {
  if (loading) return <div className="grid grid-cols-3 gap-3">{Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}</div>
  return (
    <Card>
      <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-sm"><ShoppingCart className="h-4 w-4 text-primary" /> Ecommerce</CardTitle></CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div><Package className="h-4 w-4 mx-auto text-muted-foreground" /><p className="text-lg font-bold mt-1">{metrics?.totalProducts ?? 0}</p><p className="text-[10px] text-muted-foreground">Productos</p></div>
          <div><TrendingUp className="h-4 w-4 mx-auto text-muted-foreground" /><p className="text-lg font-bold mt-1">{metrics?.totalStock ?? 0}</p><p className="text-[10px] text-muted-foreground">Stock</p></div>
          <div><Store className="h-4 w-4 mx-auto text-muted-foreground" /><p className="text-lg font-bold mt-1">{metrics?.activeIntegrations ?? 0}</p><p className="text-[10px] text-muted-foreground">Tiendas</p></div>
        </div>
      </CardContent>
    </Card>
  )
}
