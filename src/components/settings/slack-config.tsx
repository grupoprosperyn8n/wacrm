'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Loader2, CheckCircle2, XCircle, ExternalLink, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

interface SlackConfigData {
  id: string
  webhook_url: string
  channel_name: string | null
  notify_new_lead: boolean
  notify_new_deal: boolean
  notify_conversation_assigned: boolean
  is_active: boolean
}

export function SlackConfig() {
  const supabase = createClient()
  const { accountId } = useAuth()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [config, setConfig] = useState<SlackConfigData | null>(null)

  const [webhookUrl, setWebhookUrl] = useState('')
  const [channelName, setChannelName] = useState('')
  const [notifyNewLead, setNotifyNewLead] = useState(true)
  const [notifyNewDeal, setNotifyNewDeal] = useState(true)
  const [notifyConvAssigned, setNotifyConvAssigned] = useState(true)
  const [isActive, setIsActive] = useState(true)

  async function loadConfig() {
    if (!accountId) return
    setLoading(true)
    try {
      const res = await fetch('/api/slack/config')
      const data = await res.json()
      if (data.config) {
        setConfig(data.config)
        setWebhookUrl(data.config.webhook_url)
        setChannelName(data.config.channel_name ?? '')
        setNotifyNewLead(data.config.notify_new_lead)
        setNotifyNewDeal(data.config.notify_new_deal)
        setNotifyConvAssigned(data.config.notify_conversation_assigned)
        setIsActive(data.config.is_active)
      }
    } catch {
      toast.error('Error al cargar configuracion')
    }
    setLoading(false)
  }

  useEffect(() => { loadConfig() }, [accountId])

  async function save() {
    if (!webhookUrl) { toast.error('Ingresa la URL del Webhook'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/slack/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          webhook_url: webhookUrl,
          channel_name: channelName || null,
          notify_new_lead: notifyNewLead,
          notify_new_deal: notifyNewDeal,
          notify_conversation_assigned: notifyConvAssigned,
          is_active: isActive,
        }),
      })
      const data = await res.json()
      if (data.config) {
        toast.success('Configuracion Slack guardada')
        setConfig(data.config)
      } else {
        toast.error(data.error || 'Error al guardar')
      }
    } catch {
      toast.error('Error al guardar configuracion')
    }
    setSaving(false)
  }

  async function testWebhook() {
    if (!webhookUrl) { toast.error('Guarda la configuracion primero'); return }
    try {
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: ':white_check_mark: Prueba exitosa desde wacrm',
          blocks: [
            {
              type: 'section',
              text: { type: 'mrkdwn', text: ':white_check_mark: *Prueba de integracion exitosa*' },
            },
            {
              type: 'context',
              elements: [{ type: 'mrkdwn', text: 'wacrm esta configurado correctamente para enviar notificaciones a este canal.' }],
            },
          ],
        }),
      })
      if (res.ok) {
        toast.success('Mensaje de prueba enviado a Slack')
      } else {
        toast.error('Error al enviar prueba: ' + res.status)
      }
    } catch {
      toast.error('Error de conexion con Slack')
    }
  }

  async function removeConfig() {
    try {
      const res = await fetch('/api/slack/config', { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        toast.success('Integracion Slack eliminada')
        setConfig(null)
        setWebhookUrl('')
        setChannelName('')
      } else {
        toast.error(data.error || 'Error al eliminar')
      }
    } catch {
      toast.error('Error al eliminar configuracion')
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          {config?.is_active
            ? <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            : <XCircle className="h-4 w-4 text-muted-foreground" />}
          Slack
        </CardTitle>
        <CardDescription>
          Conecta wacrm con Slack para recibir notificaciones de leads, deals y asignaciones
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <Label>Webhook URL (Incoming Webhook)</Label>
              <Input
                type="password"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://hooks.slack.com/services/T00/B00/xxx..."
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Crea un webhook en{' '}
                <a href="https://api.slack.com/messaging/webhooks" target="_blank" rel="noopener noreferrer" className="underline">
                  Slack API - Incoming Webhooks
                </a>
              </p>
            </div>

            <div className="space-y-2">
              <Label>Nombre del canal (opcional)</Label>
              <Input
                value={channelName}
                onChange={(e) => setChannelName(e.target.value)}
                placeholder="#general"
              />
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium">Notificaciones</Label>
              <div className="flex items-center justify-between">
                <Label htmlFor="new-lead" className="text-sm cursor-pointer">Nuevo lead / formulario web</Label>
                <Switch id="new-lead" checked={notifyNewLead} onCheckedChange={setNotifyNewLead} />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="new-deal" className="text-sm cursor-pointer">Nuevo deal creado</Label>
                <Switch id="new-deal" checked={notifyNewDeal} onCheckedChange={setNotifyNewDeal} />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="conv-assigned" className="text-sm cursor-pointer">Conversacion asignada</Label>
                <Switch id="conv-assigned" checked={notifyConvAssigned} onCheckedChange={setNotifyConvAssigned} />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="active" className="text-sm cursor-pointer">Activar integracion</Label>
              <Switch id="active" checked={isActive} onCheckedChange={setIsActive} />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button onClick={save} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                Guardar
              </Button>
              <Button variant="outline" onClick={testWebhook}>
                <ExternalLink className="h-4 w-4 mr-1" />
                Enviar prueba
              </Button>
              {config && (
                <Button variant="destructive" size="sm" onClick={() => {
                  if (window.confirm('Eliminar integracion Slack? Las notificaciones dejaran de enviarse.')) {
                    removeConfig()
                  }
                }}>
                  <Trash2 className="h-4 w-4 mr-1" />
                  Eliminar
                </Button>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
