'use client'
import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RefreshCw, Loader2, CheckCircle2, XCircle, ArrowUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'

const ENTITY_TYPES = [
  { key: 'webhook_outgoing', label: 'Webhooks Salientes', desc: 'Disparan eventos a URLs externas' },
  { key: 'ecommerce_integrations', label: 'Integraciones Ecommerce', desc: 'Shopify, MercadoLibre, WooCommerce' },
]

export function ConnectionsStatus() {
  const [stats, setStats] = useState<any>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [whRes, ecRes] = await Promise.all([
          fetch('/api/webhooks-out').then(r => r.ok ? r.json() : { webhooks: [] }),
          fetch('/api/integrations').then(r => r.ok ? r.json() : { integrations: [] }),
        ])
        setStats({
          webhooks: whRes.webhooks ?? [],
          integrations: ecRes.integrations ?? [],
        })
      } catch {}
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base"><ArrowUpDown className="h-4 w-4 text-primary" /> Conexiones Bidireccionales</CardTitle>
          <CardDescription>Estado de las conexiones con sistemas externos. Recibir y enviar datos.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-border p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium">Webhooks Salientes</h4>
                <Badge variant={stats.webhooks?.length > 0 ? 'default' : 'secondary'}>{stats.webhooks?.length || 0} activos</Badge>
              </div>
              <p className="text-xs text-muted-foreground mb-3">Envian datos cuando algo cambia en el CRM</p>
              {stats.webhooks?.length > 0 ? (
                <div className="space-y-1">
                  {stats.webhooks.slice(0, 3).map((w: any) => (
                    <div key={w.id} className="flex items-center gap-2 text-xs">
                      <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0" />
                      <span className="truncate">{w.url}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Configurar en Webhooks Salientes</p>
              )}
            </div>
            <div className="rounded-lg border border-border p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium">Integraciones Ecommerce</h4>
                <Badge variant={stats.integrations?.length > 0 ? 'default' : 'secondary'}>{stats.integrations?.length || 0}</Badge>
              </div>
              <p className="text-xs text-muted-foreground mb-3">Reciben productos, ordenes, contactos</p>
              {stats.integrations?.length > 0 ? (
                <div className="space-y-1">
                  {stats.integrations.slice(0, 3).map((i: any) => (
                    <div key={i.id} className="flex items-center gap-2 text-xs">
                      <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0" />
                      <span>{i.platform} {i.last_synced_at ? '- sincronizado' : ''}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Configurar en Ecommerce</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Tipos de datos sincronizables</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {['Contactos', 'Productos', 'Tareas', 'Turnos', 'Negocios', 'Miembros'].map(t => (
              <div key={t} className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2">
                <ArrowUpDown className="h-3.5 w-3.5 text-primary shrink-0" />
                <span className="text-xs font-medium">{t}</span>
                <Badge variant="outline" className="text-[9px] ml-auto">2 vias</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
