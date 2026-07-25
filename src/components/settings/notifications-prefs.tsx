'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { toast } from 'sonner'
import { BellRing, Loader2 } from 'lucide-react'

const NOTIF_EVENTS = [
  { key: 'notify_message_received', label: 'Mensaje recibido', desc: 'Cuando un cliente escribe' },
  { key: 'notify_contact_created', label: 'Contacto creado', desc: 'Cuando se registra un nuevo contacto' },
  { key: 'notify_conversation_assigned', label: 'Conversacion asignada', desc: 'Cuando te asignan un chat' },
  { key: 'notify_deal_created', label: 'Negocio creado', desc: 'Cuando se crea un nuevo deal' },
]

export function NotificationsPrefs() {
  const { profile } = useAuth()
  const supabase = createClient()
  const [prefs, setPrefs] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function load() {
      if (!profile?.id) return
      const { data } = await supabase.from('profiles').select('notification_prefs').eq('id', profile.id).single()
      if (data?.notification_prefs) setPrefs(data.notification_prefs as any)
      setLoading(false)
    }
    load()
  }, [profile?.id])

  async function toggle(key: string, value: boolean) {
    const next = { ...prefs, [key]: value }
    setPrefs(next)
    setSaving(true)
    await supabase.from('profiles').update({ notification_prefs: next }).eq('id', profile?.id)
    setSaving(false)
    toast.success('Preferencia guardada')
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base"><BellRing className="h-4 w-4 text-primary" /> Notificaciones</CardTitle>
        <CardDescription>Elegi que eventos queres recibir como notificacion en el sistema.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Cargando...</div>
        ) : (
          NOTIF_EVENTS.map(ev => (
            <div key={ev.key} className="flex items-center justify-between gap-4 rounded-lg border border-border p-3">
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">{ev.label}</p>
                <p className="text-xs text-muted-foreground">{ev.desc}</p>
              </div>
              <Switch checked={prefs[ev.key] ?? true} onCheckedChange={v => toggle(ev.key, v)} />
            </div>
          ))
        )}
        <p className="text-xs text-muted-foreground">Las notificaciones se muestran en el modulo Notificaciones y en la campanita del header.</p>
      </CardContent>
    </Card>
  )
}
