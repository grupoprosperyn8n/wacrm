'use client'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ShoppingCart, Plus, Loader2, ExternalLink, Package } from 'lucide-react'
import { toast } from 'sonner'

export default function EcommercePage() {
  const [integrations, setIntegrations] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    try {
      const [intRes, prodRes] = await Promise.all([
        fetch('/api/integrations'),
        fetch('/api/products'),
      ])
      if (intRes.ok) setIntegrations((await intRes.json()).integrations ?? [])
      if (prodRes.ok) setProducts((await prodRes.json()).products ?? [])
    } catch {}
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Ecommerce</h1>
          <p className="text-sm text-muted-foreground mt-1">Productos sincronizados y conexiones con tiendas</p>
        </div>
        <Button onClick={() => window.location.href = '/settings?tab=integrations'}>
          <Plus className="h-4 w-4 mr-1" /> Conectar Tienda
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Productos</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold">{loading ? '...' : products.length}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Integraciones</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold">{loading ? '...' : integrations.length}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Stock total</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold">{loading ? '...' : products.reduce((s, p) => s + (p.stock || 0), 0)}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><ShoppingCart className="h-4 w-4" /> Conexiones</CardTitle></CardHeader>
        <CardContent>
          {loading ? <p className="text-center py-4 text-muted-foreground">Cargando...</p> :
            integrations.length === 0 ? <p className="text-center py-4 text-muted-foreground">Sin integraciones. Conecta Shopify, MercadoLibre o WooCommerce desde Settings.</p> :
            integrations.map((i: any) => (
              <div key={i.id} className="flex items-center justify-between border-b border-border py-2 last:border-0">
                <div><p className="text-sm font-medium">{i.platform} - {i.name}</p>
                  <p className="text-xs text-muted-foreground">Ultimo sync: {i.last_synced_at ? new Date(i.last_synced_at).toLocaleString() : 'Nunca'}</p></div>
                <Badge variant={i.enabled ? 'default' : 'secondary'}>{i.enabled ? 'Activo' : 'Inactivo'}</Badge>
              </div>
            ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Package className="h-4 w-4" /> Productos</CardTitle></CardHeader>
        <CardContent>
          {loading ? <p className="text-center py-4 text-muted-foreground">Cargando...</p> :
            products.length === 0 ? <p className="text-center py-4 text-muted-foreground">Sin productos. Sincroniza desde una tienda o crealos manualmente.</p> :
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {products.map((p: any) => (
                <div key={p.id} className="rounded-lg border border-border p-3">
                  {p.image_url && <img src={p.image_url} alt={p.title} className="w-full h-32 object-cover rounded mb-2" />}
                  <p className="text-sm font-medium truncate">{p.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{p.category || ''}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-sm font-semibold">${p.price || 0}</span>
                    <Badge variant={p.stock > 0 ? 'default' : 'destructive'}>{p.stock > 0 ? p.stock + ' en stock' : 'Sin stock'}</Badge>
                  </div>
                </div>
              ))}
            </div>}
        </CardContent>
      </Card>
    </div>
  )
}
