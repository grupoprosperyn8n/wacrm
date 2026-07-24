'use client'

import { useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Copy, Check, Smartphone } from 'lucide-react'

export function WidgetSettings() {
  const { accountId } = useAuth()
  const [title, setTitle] = useState('CRM Agentico')
  const [subtitle, setSubtitle] = useState('Respondemos en minutos')
  const [welcomeMsg, setWelcomeMsg] = useState('¡Hola! Soy el asistente virtual. ¿En qué puedo ayudarte?')
  const [color, setColor] = useState('#7c3aed')
  const [position, setPosition] = useState('right')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [copied, setCopied] = useState(false)

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://wacrm.sistemasagenticos.cloud'
  const embedCode = `<script src="${origin}/widget.js"
  data-account="${accountId || 'TU_ACCOUNT_ID'}"
  data-color="${color}"
  data-position="${position}"
  data-title="${title}"
  data-subtitle="${subtitle}"
  data-welcome="${welcomeMsg}"
  data-avatar="${avatarUrl}"></script>`

  const copyCode = async () => {
    await navigator.clipboard.writeText(embedCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Smartphone className="h-4 w-4 text-primary" /> Widget de Chat
        </CardTitle>
        <CardDescription>
          Widget flotante para embeker en tu sitio web. Los clientes chatean desde ahí y los mensajes llegan a tu bandeja.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Título</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="CRM Agentico" />
          </div>
          <div className="space-y-1.5">
            <Label>Subtítulo</Label>
            <Input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="Respondemos en minutos" />
          </div>
          <div className="space-y-1.5">
            <Label>Color</Label>
            <div className="flex gap-2">
              <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-9 w-9 rounded border border-border cursor-pointer" />
              <Input value={color} onChange={(e) => setColor(e.target.value)} className="font-mono text-xs" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Posición</Label>
            <select value={position} onChange={(e) => setPosition(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground">
              <option value="right">Derecha</option>
              <option value="left">Izquierda</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>URL del Avatar (opcional)</Label>
            <Input value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="https://tudominio.com/avatar.png" />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Mensaje de bienvenida</Label>
          <Textarea value={welcomeMsg} onChange={(e) => setWelcomeMsg(e.target.value)} rows={2}
            placeholder="¡Hola! ¿En qué puedo ayudarte?" />
        </div>

        <div className="space-y-1.5">
          <Label>Código de embebido</Label>
          <div className="relative">
            <textarea readOnly value={embedCode} rows={5}
              className="w-full rounded-lg border border-border bg-muted p-3 text-xs font-mono text-foreground" />
            <Button size="sm" variant="outline" onClick={copyCode} className="absolute top-2 right-2">
              {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">Copiá este código y pegálo en el &lt;head&gt; de tu sitio web.</p>
        </div>
      </CardContent>
    </Card>
  )
}
