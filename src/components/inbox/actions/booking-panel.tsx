'use client'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CalendarDays, Loader2, Send } from 'lucide-react'
import { toast } from 'sonner'

interface Props { conversationId: string; contactId?: string; contactName?: string; onSendMessage: (text: string) => void; onClose: () => void }

export function BookingPanel({ conversationId, contactId, contactName, onSendMessage, onClose }: Props) {
  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [sending, setSending] = useState(false)

  async function createBooking() {
    if (!date || !time) { toast.error('Completa fecha y hora'); return }
    setSending(true)
    try {
      const startTime = new Date(date + 'T' + time)
      const endTime = new Date(startTime.getTime() + 60 * 60 * 1000) // 1 hour
      const res = await fetch('/api/bookings', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title || 'Turno', contact_id: contactId || null,
          contact_name: contactName || '', start_time: startTime.toISOString(),
          end_time: endTime.toISOString(), status: 'pending',
        }),
      })
      if (!res.ok) { toast.error('Error al crear turno'); return }
      const text = '*📅 TURNO AGENDADO*\n' + (title || 'Turno') + '\nFecha: ' + startTime.toLocaleDateString('es-AR') + ' ' + startTime.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
      onSendMessage(text)
      toast.success('Turno creado y enviado al chat')
      onClose()
    } catch { toast.error('Error de conexion') }
    setSending(false)
  }

  return (
    <div className="rounded-lg border border-border bg-card p-3 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium flex items-center gap-1.5"><CalendarDays className="h-4 w-4 text-primary" /> Agendar Turno</h4>
        <Button variant="ghost" size="sm" onClick={onClose}>X</Button>
      </div>
      <div>
        <Label className="text-xs">Titulo</Label>
        <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ej: Consulta" className="text-sm" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">Fecha</Label>
          <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="text-sm" />
        </div>
        <div>
          <Label className="text-xs">Hora</Label>
          <Input type="time" value={time} onChange={e => setTime(e.target.value)} className="text-sm" />
        </div>
      </div>
      <Button onClick={createBooking} disabled={sending || !date || !time} className="w-full">
        {sending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CalendarDays className="h-4 w-4 mr-1" />}
        Agendar y Enviar
      </Button>
    </div>
  )
}
