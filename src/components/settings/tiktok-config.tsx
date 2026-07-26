'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Loader2, CheckCircle2, XCircle, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'

type Status = 'connected' | 'disconnected' | 'unknown'

export function TikTokConfig() {
  const supabase = createClient()
  const { accountId } = useAuth()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<Status>('unknown')
  const [config, setConfig] = useState({
    access_token: '',
    open_id: '',
  })

  async function load() {
    if (!accountId) return
    setLoading(true)
    const { data } = await supabase
      .from('channels')
      .select('id, config, is_active')
      .eq('type', 'tiktok')
      .eq('account_id', accountId)
      .maybeSingle()
    if (data) {
      const c = data.config as Record<string, string> || {}
      setConfig({ access_token: c.access_token || '', open_id: c.open_id || '' })
      setStatus(c.access_token ? 'connected' : 'disconnected')
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [accountId])

  async function save() {
    setSaving(true)
    const { error } = await supabase.from('channels').upsert({
      account_id: accountId, type: 'tiktok', config, is_active: true,
    }).select().single()
    if (error) { toast.error(error.message) } else { toast.success('TikTok configurado'); setStatus('connected') }
    setSaving(false)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          {status === 'connected' ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : status === 'disconnected' ? <XCircle className="h-4 w-4 text-red-400" /> : <Loader2 className="h-4 w-4 animate-spin" />}
          TikTok
        </CardTitle>
        <CardDescription>Conecta tu cuenta de TikTok para mensajes (API disponible proximamente)</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
          <p className="text-xs text-amber-400 font-medium">Nota: TikTok aun no tiene API publica de mensajeria. Podes dejar configurado el acceso para cuando esté disponible.</p>
        </div>
        <div className="space-y-2">
          <Label>Access Token</Label>
          <Input type="password" value={config.access_token} onChange={e => setConfig(p => ({ ...p, access_token: e.target.value }))}
            placeholder="TikTok Access Token" className="font-mono text-sm" />
        </div>
        <div className="space-y-2">
          <Label>Open ID</Label>
          <Input value={config.open_id} onChange={e => setConfig(p => ({ ...p, open_id: e.target.value }))}
            placeholder="ID del usuario de TikTok" />
        </div>
        <div className="flex gap-2">
          <Button onClick={save} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Guardar'}</Button>
        </div>
      </CardContent>
    </Card>
  )
}
