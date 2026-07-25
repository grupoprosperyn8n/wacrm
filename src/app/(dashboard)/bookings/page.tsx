'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CalendarDays, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const DAYS = ['Dom','Lun','Mar','Mie','Jue','Vie','Sab']
const STATUS_COLORS: Record<string, string> = { pending: 'bg-amber-500/20 text-amber-400', confirmed: 'bg-emerald-500/20 text-emerald-400', cancelled: 'bg-red-500/20 text-red-400', completed: 'bg-blue-500/20 text-blue-400' }

export default function BookingsPage() {
  const [bookings, setBookings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [date, setDate] = useState(new Date())

  useEffect(() => {
    fetch('/api/bookings').then(r => r.json()).then(d => { setBookings(d.bookings ?? []); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  const year = date.getFullYear()
  const month = date.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const today = new Date()

  const getBookingsForDay = (day: number) => bookings.filter(b => new Date(b.start_time).toDateString() === new Date(year, month, day).toDateString())
  const changeMonth = (n: number) => setDate(new Date(year, month + n, 1))
  const activeBookings = bookings.filter(b => b.status !== 'cancelled').sort((a: any, b: any) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Calendario de Turnos</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => changeMonth(-1)}><ChevronLeft className="h-4 w-4" /></Button>
          <span className="text-sm font-medium w-40 text-center">{MONTHS[month]} {year}</span>
          <Button variant="outline" size="sm" onClick={() => changeMonth(1)}><ChevronRight className="h-4 w-4" /></Button>
          <Button variant="ghost" size="sm" onClick={() => setDate(new Date())}>Hoy</Button>
        </div>
      </div>
      <Card><CardContent className="p-4">
        {loading ? <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div> :
          <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
            {DAYS.map(d => <div key={d} className="bg-muted/50 px-2 py-2 text-xs font-medium text-muted-foreground text-center">{d}</div>)}
            {Array.from({ length: firstDay }).map((_, i) => <div key={"e"+i} className="bg-card min-h-[90px] p-1" />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1
              const dayBookings = getBookingsForDay(day)
              const isToday = new Date(year, month, day).toDateString() === today.toDateString()
              return (
                <div key={day} className={(isToday ? 'bg-primary/5' : 'bg-card') + ' min-h-[90px] p-1'}>
                  <span className={'inline-flex h-5 w-5 items-center justify-center rounded-full text-xs ' + (isToday ? 'bg-primary text-primary-foreground font-bold' : 'text-foreground')}>{day}</span>
                  <div className="mt-1 space-y-0.5">
                    {dayBookings.slice(0, 3).map((b: any) => (
                      <div key={b.id} className={'rounded px-1 py-0.5 text-[10px] truncate cursor-pointer ' + (STATUS_COLORS[b.status] || 'bg-muted text-muted-foreground')}
                        title={b.title + ' - ' + (b.contact_name || '')}>
                        {new Date(b.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} {b.title}
                      </div>
                    ))}
                    {dayBookings.length > 3 && <p className="text-[10px] text-muted-foreground px-1">+{dayBookings.length - 3} mas</p>}
                  </div>
                </div>
              )
            })}
          </div>
        }
      </CardContent></Card>
      <Card><CardHeader className="pb-3"><CardTitle className="text-sm font-medium flex items-center gap-2"><CalendarDays className="h-4 w-4 text-primary" /> Proximos turnos</CardTitle></CardHeader>
        <CardContent>
          {activeBookings.slice(0, 10).map((b: any) => (
            <div key={b.id} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
              <div className="text-center shrink-0"><p className="text-sm font-bold">{new Date(b.start_time).getDate()}</p><p className="text-[10px] text-muted-foreground">{MONTHS[new Date(b.start_time).getMonth()].slice(0, 3)}</p></div>
              <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{b.title}</p><p className="text-xs text-muted-foreground">{b.contact_name || ''} {b.contact_phone ? '- '+b.contact_phone : ''}</p></div>
              <Badge variant="outline" className={STATUS_COLORS[b.status]}>{b.status}</Badge>
            </div>
          ))}
          {activeBookings.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Sin turnos</p>}
        </CardContent>
      </Card>
    </div>
  )
}
