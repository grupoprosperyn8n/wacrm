'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Plus, Trash2, RefreshCw, ShoppingCart, Loader2, ExternalLink } from 'lucide-react'

interface Integration {
  id: string; platform: string; name: string; config: Record<string, unknown>
  enabled: boolean; last_synced_at: string | null
}

const PLATFORM_INFO: Record<string, { label: string; fields: { key: string; label: string; secret?: boolean }[]; icon: string }> = {
  shopify: {
    label: 'Shopify', icon: '🛒',
    fields: [
      { key: 'shop', label: 'Tienda (ej: mitienda.myshopify.com)' },
      { key: 'access_token', label: 'Access Token (Admin API)', secret: true },
    ]
  },
  mercadolibre: {
    label: 'MercadoLibre', icon: '📦',
    fields: [
      { key: 'access_token', label: 'Access Token', secret: true },
      { key: 'user_id', label: 'User ID' },
    ]
  },
  webhook: {
    label: 'Webhook Genérico', icon: '🔗',
    fields: [
      { key: 'entity_type', label: 'Tipo (product / contact)' },
      { key: 'field_map', label: 'Mapa JSON (ej: {"title":"name"})' },
      { key: 'webhook_secret', label: 'Secret (opcional)', secret: true },
    ]
  },
  woocommerce: {
    label: 'WooCommerce', icon: '🌐',
    fields: [
      { key: 'url', label: 'URL de la tienda (ej: mitienda.com)' },
      { key: 'consumer_key', label: 'Consumer Key', secret: true },
      { key: 'consumer_secret', label: 'Consumer Secret', secret: true },
    ]
  },
}

export function IntegrationsPanel() {
  const { accountId } = useAuth()
  const [integrations, setIntegrations] = useState<Integration[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [newPlatform, setNewPlatform] = useState('shopify')
  const [newName, setNewName] = useState('')
  const [newConfig, setNewConfig] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/integrations')
      if (res.ok) {
        const data = await res.json()
        setIntegrations(data.integrations ?? [])
      } else {
        setIntegrations([])
      }
    } catch {
      setIntegrations([])
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function saveIntegration() {
    if (!newName.trim()) return
    setSaving(true)
    try {
      const res = await fetch('/api/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform: newPlatform, name: newName.trim(), config: newConfig }),
      })
      if (res.ok) {
        toast.success('Integración creada')
        setShowForm(false); setNewName(''); setNewConfig({})
        await load()
      } else {
        const d = await res.json()
        toast.error(d.error || 'Error al crear')
      }
    } catch { toast.error('Error de conexión') }
    setSaving(false)
  }

  async function toggleIntegration(id: string, enabled: boolean) {
    await fetch(`/api/integrations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled }),
    })
    setIntegrations(prev => prev.map(i => i.id === id ? { ...i, enabled } : i))
  }

  async function deleteIntegration(id: string) {
    if (!confirm('¿Eliminar esta integración?')) return
    await fetch(`/api/integrations/${id}`, { method: 'DELETE' })
    setIntegrations(prev => prev.filter(i => i.id !== id))
    toast.success('Integración eliminada')
  }

  async function syncIntegration(id: string) {
    setSyncing(id)
    try {
      const res = await fetch(`/api/integrations/${id}/sync`, { method: 'POST' })
      const d = await res.json()
      if (res.ok) toast.success(`Sincronizado: ${d.products ?? 0} productos`)
      else toast.error(d.error || 'Error')
      await load()
    } catch { toast.error('Error de conexión') }
    setSyncing(null)
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Integraciones Ecommerce</h3>
          <p className="text-xs text-muted-foreground">Conectá Shopify, MercadoLibre o WooCommerce para que la IA conozca tus productos</p>
        </div>
        <Button size="sm" onClick={() => setShowForm(!showForm)} disabled={saving}>
          <Plus className="h-4 w-4 mr-1" /> Agregar
        </Button>
      </div>

      {showForm && (
        <Card className="border-primary/30">
          <CardContent className="pt-4 space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Plataforma</Label>
                <select value={newPlatform} onChange={e => { setNewPlatform(e.target.value); setNewConfig({}) }}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm">
                  {Object.entries(PLATFORM_INFO).map(([k, v]) => (
                    <option key={k} value={k}>{v.icon} {v.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label>Nombre</Label>
                <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Mi tienda" />
              </div>
            </div>
            {PLATFORM_INFO[newPlatform]?.fields.map(field => (
              <div key={field.key} className="space-y-1">
                <Label>{field.label}</Label>
                <Input type={field.secret ? 'password' : 'text'} value={newConfig[field.key] ?? ''}
                  onChange={e => setNewConfig(p => ({ ...p, [field.key]: e.target.value }))} />
              </div>
            ))}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setShowForm(false)}>Cancelar</Button>
              <Button onClick={saveIntegration} disabled={saving || !newName.trim()}>
                {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
                Guardar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="text-center py-8 text-sm text-muted-foreground">Cargando...</div>
      ) : integrations.length === 0 ? (
        <div className="text-center py-8 text-sm text-muted-foreground">Sin integraciones todavía</div>
      ) : (
        <div className="space-y-2">
          {integrations.map(int => {
            const info = PLATFORM_INFO[int.platform]
            return (
              <div key={int.id} className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
                <span className="text-xl">{info?.icon ?? '🔗'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{int.name}</p>
                  <p className="text-xs text-muted-foreground">{info?.label ?? int.platform}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={int.enabled} onCheckedChange={v => toggleIntegration(int.id, v)} />
                  <Button variant="ghost" size="sm" onClick={() => syncIntegration(int.id)} disabled={syncing === int.id}>
                    {syncing === int.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => deleteIntegration(int.id)} className="text-red-400">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
