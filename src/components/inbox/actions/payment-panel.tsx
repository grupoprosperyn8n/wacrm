'use client'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { CreditCard, Loader2, Send, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'

interface Gateway { id: string; name: string; platform: string }
interface Props { conversationId: string; contactPhone?: string; onSendMessage: (text: string) => void; onClose: () => void }

export function PaymentPanel({ conversationId, contactPhone, onSendMessage, onClose }: Props) {
  const [gateways, setGateways] = useState<Gateway[]>([])
  const [loading, setLoading] = useState(true)
  const [amount, setAmount] = useState('')
  const [concept, setConcept] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    fetch('/api/payments/gateways').then(r => r.json()).then(d => setGateways(d.gateways || [])).catch(() => {}).finally(() => setLoading(false))
  }, [])

  async function sendPaymentLink() {
    if (!amount || !gateways.length) { toast.error('Completa el monto y configura una pasarela'); return }
    setSending(true)
    try {
      const res = await fetch('/api/payments/links', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gateway_id: gateways[0].id, title: concept || 'Pago', amount: parseFloat(amount),
          currency: 'ARS', contact_phone: contactPhone || '',
        }),
      })
      if (!res.ok) { toast.error('Error al crear link'); return }
      const link = await res.json()
      const text = '*💳 SOLICITUD DE PAGO*\nConcepto: ' + (concept || 'Pago') + '\nMonto: $' + amount + '\n\nLink de pago: ' + link.link_url
      onSendMessage(text)
      toast.success('Link de pago enviado')
      onClose()
    } catch { toast.error('Error de conexion') }
    setSending(false)
  }

  return (
    <div className="rounded-lg border border-border bg-card p-3 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium flex items-center gap-1.5"><CreditCard className="h-4 w-4 text-primary" /> Cobrar</h4>
        <Button variant="ghost" size="sm" onClick={onClose}>X</Button>
      </div>
      {loading ? <p className="text-xs text-center text-muted-foreground py-2">Cargando...</p> : gateways.length === 0 ? (
        <p className="text-xs text-center text-muted-foreground py-2">Configura una pasarela en Settings - Pasarelas de pago</p>
      ) : (
        <>
          <div>
            <Label className="text-xs">Concepto</Label>
            <Input value={concept} onChange={e => setConcept(e.target.value)} placeholder="Ej: Producto X" className="text-sm" />
          </div>
          <div>
            <Label className="text-xs">Monto ($)</Label>
            <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" className="text-sm" />
          </div>
          <Button onClick={sendPaymentLink} disabled={sending || !amount} className="w-full">
            {sending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Send className="h-4 w-4 mr-1" />}
            Enviar Link de Pago
          </Button>
          <p className="text-[10px] text-muted-foreground text-center">Cobra via: { gateways.map(function(g) { return g.platform }).join(', ')}</p>
        </>
      )}
    </div>
  )
}
