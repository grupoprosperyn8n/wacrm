'use client'
import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { CalendarDays, ChevronLeft, ChevronRight, Loader2, Plus, List, Calendar, Trash2, Clock, Columns3 } from 'lucide-react'
import { cn } from '@/lib/utils'

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const DAYS = ['Dom','Lun','Mar','Mie','Jue','Vie','Sab']
const STATUS_COLORS: Record<string, string> = { pending: 'bg-amber-500/20 text-amber-400 border-amber-500/30', confirmed: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', cancelled: 'bg-red-500/20 text-red-400 border-red-500/30', completed: 'bg-blue-500/20 text-blue-400 border-blue-500/30' }
const KANBAN_COLUMNS = [
  { key: 'pending', label: 'Pendientes', color: 'border-t-amber-500' },
  { key: 'confirmed', label: 'Confirmados', color: 'border-t-emerald-500' },
  { key: 'completed', label: 'Completados', color: 'border-t-blue-500' },
  { key: 'cancelled', label: 'Cancelados', color: 'border-t-red-500' },
]

export default function BookingsPage() {
  const [bookings, setBookings] = useState<any[]>([]); const [loading, setLoading] = useState(true)
  const [date, setDate] = useState(new Date()); const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState({ title: '', description: '', start_time: '', end_time: '', contact_name: '', contact_email: '', contact_phone: '', status: 'pending' })
  const [saving, setSaving] = useState(false); const [tab, setTab] = useState('calendar')
  const [dragging, setDragging] = useState<string | null>(null)

  async function load() { setLoading(true); try { const r = await fetch('/api/bookings'); if (r.ok) setBookings((await r.json()).bookings ?? []) } catch {}; setLoading(false) }
  useEffect(() => { load() }, [])

  function openNew() { setEditId(null); const now = new Date(); setForm({ title: '', description: '', start_time: now.toISOString().slice(0,16), end_time: new Date(now.getTime()+3600000).toISOString().slice(0,16), contact_name: '', contact_email: '', contact_phone: '', status: 'pending' }); setShowForm(true) }
  function openEdit(b: any) { setEditId(b.id); setForm({ title: b.title||'', description: b.description||'', start_time: b.start_time?.slice(0,16)||'', end_time: b.end_time?.slice(0,16)||'', contact_name: b.contact_name||'', contact_email: b.contact_email||'', contact_phone: b.contact_phone||'', status: b.status||'pending' }); setShowForm(true) }

  async function save() {
    if (!form.title || !form.start_time) { toast.error('Titulo y fecha requeridos'); return }
    setSaving(true)
    const body = { ...form, end_time: form.end_time || new Date(new Date(form.start_time).getTime()+3600000).toISOString() }
    const r = await fetch(editId ? '/api/bookings/'+editId : '/api/bookings', { method: editId ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    if (r.ok) { toast.success(editId?'Turno actualizado':'Turno creado'); setShowForm(false); load() }
    else { const d = await r.json(); toast.error(d.error||'Error') }
    setSaving(false)
  }

  async function remove(id: string) { if (!confirm('Eliminar turno?')) return; await fetch('/api/bookings/'+id, { method: 'DELETE' }); toast.success('Turno eliminado'); load() }
  async function quickStatus(id: string, status: string) { await fetch('/api/bookings/'+id, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) }); load() }

  const year = date.getFullYear(), month = date.getMonth()
  const firstDay = new Date(year, month, 1).getDay(), daysInMonth = new Date(year, month+1, 0).getDate()
  const today = new Date()
  const getBookingsForDay = (day: number) => bookings.filter(b => new Date(b.start_time).toDateString() === new Date(year, month, day).toDateString())
  const activeBookings = bookings.filter(b => b.status !== 'cancelled').sort((a: any, b: any) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Turnos</h1><p className="text-sm text-muted-foreground">Gestion de turnos y reservas</p></div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Nuevo turno</Button>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="calendar"><Calendar className="h-4 w-4 mr-1" /> Calendario</TabsTrigger>
          <TabsTrigger value="list"><List className="h-4 w-4 mr-1" /> Lista</TabsTrigger>
          <TabsTrigger value="kanban"><Columns3 className="h-4 w-4 mr-1" /> Kanban</TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setDate(new Date(year, month-1, 1))}><ChevronLeft className="h-4 w-4" /></Button>
              <span className="text-sm font-medium w-40 text-center">{MONTHS[month]} {year}</span>
              <Button variant="outline" size="sm" onClick={() => setDate(new Date(year, month+1, 1))}><ChevronRight className="h-4 w-4" /></Button>
              <Button variant="ghost" size="sm" onClick={() => setDate(new Date())}>Hoy</Button>
            </div>
          </div>
          <Card><CardContent className="p-3">
            {loading ? <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div> :
            <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
              {DAYS.map(d => <div key={d} className="bg-muted/50 px-2 py-2 text-xs font-medium text-muted-foreground text-center">{d}</div>)}
              {Array.from({ length: firstDay }).map((_, i) => <div key={'e'+i} className="bg-card min-h-[90px] p-1" />)}
              {Array.from({ length: daysInMonth }).map((_, i) => { const day = i+1; const dayBookings = getBookingsForDay(day); const isToday = new Date(year, month, day).toDateString() === today.toDateString()
                return (<div key={day} className={cn(isToday?'bg-primary/5':'bg-card','min-h-[90px] p-1 border-t border-border/50')}>
                  <span className={cn('inline-flex h-5 w-5 items-center justify-center rounded-full text-xs', isToday&&'bg-primary text-primary-foreground font-bold')}>{day}</span>
                  <div className="mt-1 space-y-0.5">{dayBookings.slice(0,3).map((b:any) => (
                    <div key={b.id} onClick={()=>openEdit(b)} className={cn('rounded px-1 py-0.5 text-[10px] truncate cursor-pointer hover:opacity-80',STATUS_COLORS[b.status]||'bg-muted text-muted-foreground')}
                      title={b.title+' - '+(b.contact_name||'')}>{new Date(b.start_time).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})} {b.title}</div>))}
                    {dayBookings.length>3&&<p className="text-[10px] text-muted-foreground px-1">+{dayBookings.length-3}</p>}</div></div>)})}
            </div>}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="list" className="mt-4">
          <Card><CardContent className="p-0">
            {loading ? <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div> :
            activeBookings.length===0 ? <p className="text-sm text-muted-foreground text-center py-8">Sin turnos</p> :
            <div className="divide-y divide-border">{activeBookings.map((b:any) => (
              <div key={b.id} className="flex items-center gap-4 px-4 py-3 hover:bg-muted/30 cursor-pointer" onClick={()=>openEdit(b)}>
                <div className="text-center shrink-0 w-10"><p className="text-lg font-bold leading-tight">{new Date(b.start_time).getDate()}</p><p className="text-[10px] text-muted-foreground leading-tight">{MONTHS[new Date(b.start_time).getMonth()].slice(0,3)}</p></div>
                <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="text-xs text-muted-foreground shrink-0 w-16">{new Date(b.start_time).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</div>
                <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{b.title}</p>{b.contact_name&&<p className="text-xs text-muted-foreground truncate">{b.contact_name}{b.contact_phone?' - '+b.contact_phone:''}</p>}</div>
                <select value={b.status} onChange={e=>quickStatus(b.id,e.target.value)} onClick={e=>e.stopPropagation()} className="text-xs rounded border border-border bg-background px-2 py-1">
                  <option value="pending">Pendiente</option><option value="confirmed">Confirmado</option><option value="completed">Completado</option><option value="cancelled">Cancelado</option>
                </select>
                <button onClick={e=>{e.stopPropagation();remove(b.id)}} className="p-1 text-muted-foreground hover:text-red-400 shrink-0"><Trash2 className="h-4 w-4" /></button>
              </div>))}</div>}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="kanban" className="mt-4">
          {loading ? <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div> :
          <div className="grid grid-cols-4 gap-4">
            {KANBAN_COLUMNS.map(col => {
              const items = bookings.filter((b:any) => b.status === col.key)
              return (
                <div key={col.key}
                  onDragOver={(e)=>{e.preventDefault()}}
                  onDrop={(e)=>{e.preventDefault();const id=e.dataTransfer.getData('text/plain');if(id){quickStatus(id,col.key)} }}
                  className="rounded-lg border border-border bg-muted/30">
                  <div className="px-3 py-2 border-b border-border bg-card rounded-t-lg">
                    <h3 className="text-sm font-semibold flex items-center justify-between">{col.label} <Badge variant="secondary" className="text-[10px]">{items.length}</Badge></h3>
                  </div>
                  <div className="p-2 space-y-2 min-h-[200px]">
                    {items.length===0 && <p className="text-xs text-muted-foreground text-center py-4">Sin turnos</p>}
                    {items.map((b:any) => (
                      <div key={b.id} onClick={()=>openEdit(b)}
                        draggable
                        onDragStart={(e)=>{e.dataTransfer.setData('text/plain', b.id);e.dataTransfer.setData('status', col.key)}}
                        className="rounded-lg border border-border bg-card p-3 cursor-pointer hover:shadow-md transition-shadow active:opacity-50">
                        <p className="text-sm font-medium">{b.title}</p>
                        <p className="text-xs text-muted-foreground mt-1">{new Date(b.start_time).toLocaleString([],{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}</p>
                        {b.contact_name && <p className="text-xs text-muted-foreground">{b.contact_name}</p>}
                        <div className="flex gap-1 mt-2">
                          {col.key==='pending'&&<Button size="sm" variant="ghost" className="h-6 text-[10px] px-1" onClick={e=>{e.stopPropagation();quickStatus(b.id,'confirmed')}}>Confirmar</Button>}
                          {col.key==='confirmed'&&<Button size="sm" variant="ghost" className="h-6 text-[10px] px-1 text-emerald-400" onClick={e=>{e.stopPropagation();quickStatus(b.id,'completed')}}>Completar</Button>}
                          {col.key!=='cancelled'&&<Button size="sm" variant="ghost" className="h-6 text-[10px] px-1 text-red-400" onClick={e=>{e.stopPropagation();quickStatus(b.id,'cancelled')}}>Cancelar</Button>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>}
        </TabsContent>
      </Tabs>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{editId?'Editar turno':'Nuevo turno'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1"><Label>Titulo</Label><Input value={form.title} onChange={e=>setForm(p=>({...p,title:e.target.value}))} placeholder="Nombre del turno" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Inicio</Label><Input type="datetime-local" value={form.start_time} onChange={e=>setForm(p=>({...p,start_time:e.target.value}))} /></div>
              <div className="space-y-1"><Label>Fin</Label><Input type="datetime-local" value={form.end_time} onChange={e=>setForm(p=>({...p,end_time:e.target.value}))} /></div>
            </div>
            <div className="space-y-1"><Label>Estado</Label>
              <select value={form.status} onChange={e=>setForm(p=>({...p,status:e.target.value}))} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm">
                <option value="pending">Pendiente</option><option value="confirmed">Confirmado</option><option value="cancelled">Cancelado</option><option value="completed">Completado</option>
              </select>
            </div>
            <div className="space-y-1"><Label>Nombre</Label><Input value={form.contact_name} onChange={e=>setForm(p=>({...p,contact_name:e.target.value}))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Email</Label><Input type="email" value={form.contact_email} onChange={e=>setForm(p=>({...p,contact_email:e.target.value}))} /></div>
              <div className="space-y-1"><Label>Telefono</Label><Input value={form.contact_phone} onChange={e=>setForm(p=>({...p,contact_phone:e.target.value}))} /></div>
            </div>
            <div className="space-y-1"><Label>Descripcion</Label><textarea value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm min-h-[60px]" rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={()=>setShowForm(false)}>Cancelar</Button>
            <Button onClick={save} disabled={saving}>{saving?<Loader2 className="h-4 w-4 animate-spin mr-1" />:null}Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
