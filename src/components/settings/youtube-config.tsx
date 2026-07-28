'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Loader2, CheckCircle2, XCircle, ExternalLink } from 'lucide-react'
import { SetupGuide } from '@/components/ui/setup-guide'
import { toast } from 'sonner'

type Status = 'connected' | 'disconnected' | 'unknown'

export function YouTubeConfig() {
  const supabase = createClient()
  const { accountId } = useAuth()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<Status>('unknown')
  const [config, setConfig] = useState({ api_key: '', channel_id: '' })

  async function load() {
    if (!accountId) return
    setLoading(true)
    const { data } = await supabase
      .from('channels')
      .select('id, config, is_active')
      .eq('type', 'youtube')
      .eq('account_id', accountId)
      .maybeSingle()
    if (data) {
      const c = data.config as Record<string, string> || {}
      setConfig({ api_key: c.api_key || '', channel_id: c.channel_id || '' })
      setStatus(c.api_key && c.channel_id ? 'connected' : 'disconnected')
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [accountId])

  async function save() {
    setSaving(true)
    const { error } = await supabase.from('channels').upsert({
      account_id: accountId, type: 'youtube', config, is_active: true,
    }).select().single()
    if (error) { toast.error(error.message) } else { toast.success('YouTube configurado'); setStatus('connected') }
    setSaving(false)
  }

  async function test() {
    if (!config.api_key || !config.channel_id) { toast.error('Completa API Key y Channel ID'); return }
    try {
      const res = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${config.channel_id}&key=${config.api_key}`)
      const d = await res.json()
      if (d.items?.length) { toast.success('Conectado: ' + d.items[0].snippet.title) } else { toast.error('No se encontro el canal') }
    } catch { toast.error('Error al conectar con YouTube API') }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          {status === 'connected' ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : status === 'disconnected' ? <XCircle className="h-4 w-4 text-red-400" /> : <Loader2 className="h-4 w-4 animate-spin" />}
          YouTube
        </CardTitle>
        <CardDescription>Conecta tu canal de YouTube para leer y responder comentarios</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <SetupGuide
          title="Como conectar YouTube"
          steps={[
            { title: "Ir a Google Cloud Console", description: "Crea un proyecto y habilita la YouTube Data API v3.", url: "https://console.cloud.google.com/apis/library/youtube.googleapis.com" },
            { title: "Crear API Key", description: "En Credenciales, crea una API Key (sin restricciones o con restriccion por IP)." },
            { title: "Obtener Channel ID", description: "Anda a tu canal de YouTube > Configuracion > Configuracion avanzada > ID del canal." },
            { title: "Copiar API Key y Channel ID", description: "Completa los campos abajo y haz clic en Verificar Conexion." },
          ]}
          warning="La YouTube Data API tiene cuotas gratuitas limitadas (10,000 unidades/dia)."
        />
        <div className="space-y-2">
          <Label>API Key (YouTube Data API v3)</Label>
          <Input type="password" value={config.api_key} onChange={e => setConfig(p => ({ ...p, api_key: e.target.value }))}
            placeholder="AIzaSy..." className="font-mono text-sm" />
          <p className="text-xs text-muted-foreground">Creala en <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="underline">Google Cloud Console</a></p>
        </div>
        <div className="space-y-2">
          <Label>YouTube Channel ID</Label>
          <Input value={config.channel_id} onChange={e => setConfig(p => ({ ...p, channel_id: e.target.value }))}
            placeholder="UC..." />
          <p className="text-xs text-muted-foreground">Encontralo en <a href="https://www.youtube.com/account_advanced" target="_blank" rel="noopener noreferrer" className="underline">YouTube Advanced Settings</a></p>
        </div>
        <div className="flex gap-2">
          <Button onClick={save} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Guardar'}</Button>
          <Button variant="outline" onClick={test}><ExternalLink className="h-4 w-4 mr-1" /> Verificar Conexion</Button>
        </div>
      </CardContent>
    </Card>
  )
}
