'use client'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CreditCard, Plus, Loader2, ExternalLink } from 'lucide-react'

export default function PaymentsPage() {
  const [items, setItems] = useState<any[]>([]); const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    try { const r = await fetch('/api/payments/gateways'); if (r.ok) setItems((await r.json()).gateways ?? []) } catch {}
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pasarelas de Pago</h1>
          <p className="text-sm text-muted-foreground mt-1">Cobra desde los chats con MercadoPago, Stripe o PayPal</p>
        </div>
        <Button onClick={() => window.location.href = '/settings?tab=payments'}>
          <Plus className="h-4 w-4 mr-1" /> Configurar
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Pasarelas</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold">{loading ? '...' : items.length}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Estados</CardTitle></CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-emerald-400">{loading ? '...' : items.filter((g: any) => g.enabled).length}</p>
            <p className="text-xs text-muted-foreground">activas</p>
          </CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><CreditCard className="h-4 w-4" /> Pasarelas Configuradas</CardTitle>
          <CardDescription>Las pasarelas se usan desde los flujos y el chat para cobrar a los contactos.</CardDescription></CardHeader>
        <CardContent>
          {loading ? <p className="text-center py-4 text-muted-foreground">Cargando...</p> :
            items.length === 0 ? <p className="text-center py-4 text-muted-foreground">Sin pasarelas configuradas. Anda a Settings - Pasarelas de pago para conectar una.</p> :
            items.map((g: any) => (
              <div key={g.id} className="flex items-center justify-between border-b border-border py-3 last:border-0">
                <div className="flex items-center gap-3">
                  <CreditCard className="h-5 w-5 text-primary" />
                  <div><p className="text-sm font-medium">{g.name}</p><p className="text-xs text-muted-foreground">{g.platform}</p></div>
                </div>
                <Badge variant={g.enabled ? 'default' : 'secondary'}>{g.enabled ? 'Activo' : 'Inactivo'}</Badge>
              </div>
            ))}
        </CardContent>
      </Card>
    </div>
  )
}
