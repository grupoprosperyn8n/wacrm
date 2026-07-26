'use client'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, Trash2, RefreshCw, Loader2, CheckCircle2, XCircle, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'

const CONNECTOR_INFO: Record<string, { label: string; icon: string; desc: string; fields: { key: string; label: string; secret?: boolean }[] }> = {
  airtable: { label: 'Airtable', icon: '📊', desc: 'Sincroniza con tablas de Airtable', fields: [
    { key: 'api_key', label: 'API Key', secret: true }, { key: 'base_id', label: 'Base ID' }, { key: 'table_name', label: 'Nombre de Tabla' },
  ]},
  googlesheets: { label: 'Google Sheets', icon: '📗', desc: 'Sincroniza con Google Sheets', fields: [
    { key: 'spreadsheet_id', label: 'Spreadsheet ID' }, { key: 'sheet_name', label: 'Nombre de Hoja' }, { key: 'credentials_json', label: 'Access Token o JSON', secret: true },
  ]},
  fastapi: { label: 'FastAPI / REST API', icon: '🔌', desc: 'Conecta con cualquier API REST (FastAPI, Flask, Express)', fields: [
    { key: 'url', label: 'URL Base (https://api.tusistema.com)' }, { key: 'api_key', label: 'API Key', secret: true },
  ]},
  supabase: { label: 'Supabase / Postgres', icon: '🗄️', desc: 'Conecta directamente a una base Postgres o Supabase externa', fields: [
    { key: 'connection_string', label: 'Connection String (postgresql://...)' }, { key: 'table_name', label: 'Nombre de Tabla' },
  ]},
  n8n: { label: 'n8n', icon: '⚡', desc: 'Dispara workflows de n8n cuando algo cambia en el CRM', fields: [
    { key: 'webhook_url', label: 'Webhook URL de n8n' }, { key: 'api_key', label: 'N8N Token', secret: true },
  ]},
  excel: { label: 'Excel', icon: '📑', desc: 'Exporta/importa datos desde archivos Excel', fields: [
    { key: 'file_path', label: 'Ruta del archivo' },
  ]},
  csv: { label: 'CSV', icon: '📄', desc: 'Exporta/importa datos desde archivos CSV', fields: [
    { key: 'file_path', label: 'Ruta del archivo' },
  ]},
}

const ENTITY_OPTIONS = [
  { value: 'contact', label: 'Contactos' },
  { value: 'product', label: 'Productos' },
  { value: 'task', label: 'Tareas' },
  { value: 'booking', label: 'Turnos' },
  { value: 'deal', label: 'Negocios' },
  { value: 'member', label: 'Miembros' },
]

export function SyncPanel() {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [show, setShow] = useState(false)
  const [syncing, setSyncing] = useState<string | null>(null)
  const [type, setType] = useState('airtable')
  const [name, setName] = useState('')
  const [cfg, setCfg] = useState<Record<string, string>>({})
  const [entities, setEntities] = useState<string[]>(['contact', 'product', 'task'])
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    try { const r = await fetch('/api/sync'); if (r.ok) setItems((await r.json()).integrations ?? []) } catch {}
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function create() {
    setSaving(true)
    const r = await fetch('/api/sync', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ connector_type: type, name: name || type, config: cfg, entity_types: entities }),
    })
    if (r.ok) { toast.success('Integracion creada'); setShow(false); load() }
    else { const d = await r.json(); toast.error(d.error || 'Error') }
    setSaving(false)
  }

  async function remove(id: string) {
    if (!confirm('Eliminar integracion?')) return
    await fetch('/api/sync/' + id, { method: 'DELETE' }); load()
  }

  async function doSync(id: string, action: string) {
    setSyncing(id)
    const r = await fetch(`/api/sync/${id}?action=${action}`, { method: 'POST' })
    const d = await r.json()
    if (d.success !== false) { toast.success(`Sincronizado: ${d.recordsSucceeded || 0} registros`) }
    else { toast.error(d.errors?.[0] || 'Error de sincronizacion') }
    setSyncing(null); load()
  }

  async function testConnection(id: string) {
    setSyncing(id)
    const r = await fetch(`/api/sync/${id}?action=test`, { method: 'POST' })
    const d = await r.json()
    toast.success(d.message || (d.success ? 'Conexion OK' : 'Error'))
    setSyncing(null)
  }

  const fields = CONNECTOR_INFO[type]?.fields || []

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base"><RefreshCw className="h-4 w-4 text-primary" /> Sincronizacion</CardTitle>
        <CardDescription>Conecta wacrm con sistemas externos: Airtable, Google Sheets, APIs, Postgres, n8n y mas</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between items-center">
          <p className="text-xs text-muted-foreground">{items.length} conexiones</p>
          <Button size="sm" onClick={() => setShow(!show)}><Plus className="h-4 w-4 mr-1" /> Nueva Conexion</Button>
        </div>

        {show && (
          <div className="rounded-lg border border-primary/30 bg-muted/30 p-3 space-y-3">
            <Label>Tipo de Conexion</Label>
            <select value={type} onChange={e => { setType(e.target.value); setCfg({}) }}
              className="w-full rounded border border-border bg-background px-3 py-2 text-sm">
              {Object.entries(CONNECTOR_INFO).map(([k, v]) => (
                <option key={k} value={k}>{v.icon} {v.label} - {v.desc}</option>
              ))}
            </select>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Nombre (opcional)" />
            {fields.map(f => (
              <div key={f.key}><Label>{f.label}</Label><Input type={f.secret ? 'password' : 'text'}
                value={cfg[f.key] ?? ''} onChange={e => setCfg(p => ({ ...p, [f.key]: e.target.value }))} /></div>
            ))}
            <div><Label>Entidades a sincronizar</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {ENTITY_OPTIONS.map(e => (
                  <label key={e.value} className="flex items-center gap-1 text-xs cursor-pointer">
                    <input type="checkbox" checked={entities.includes(e.value)}
                      onChange={() => setEntities(p => p.includes(e.value) ? p.filter(x => x !== e.value) : [...p, e.value])} />
                    {e.label}
                  </label>
                ))}
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setShow(false)}>Cancelar</Button>
              <Button onClick={create} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Crear'}</Button>
            </div>
          </div>
        )}

        {loading ? <p className="text-sm text-center text-muted-foreground">Cargando...</p> :
          items.length === 0 ? <p className="text-sm text-center text-muted-foreground">Sin conexiones configuradas</p> :
          items.map((i: any) => {
            const info = CONNECTOR_INFO[i.connector_type] || { label: i.connector_type, icon: '🔗', desc: '' }
            return (
              <div key={i.id} className="rounded-lg border border-border bg-card p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{info.icon}</span>
                    <div>
                      <p className="text-sm font-medium">{i.name || info.label}</p>
                      <p className="text-xs text-muted-foreground">{info.desc}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {i.sync_status === 'syncing' ? <Loader2 className="h-4 w-4 animate-spin" /> :
                      i.sync_status === 'error' ? <XCircle className="h-4 w-4 text-red-400" /> :
                      <Badge variant={i.enabled ? 'default' : 'secondary'}>{i.enabled ? 'Activo' : 'Inactivo'}</Badge>}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mb-2">
                  {(i.entity_types || []).map((et: string) => (
                    <Badge key={et} variant="outline" className="text-[10px]">{ENTITY_OPTIONS.find(e => e.value === et)?.label || et}</Badge>
                  ))}
                </div>
                {i.sync_error && <p className="text-xs text-red-400 mb-2">{i.sync_error}</p>}
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => testConnection(i.id)} disabled={syncing === i.id}>
                    {syncing === i.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <ExternalLink className="h-3 w-3" />} Test
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => doSync(i.id, 'push')} disabled={syncing === i.id}>
                    {syncing === i.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />} Push
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => doSync(i.id, 'pull')} disabled={syncing === i.id}>
                    {syncing === i.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />} Pull
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => doSync(i.id, 'sync')} disabled={syncing === i.id}>
                    Sync Bidireccional
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => remove(i.id)} className="text-red-400"><Trash2 className="h-3 w-3" /></Button>
                </div>
              </div>
            )
          })}
      </CardContent>
    </Card>
  )
}
