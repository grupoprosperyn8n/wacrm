'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Loader2, CheckCircle2, XCircle, ExternalLink, Trash2, Calendar } from 'lucide-react'
import { toast } from 'sonner'

interface CalendarConfigData {
  id: string
  account_id: string
  google_email: string | null
  sync_enabled: boolean
  sync_description: string | null
  calendar_id: string
  last_synced_at: string | null
  created_at: string
}

export function CalendarSettings() {
  const { accountId } = useAuth()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [config, setConfig] = useState<CalendarConfigData | null>(null)

  const [syncDescription, setSyncDescription] = useState('Reserva de {contact_name}')
  const [calendarId, setCalendarId] = useState('primary')
  const [syncEnabled, setSyncEnabled] = useState(false)

  async function loadConfig() {
    if (!accountId) return
    setLoading(true)
    try {
      const res = await fetch('/api/calendar/config')
      const data = await res.json()
      if (data.config) {
        setConfig(data.config)
        setSyncDescription(data.config.sync_description || 'Reserva de {contact_name} - {service}')
        setCalendarId(data.config.calendar_id || 'primary')
        setSyncEnabled(data.config.sync_enabled)
      }
    } catch {
      toast.error('Error al cargar configuracion')
    }
    setLoading(false)
  }

  useEffect(() => { loadConfig() }, [accountId])

  async function save() {
    setSaving(true)
    try {
      const res = await fetch('/api/calendar/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sync_description: syncDescription,
          calendar_id: calendarId,
          sync_enabled: syncEnabled,
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success('Configuracion guardada')
        loadConfig()
      } else {
        toast.error(data.error || 'Error al guardar')
      }
    } catch {
      toast.error('Error al guardar configuracion')
    }
    setSaving(false)
  }

  function startOAuth() {
    // Guardar account_id como state para recuperarlo en el callback
    const authUrl = `/api/calendar/auth${accountId ? `?state=${encodeURIComponent(accountId)}` : ''}`
    window.location.href = authUrl
  }

  async function disconnect() {
    if (!window.confirm('Desconectar Google Calendar? Los eventos dejaran de sincronizarse.')) return

    try {
      const res = await fetch('/api/calendar/config', { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        toast.success('Google Calendar desconectado')
        setConfig(null)
        setSyncEnabled(false)
      } else {
        toast.error(data.error || 'Error al desconectar')
      }
    } catch {
      toast.error('Error al desconectar')
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Calendar className="h-4 w-4 text-primary" />
          Google Calendar
        </CardTitle>
        <CardDescription>
          Sincroniza las reservas de wacrm con Google Calendar
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !config ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              <XCircle className="h-4 w-4 text-muted-foreground shrink-0" />
              No hay conexion con Google Calendar
            </div>
            <Button onClick={startOAuth}>
              <ExternalLink className="h-4 w-4 mr-1" />
              Conectar Google Calendar
            </Button>
            <p className="text-xs text-muted-foreground">
              Necesitas configurar GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET y GOOGLE_REDIRECT_URI
              en las variables de entorno del servidor.
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 rounded-lg border bg-muted/50 p-3">
              {syncEnabled
                ? <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
                : <XCircle className="h-5 w-5 text-muted-foreground shrink-0" />}
              <div>
                <p className="text-sm font-medium">
                  Conectado como {config.google_email || 'Google Calendar'}
                </p>
                {config.last_synced_at && (
                  <p className="text-xs text-muted-foreground">
                    Ultima sincronizacion: {new Date(config.last_synced_at).toLocaleString('es')}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="calendar-id">ID del Calendario</Label>
              <Input
                id="calendar-id"
                value={calendarId}
                onChange={(e) => setCalendarId(e.target.value)}
                placeholder="primary"
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Usa &quot;primary&quot; para el calendario principal, o pega el ID de un calendario secundario
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sync-description">Formato de descripcion</Label>
              <Input
                id="sync-description"
                value={syncDescription}
                onChange={(e) => setSyncDescription(e.target.value)}
                placeholder="Reserva de {contact_name} - {service}"
                className="text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Variables disponibles: {'{contact_name}'}, {'{service}'}, {'{contact_email}'}, {'{contact_phone}'}
              </p>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="sync-enabled" className="text-sm cursor-pointer">Sincronizacion activa</Label>
              <Switch id="sync-enabled" checked={syncEnabled} onCheckedChange={setSyncEnabled} />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button onClick={save} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                Guardar
              </Button>
              <Button variant="outline" onClick={startOAuth}>
                <ExternalLink className="h-4 w-4 mr-1" />
                Reconectar
              </Button>
              <Button variant="destructive" size="sm" onClick={disconnect}>
                <Trash2 className="h-4 w-4 mr-1" />
                Desconectar
              </Button>
            </div>

            <div className="rounded-lg bg-muted p-3">
              <p className="text-xs text-muted-foreground">
                <strong>Como funciona:</strong> Cuando se crea una reserva en wacrm, se crea
                automaticamente un evento en Google Calendar. Si la reserva se cancela o modifica,
                el evento se actualiza en tiempo real.
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
