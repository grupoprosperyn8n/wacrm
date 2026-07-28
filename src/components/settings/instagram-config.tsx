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
import { SetupGuide } from '@/components/ui/setup-guide'
import { toast } from 'sonner'

type Status = 'connected' | 'disconnected' | 'unknown'

export function InstagramConfig() {
  const t = useTranslations('Settings')
  const supabase = createClient()
  const { accountId } = useAuth()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<Status>('unknown')
  const [channelId, setChannelId] = useState<string | null>(null)
  const [config, setConfig] = useState({
    business_account_id: '',
    access_token: '',
  })

  async function load() {
    if (!accountId) return
    setLoading(true)
    const { data } = await supabase
      .from('channels')
      .select('id, config, is_active')
      .eq('type', 'instagram')
      .eq('account_id', accountId)
      .maybeSingle()
    if (data) {
      const c = data.config as Record<string, string> || {}
      setConfig({
        business_account_id: c.business_account_id || '',
        access_token: c.access_token || '',
      })
      setChannelId(data.id)
      setStatus(c.business_account_id && c.access_token ? 'connected' : 'disconnected')
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [accountId])

  async function save() {
    setSaving(true)
    const { error } = await supabase.from('channels').upsert({
      account_id: accountId,
      type: 'instagram',
      config,
      is_active: true,
    }).select().single()
    if (error) { toast.error(error.message) } else { toast.success('Configuracion guardada'); setStatus('connected') }
    setSaving(false)
  }

  async function test() {
    if (!config.access_token) { toast.error('Falta el Access Token'); return }
    try {
      const res = await fetch(`https://graph.facebook.com/v21.0/${config.business_account_id || 'me'}?access_token=${config.access_token}&fields=name,id`)
      const d = await res.json()
      if (d.id) { toast.success('Token valido - Cuenta: ' + (d.name || d.id)) } else { toast.error('Token invalido: ' + (d.error?.message || '')) }
    } catch { toast.error('Error al verificar token') }
  }

  const webhookUrl = channelId && typeof window !== 'undefined'
    ? `${window.location.origin}/api/receive/instagram/${channelId}`
    : ''

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          {status === 'connected' ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : status === 'disconnected' ? <XCircle className="h-4 w-4 text-red-400" /> : <Loader2 className="h-4 w-4 animate-spin" />}
          Instagram
        </CardTitle>
        <CardDescription>Conecta tu cuenta profesional de Instagram para recibir y responder mensajes</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <SetupGuide
          title="Como conectar Instagram"
          steps={[
            { title: "Cuenta profesional de Instagram", description: "Necesitas una cuenta de Instagram configurada como Creator o Business.", url: "https://help.instagram.com/502981923235377" },
            { title: "Vincular con pagina de Facebook", description: "Tu cuenta de Instagram debe estar vinculada a una pagina de Facebook." },
            { title: "Obtener Business Account ID", description: "En Graph API Explorer, conecta tu app y busca el ID de tu cuenta de Instagram Business." },
            { title: "Generar Access Token", description: "Usa Facebook Graph API con permisos instagram_basic, instagram_content_publish, pages_messaging." },
            { title: "Configurar Webhook", description: "Usa la URL de abajo en Facebook Developers > Webhooks > Instagram." },
          ]}
          warning="Necesitas una cuenta Business de Instagram. Las cuentas personales no funcionan."
        />
        <div className="space-y-2">
          <Label>Business Account ID</Label>
          <Input value={config.business_account_id} onChange={e => setConfig(p => ({ ...p, business_account_id: e.target.value }))} placeholder="178414..." />
        </div>
        <div className="space-y-2">
          <Label>Access Token (Facebook Graph API)</Label>
          <Input type="password" value={config.access_token} onChange={e => setConfig(p => ({ ...p, access_token: e.target.value }))} placeholder="EAAx..." className="font-mono text-sm" />
        </div>
        {webhookUrl && (
          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <p className="text-xs font-medium mb-1">Webhook URL (configurar en Meta Developers):</p>
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
