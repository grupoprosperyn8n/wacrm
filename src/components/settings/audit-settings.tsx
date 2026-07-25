'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ClipboardList, Loader2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

export function AuditLog() {
  const [entries, setEntries] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/audit').then(r => r.json()).then(d => { setEntries(d.entries ?? []); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base"><ClipboardList className="h-4 w-4 text-primary" /> Registro de Actividad</CardTitle>
        <CardDescription>Ultimas acciones realizadas en el CRM.</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Cargando...</div>
        ) : entries.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Sin actividad registrada</p>
        ) : (
          <div className="space-y-2">
            {entries.map((e: any) => (
              <div key={e.id} className="flex items-center gap-3 rounded-lg border border-border p-3 text-sm">
                <Badge variant="outline" className="shrink-0 text-[10px]">{e.action || 'unknown'}</Badge>
                <span className="flex-1 text-muted-foreground truncate">{e.description || ''}</span>
                <span className="text-xs text-muted-foreground shrink-0">
                  {e.created_at ? formatDistanceToNow(new Date(e.created_at), { addSuffix: true, locale: es }) : ''}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
