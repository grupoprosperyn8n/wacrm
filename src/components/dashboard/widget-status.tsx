'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Smartphone, CheckCircle2, XCircle } from 'lucide-react'

export function WidgetStatus() {
  const { accountId } = useAuth()
  const [widgetUrl, setWidgetUrl] = useState('')
  const [origin, setOrigin] = useState('')

  useEffect(() => { setOrigin(window.location.origin) }, [])

  useEffect(() => {
    if (!accountId || !origin) return
    setWidgetUrl(`${origin}/widget.js?preview=1&account=${accountId}`)
  }, [accountId, origin])

  if (!accountId) return null

  return (
    <Card className="mt-4">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <Smartphone className="h-4 w-4 text-primary" />
          Widget de Chat
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {widgetUrl ? (
          <div className="flex items-center gap-2 text-xs text-emerald-400">
            <CheckCircle2 className="h-4 w-4" />
            Widget disponible. Andá a Configuración → Chat Widget para personalizarlo.
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <XCircle className="h-4 w-4" />
            No configurado
          </div>
        )}
        <div className="rounded-lg border border-border bg-muted/30 p-3">
          <p className="text-xs text-muted-foreground mb-2">Vista previa del widget:</p>
          <div className="relative h-40 rounded-lg bg-white border border-border overflow-hidden">
            <div className="absolute bottom-3 right-3 w-12 h-12 rounded-full bg-primary flex items-center justify-center shadow-lg">
              <Smartphone className="h-5 w-5 text-white" />
            </div>
            <div className="absolute bottom-16 right-3 w-64 rounded-lg border border-border shadow-lg bg-white overflow-hidden">
              <div className="bg-primary p-2 flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs">💬</div>
                <span className="text-white text-xs font-medium">CRM Agentico</span>
              </div>
              <div className="p-2 text-xs text-muted-foreground">Mensaje de bienvenida...</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
