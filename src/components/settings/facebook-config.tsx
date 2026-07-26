'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Loader2, CheckCircle2, XCircle, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'

type Status = 'connected' | 'disconnected' | 'unknown'

export function FacebookConfig() {
  const t = useTranslations('Settings')
  const supabase = createClient()
  const { accountId } = useAuth()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<Status>('unknown')
  const [channelId, setChannelId] = useState<string | null>(null)
  const [config, setConfig] = useState({
    page_id: '',
    page_access_token: '',
    app_secret: '',
    verify_token: '',
  })

  async function load() {
    if (!accountId) return
    setLoading(true)
    const { data } = await supabase
      .from('channels')
      .select('id, config, is_active')
      .eq('type', 'facebook')
      .eq('account_id', accountId)
      .maybeSingle()
    if (data) {
      const c = data.config as Record<string, string> || {}
      setConfig({
        page_id: c.page_id || '',
        page_access_token: c.page_access_token || '',
        app_secret: c.app_secret || '',
        verify_token: c.verify_token || '',
      })
      setChannelId(data.id)
      setStatus(c.page_id && c.page_access_token ? 'connected' : 'disconnected')
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [accountId])

  async function save() {
    setSaving(true)
    const payload = { type: 'facebook', config, is_active: true }
    const { error } = await supabase.from('channels').upsert({
      account_id: accountId,
      type: 'facebook',
      config,
      is_active: true,
    }).select().single()
    if (error) { toast.error(error.message) } else { toast.success('Configuracion guardada'); setStatus('connected') }
    setSaving(false)
  }

  async function test() {
    if (!config.page_access_token) { toast.error('Falta el Page Access Token'); return }
    try {
      const res = await fetch(`https://graph.facebook.com/v21.0/me?access_token=${config.page_access_token}`)
      const d = await res.json()
      if (d.id) { toast.success('Token valido - Pagina: ' + (d.name || d.id)) } else { toast.error('Token invalido: ' + (d.error?.message || '')) }
    } catch { toast.error('Error al verificar token') }
  }

  const webhookUrl = channelId && typeof window !== 'undefined'
    ? `${window.location.origin}/api/receive/facebook/${channelId}`
    : ''

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          {status === 'connected' ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : status === 'disconnected' ? <XCircle className="h-4 w-4 text-red-400" /> : <Loader2 className="h-4 w-4 animate-spin" />}
          Facebook Messenger
        </CardTitle>
        <CardDescription>Conecta tu pagina de Facebook para recibir y responder mensajes</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Page ID</Label>
          <Input value={config.page_id} onChange={e => setConfig(p => ({ ...p, page_id: e.target.value }))} placeholder="1234567890" />
        </div>
        <div className="space-y-2">
          <Label>Page Access Token</Label>
          <Input type="password" value={config.page_access_token} onChange={e => setConfig(p => ({ ...p, page_access_token: e.target.value }))} placeholder="EAAx..." className="font-mono text-sm" />
        </div>
        <div className="space-y-2">
          <Label>App Secret (para verificar webhooks)</Label>
          <Input type="password" value={config.app_secret} onChange={e => setConfig(p => ({ ...p, app_secret: e.target.value }))} placeholder="App Secret de Facebook Dev" className="font-mono text-sm" />
        </div>
        <div className="space-y-2">
          <Label>Verify Token</Label>
          <Input value={config.verify_token} onChange={e => setConfig(p => ({ ...p, verify_token: e.target.value }))} placeholder="un token secreto que elijas" />
        </div>
        {webhookUrl && (
          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <p className="text-xs font-medium mb-1">Webhook URL (configurar en Facebook Developers):</p>
            <code className="block text-xs break-all bg-background rounded px-2 py-1">{webhookUrl}</code>
          </div>
        )}
        <div className="flex gap-2">
          <Button onClick={save} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Guardar'}</Button>
          <Button variant="outline" onClick={test}><ExternalLink className="h-4 w-4 mr-1" /> Verificar Token</Button>
        </div>
      </CardContent>
    </Card>
  )
}
