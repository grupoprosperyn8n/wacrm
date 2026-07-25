'use client'

import { useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { toast } from 'sonner'
import { Globe, Loader2 } from 'lucide-react'

const TIMEZONES = [
  'America/Argentina/Buenos_Aires', 'America/Mexico_City', 'America/Bogota',
  'America/Santiago', 'America/Lima', 'America/Sao_Paulo', 'America/Caracas',
  'America/La_Paz', 'America/Asuncion', 'America/Montevideo', 'America/Guatemala',
  'America/Panama', 'America/Costa_Rica', 'America/Santo_Domingo',
  'America/New_York', 'America/Miami', 'America/Chicago', 'America/Denver',
  'America/Los_Angeles', 'Europe/Madrid', 'UTC',
]

export function TimezoneSettings() {
  const { profile, refreshProfile } = useAuth()
  const [tz, setTz] = useState(profile?.timezone || 'America/Argentina/Buenos_Aires')
  const [saving, setSaving] = useState(false)

  async function save() {
    if (!profile?.id) return
    setSaving(true)
    await createClient().from('profiles').update({ timezone: tz }).eq('id', profile.id)
    await refreshProfile()
    setSaving(false)
    toast.success('Zona horaria guardada')
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base"><Globe className="h-4 w-4 text-primary" /> Zona Horaria</CardTitle>
        <CardDescription>Configura tu zona horaria para las fechas y horas en el CRM.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1">
          <Label>Zona horaria</Label>
          <select value={tz} onChange={e => setTz(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground">
            {TIMEZONES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ').replace('America/', '')}</option>)}
          </select>
        </div>
        <Button onClick={save} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
          Guardar
        </Button>
      </CardContent>
    </Card>
  )
}
