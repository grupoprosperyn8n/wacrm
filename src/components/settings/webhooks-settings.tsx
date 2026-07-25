'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, Trash2, Webhook, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

const EVENTS = [
  { value: 'message.received', label: 'Mensaje recibido' },
  { value: 'contact.created', label: 'Contacto creado' },
  { value: 'deal.created', label: 'Negocio creado' },
  { value: 'conversation.assigned', label: 'Conversacion asignada' },
]

export function WebhooksSettings() {
  const [webhooks, setWebhooks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [newUrl, setNewUrl] = useState('')
  const [newEvent, setNewEvent] = useState('message.received')
  const [newSecret, setNewSecret] = useState('')
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const r = await fetch('/api/webhooks-out')
      if (r.ok) setWebhooks((await r.json()).webhooks ?? [])
    } catch {}
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function create() {
    if (!newUrl.trim()) return
    setSaving(true)
    const r = await fetch('/api/webhooks-out', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: newUrl.trim(), event: newEvent, secret: newSecret.trim() || null })
    })
    if (r.ok) { toast.success('Webhook creado'); setShowForm(false); setNewUrl(''); load() }
    else { const d = await r.json(); toast.error(d.error || 'Error') }
    setSaving(false)
  }

  async function remove(id: string) {
    if (!confirm('Eliminar webhook?')) return
    await fetch('/api/webhooks-out/' + id, { method: 'DELETE' })
    setWebhooks(p => p.filter(w => w.id !== id))
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base"><Webhook className="h-4 w-4 text-primary" /> Webhooks Salientes</CardTitle>
        <CardDescription>Dispara eventos del CRM a URLs externas cuando algo sucede.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between items-center">
          <p className="text-xs text-muted-foreground">{webhooks.length} webhooks</p>
          <Button size="sm" onClick={() => setShowForm(!showForm)}><Plus className="h-4 w-4 mr-1" /> Agregar</Button>
        </div>

        {showForm && (
          <div className="rounded-lg border border-primary/30 bg-muted/30 p-3 space-y-3">
            <div className="space-y-1">
              <Label>Evento</Label>
              <select value={newEvent} onChange={e => setNewEvent(e.target.value)}
                className="w-full rounded border border-border bg-background px-3 py-2 text-sm">
                {EVENTS.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
              </select>
            </div>
            <div className="space-y-1"><Label>URL</Label><Input value={newUrl} onChange={e => setNewUrl(e.target.value)} placeholder="https://tusistema.com/webhook" /></div>
            <div className="space-y-1"><Label>Secret</Label><Input type="password" value={newSecret} onChange={e => setNewSecret(e.target.value)} placeholder="opcional" /></div>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setShowForm(false)}>Cancelar</Button>
              <Button onClick={create} disabled={saving || !newUrl.trim()}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Guardar'}
              </Button>
            </div>
          </div>
        )}

        {loading ? (
          <p className="text-sm text-center py-4 text-muted-foreground">Cargando...</p>
        ) : webhooks.length === 0 ? (
          <p className="text-sm text-center py-4 text-muted-foreground">Sin webhooks configurados</p>
        ) : (
          <div className="space-y-2">
            {webhooks.map(w => (
              <div key={w.id} className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{EVENTS.find(e => e.value === w.event)?.label || w.event}</p>
                  <p className="text-xs text-muted-foreground truncate font-mono">{w.url}</p>
                </div>
                <Badge variant={w.enabled ? 'default' : 'secondary'}>{w.enabled ? 'Activo' : 'Inactivo'}</Badge>
                <Button variant="ghost" size="sm" onClick={() => remove(w.id)} className="text-red-400"><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
