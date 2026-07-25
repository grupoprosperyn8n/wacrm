'use client'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Plus, Trash2, CreditCard, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

const FIELDS: Record<string, { key: string; label: string; secret?: boolean }[]> = {
  mercadopago: [
    { key: 'access_token', label: 'Access Token (PROD)', secret: true },
    { key: 'public_key', label: 'Public Key' },
  ],
  stripe: [
    { key: 'secret_key', label: 'Secret Key', secret: true },
    { key: 'publishable_key', label: 'Publishable Key' },
  ],
  paypal: [
    { key: 'client_id', label: 'Client ID' },
    { key: 'client_secret', label: 'Client Secret', secret: true },
  ],
  custom: [
    { key: 'api_url', label: 'API URL' },
    { key: 'api_key', label: 'API Key', secret: true },
  ],
}

export function PaymentSettings() {
  const [items, setItems] = useState<any[]>([]); const [loading, setLoading] = useState(true)
  const [show, setShow] = useState(false); const [plat, setPlat] = useState('mercadopago')
  const [name, setName] = useState(''); const [cfg, setCfg] = useState<Record<string, string>>({}); const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    try { const r = await fetch('/api/payments/gateways'); if (r.ok) setItems((await r.json()).gateways ?? []) } catch {}
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function create() {
    setSaving(true)
    const r = await fetch('/api/payments/gateways', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ platform: plat, name: name || plat, config: cfg }) })
    if (r.ok) { toast.success('Pasarela agregada'); setShow(false); load() } else { const d = await r.json(); toast.error(d.error || 'Error') }
    setSaving(false)
  }
  async function remove(id: string) {
    if (!confirm('Eliminar pasarela?')) return
    await fetch('/api/payments/gateways/' + id, { method: 'DELETE' }); load()
  }

  return (
    <Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><CreditCard className="h-4 w-4 text-primary" /> Pasarelas de Pago</CardTitle><CardDescription>Conecta MercadoPago, Stripe o PayPal para cobrar desde los chats.</CardDescription></CardHeader>
    <CardContent className="space-y-4">
      <div className="flex justify-between items-center"><p className="text-xs text-muted-foreground">{items.length} pasarelas</p><Button size="sm" onClick={() => setShow(!show)}><Plus className="h-4 w-4 mr-1" /> Agregar</Button></div>
      {show && (
        <div className="rounded-lg border border-primary/30 bg-muted/30 p-3 space-y-3">
          <select value={plat} onChange={e => { setPlat(e.target.value); setCfg({}) }} className="w-full rounded border border-border bg-background px-3 py-2 text-sm">
            <option value="mercadopago">MercadoPago</option><option value="stripe">Stripe</option><option value="paypal">PayPal</option><option value="custom">API Personalizada</option>
          </select>
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="Nombre" />
          {(FIELDS[plat] || []).map(f => <div key={f.key}><Label>{f.label}</Label><Input type={f.secret ? 'password' : 'text'} value={cfg[f.key] ?? ''} onChange={e => setCfg(p => ({ ...p, [f.key]: e.target.value }))} /></div>)}
          <div className="flex gap-2 justify-end"><Button variant="ghost" onClick={() => setShow(false)}>Cancelar</Button><Button onClick={create} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Guardar'}</Button></div>
        </div>
      )}
      {loading ? <p className="text-sm text-center text-muted-foreground">Cargando...</p> :
        items.length === 0 ? <p className="text-sm text-center text-muted-foreground">Sin pasarelas</p> :
        items.map(g => (
          <div key={g.id} className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
            <CreditCard className="h-5 w-5 text-primary shrink-0" />
            <div className="flex-1"><p className="text-sm font-medium truncate">{g.name}</p><p className="text-xs text-muted-foreground">{g.platform}</p></div>
            <span className={'text-xs px-2 py-0.5 rounded-full ' + (g.enabled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-muted text-muted-foreground')}>{g.enabled ? 'Activo' : 'Inactivo'}</span>
            <Button variant="ghost" size="sm" onClick={() => remove(g.id)} className="text-red-400"><Trash2 className="h-4 w-4" /></Button>
          </div>
        ))}
    </CardContent></Card>
  )
}
