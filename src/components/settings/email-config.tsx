'use client'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, CheckCircle2, XCircle, Mail, Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'

export function EmailConfig() {
  const [config, setConfig] = useState({
    host: '', port: '587', user: '', pass: '', from_email: '', resend_key: '',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [status, setStatus] = useState<'configuring' | 'configured' | 'unknown'>('unknown')

  async function load() {
    setLoading(true)
    try {
      const r = await fetch('/api/settings/email')
      if (r.ok) {
        const d = await r.json()
        if (d.configured) {
          setConfig({
            host: d.host || '', port: d.port || '587', user: d.user || '',
            pass: '', from_email: d.from_email || '', resend_key: '',
          })
          setStatus('configured')
        }
      }
    } catch {}
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function save() {
    setSaving(true)
    const r = await fetch('/api/settings/email', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        host: config.host, port: parseInt(config.port) || 587,
        user: config.user, pass: config.pass, from_email: config.from_email,
        resend_key: config.resend_key,
      }),
    })
    if (r.ok) { toast.success('Configuracion guardada'); setStatus('configured'); load() }
    else { const d = await r.json(); toast.error(d.error || 'Error') }
    setSaving(false)
  }

  async function test() {
    setTesting(true)
    const r = await fetch('/api/settings/email/test', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: config.from_email || config.user }),
    })
    if (r.ok) toast.success('Email de prueba enviado! Revisa tu bandeja de entrada.')
    else { const d = await r.json(); toast.error(d.error || 'Error') }
    setTesting(false)
  }

  async function remove() {
    if (!confirm('Eliminar configuracion de email?')) return
    await fetch('/api/settings/email', { method: 'DELETE' })
    setConfig({ host: '', port: '587', user: '', pass: '', from_email: '', resend_key: '' })
    setStatus('unknown')
    toast.success('Configuracion eliminada')
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Mail className="h-4 w-4 text-primary" /> Email
          {status === 'configured' && <Badge className="text-[10px]" variant="default">Configurado</Badge>}
        </CardTitle>
        <CardDescription>Configura el envio de emails para invitaciones y notificaciones. Usa SMTP (Hostinger, Gmail, etc.) o Resend API.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border border-blue-500/30 bg-blue-500/5 p-3 space-y-2">
          <p className="text-xs text-blue-400 font-medium">Como conseguir los datos:</p>
          <div className="text-xs text-muted-foreground space-y-1">
            <p><strong>Hostinger:</strong> En tu panel de Hostinger - Email - Configuracion SMTP, encontras: servidor (smtp.hostinger.com), puerto (587), usuario y contraseña.</p>
            <p><strong>Resend:</strong> Crea cuenta en resend.com, verifica tu dominio, genera API key. Gratis 100 emails/dia.</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted-foreground">SMTP</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1"><Label>Servidor SMTP</Label><Input value={config.host} onChange={e => setConfig(p => ({ ...p, host: e.target.value }))} placeholder="smtp.hostinger.com" /></div>
          <div className="space-y-1"><Label>Puerto</Label><Input value={config.port} onChange={e => setConfig(p => ({ ...p, port: e.target.value }))} placeholder="587" /></div>
        </div>
        <div className="space-y-1"><Label>Usuario</Label><Input value={config.user} onChange={e => setConfig(p => ({ ...p, user: e.target.value }))} placeholder="admin@sistemasagenticos.cloud" /></div>
        <div className="space-y-1"><Label>Contraseña</Label><div className="relative"><Input type={showPass ? 'text' : 'password'} value={config.pass} onChange={e => setConfig(p => ({ ...p, pass: e.target.value }))} placeholder="Contraseña del email" />
          <button type="button" onClick={() => setShowPass(p => !p)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">{showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div></div>
        <div className="space-y-1"><Label>Email desde (From)</Label><Input value={config.from_email} onChange={e => setConfig(p => ({ ...p, from_email: e.target.value }))} placeholder="admin@sistemasagenticos.cloud" /></div>

        <div className="flex items-center gap-2">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted-foreground">O Resend API</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        <div className="space-y-1"><Label>Resend API Key</Label><Input type="password" value={config.resend_key} onChange={e => setConfig(p => ({ ...p, resend_key: e.target.value }))} placeholder="re_..." /></div>

        <div className="flex gap-2">
          <Button onClick={save} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}Guardar</Button>
          <Button variant="outline" onClick={test} disabled={testing || (!config.host && !config.resend_key)}>{testing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Mail className="h-4 w-4 mr-1" />}Probar</Button>
          {status === 'configured' && <Button variant="ghost" onClick={remove} className="text-red-400">Eliminar</Button>}
        </div>
      </CardContent>
    </Card>
  )
}
