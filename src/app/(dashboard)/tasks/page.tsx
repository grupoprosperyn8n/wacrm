'use client'
import { useEffect, useState, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { CheckCircle2, Circle, Plus, Trash2, Loader2, Flag, Clock, List, Columns3, Search, AlertTriangle, XCircle, History } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDistanceToNow, format } from 'date-fns'
import { es } from 'date-fns/locale'

const PRIORITY_ORDER: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 }
const PRIORITY_COLORS: Record<string, string> = { urgent: 'text-red-400 border-red-500/30 bg-red-500/10', high: 'text-amber-400 border-amber-500/30 bg-amber-500/10', medium: 'text-blue-400 border-blue-500/30 bg-blue-500/10', low: 'text-muted-foreground border-border bg-muted' }

function getTaskStatus(t: any): { label: string; color: string; icon: any } {
  if (t.status === 'cancelled') return { label: 'Anulada', color: 'bg-red-500/20 text-red-400', icon: XCircle }
  if (t.status === 'completed') return { label: 'Completada', color: 'bg-emerald-500/20 text-emerald-400', icon: CheckCircle2 }
  if (t.due_date && new Date(t.due_date) < new Date() && t.status !== 'completed')
    return { label: 'Fuera de termino', color: 'bg-red-500/20 text-red-400 animate-pulse', icon: AlertTriangle }
  if (t.status === 'in_progress') return { label: 'En progreso', color: 'bg-blue-500/20 text-blue-400', icon: Clock }
  return { label: 'Pendiente', color: 'bg-amber-500/20 text-amber-400', icon: Circle }
}

function getProgress(t: any): number {
  if (t.status === 'cancelled') return 0
  if (t.status === 'completed') return 100
  if (t.status === 'in_progress') return 50
  return 10
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<any[]>([]); const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false); const [editId, setEditId] = useState<string | null>(null)
  const [tab, setTab] = useState('list')
  const [form, setForm] = useState({ title: '', description: '', priority: 'medium', due_date: '' })
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [sortBy, setSortBy] = useState('created')
  const [dateFrom, setDateFrom] = useState(''); const [dateTo, setDateTo] = useState(''); const [daysAgo, setDaysAgo] = useState(''); const [quickDate, setQuickDate] = useState('all')

  async function load() { setLoading(true); try { const r = await fetch('/api/tasks'); if (r.ok) setTasks((await r.json()).tasks ?? []) } catch {}; setLoading(false) }
  useEffect(() => { load() }, [])

  function openNew() { setEditId(null); setForm({ title: '', description: '', priority: 'medium', due_date: '' }); setShowForm(true) }
  function openEdit(t: any) { setEditId(t.id); setForm({ title: t.title||'', description: t.description||'', priority: t.priority||'medium', due_date: t.due_date?.slice(0,16)||'' }); setShowForm(true) }

  async function save() {
    if (!form.title) { toast.error('Titulo requerido'); return }
    setSaving(true)
    const r = await fetch(editId ? '/api/tasks/'+editId : '/api/tasks', { method: editId ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    if (r.ok) { toast.success(editId?'Tarea actualizada':'Tarea creada'); setShowForm(false); load() }
    else { const d = await r.json(); toast.error(d.error||'Error') }
    setSaving(false)
  }

  async function toggleStatus(t: any) {
    const next = t.status === 'completed' ? 'pending' : t.status === 'in_progress' ? 'completed' : 'in_progress'
    await fetch('/api/tasks/'+t.id, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: next }) }); load()
  }
  async function quickStatus(id: string, status: string) { await fetch('/api/tasks/'+id, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) }); load() }
  async function remove(id: string) { if (!confirm('Eliminar tarea?')) return; await fetch('/api/tasks/'+id, { method: 'DELETE' }); toast.success('Tarea eliminada'); load() }

  const processed = useMemo(() => {
    let filtered = [...tasks]
    if (search) { const q = search.toLowerCase(); filtered = filtered.filter(t => t.title?.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q)) }
    if (filterStatus !== 'all') filtered = filtered.filter(t => t.status === filterStatus)
    if (dateFrom) { const f = new Date(dateFrom); filtered = filtered.filter(t => !t.created_at || new Date(t.created_at) >= f) }
    if (dateTo) { const t2 = new Date(dateTo); t2.setHours(23,59,59,999); filtered = filtered.filter(t => !t.created_at || new Date(t.created_at) <= t2) }
    const now = new Date()
    filtered.sort((a, b) => {
      if (sortBy === 'due') { const da = a.due_date ? new Date(a.due_date).getTime() : 9999999999999; const db = b.due_date ? new Date(b.due_date).getTime() : 9999999999999; return da - db }
      if (sortBy === 'overdue') { const oa = a.due_date && new Date(a.due_date) < now && a.status !== 'completed' && a.status !== 'cancelled' ? 0 : 1; const ob = b.due_date && new Date(b.due_date) < now && b.status !== 'completed' && b.status !== 'cancelled' ? 0 : 1; return oa - ob }
      return (PRIORITY_ORDER[a.priority]??99) - (PRIORITY_ORDER[b.priority]??99)
    })
    return filtered
  }, [tasks, search, filterStatus, sortBy, dateFrom, dateTo])

  const pendingCount = tasks.filter(t => t.status !== 'completed' && t.status !== 'cancelled').length
  const overdueCount = tasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'completed' && t.status !== 'cancelled').length
  const completedCount = tasks.filter(t => t.status === 'completed').length

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Tareas</h1>
          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
            <span>{pendingCount} pendientes</span>
            {overdueCount > 0 && <span className="text-red-400 font-medium">{overdueCount} vencidas</span>}
            <span>{completedCount} completadas</span>
            <span>{tasks.length} total</span>
          </div>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Nueva tarea</Button>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar tareas..." className="pl-8 text-sm" />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="text-sm rounded-lg border border-border bg-background px-2 py-2">
          <option value="all">Todas</option><option value="pending">Pendientes</option><option value="in_progress">En progreso</option><option value="completed">Completadas</option><option value="cancelled">Anuladas</option>
        </select>
        <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="text-sm rounded-lg border border-border bg-background px-2 py-2">
          <option value="created">Recientes</option><option value="due">Vencimiento</option><option value="overdue">Vencidas primero</option>
        </select>
        <div className="flex items-center gap-1 border border-border rounded-lg px-2 py-1 bg-background">
          <span className="text-xs text-muted-foreground">Desde:</span>
          <Input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} className="h-7 w-28 text-xs border-0 p-0 shadow-none" />
          <span className="text-xs text-muted-foreground">Hasta:</span>
          <Input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)} className="h-7 w-28 text-xs border-0 p-0 shadow-none" />
          <span className="text-xs text-muted-foreground ml-1">o</span>
          <Input type="number" value={daysAgo} onChange={e=>{const v=parseInt(e.target.value)||0;setDaysAgo(e.target.value);if(v>0){const d=new Date();d.setDate(d.getDate()-v);setDateFrom(d.toISOString().slice(0,10));setDateTo(new Date().toISOString().slice(0,10))}}} className="h-7 w-14 text-xs border-0 p-0 shadow-none" placeholder="dias" min="1" />
          <span className="text-xs text-muted-foreground">atras</span>
        </div>
        <select value={quickDate} onChange={e => { setQuickDate(e.target.value);
          if(e.target.value==='today'){const d=new Date().toISOString().slice(0,10);setDateFrom(d);setDateTo(d)}
          else if(e.target.value==='week'){const d=new Date();const w=d.getDate()-d.getDay();const from=new Date(d.getFullYear(),d.getMonth(),w);const to=new Date(d.getFullYear(),d.getMonth(),w+6);setDateFrom(from.toISOString().slice(0,10));setDateTo(to.toISOString().slice(0,10))}
          else if(e.target.value==='month'){const d=new Date();setDateFrom(new Date(d.getFullYear(),d.getMonth(),1).toISOString().slice(0,10));setDateTo(new Date(d.getFullYear(),d.getMonth()+1,0).toISOString().slice(0,10))}
          else if(e.target.value==='year'){const d=new Date();setDateFrom(new Date(d.getFullYear(),0,1).toISOString().slice(0,10));setDateTo(new Date(d.getFullYear(),11,31).toISOString().slice(0,10))}
          else if(e.target.value==='7days'){const d=new Date();d.setDate(d.getDate()-7);setDateFrom(d.toISOString().slice(0,10));setDateTo(new Date().toISOString().slice(0,10))}
          else if(e.target.value==='30days'){const d=new Date();d.setDate(d.getDate()-30);setDateFrom(d.toISOString().slice(0,10));setDateTo(new Date().toISOString().slice(0,10))}
          else if(e.target.value==='clear'){setDateFrom('');setDateTo('');setQuickDate('all')}
        }} className="text-sm rounded-lg border border-border bg-background px-2 py-2">
          <option value="all">Sin filtro fecha</option><option value="today">Hoy</option><option value="week">Esta semana</option><option value="month">Este mes</option><option value="year">Este año</option><option value="7days">Ultimos 7 dias</option><option value="30days">Ultimos 30 dias</option><option value="clear">Limpiar</option>
        </select>

      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="list"><List className="h-4 w-4 mr-1" /> Lista</TabsTrigger>
          <TabsTrigger value="kanban"><Columns3 className="h-4 w-4 mr-1" /> Kanban</TabsTrigger>
          <TabsTrigger value="history"><History className="h-4 w-4 mr-1" /> Historial ({tasks.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="mt-2">
          <Card><CardContent className="p-0">
            {loading ? <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div> :
            processed.length === 0 ? <p className="text-sm text-muted-foreground text-center py-8">Sin tareas</p> :
            <div className="divide-y divide-border">{processed.map((t: any) => {
              const st = getTaskStatus(t); const progress = getProgress(t)
              return (
              <div key={t.id} className="flex items-start gap-3 px-4 py-3 hover:bg-muted/30 cursor-pointer" onClick={()=>openEdit(t)}>
                <button onClick={e=>{e.stopPropagation();toggleStatus(t)}} className={cn('mt-0.5 shrink-0', t.status==='completed'?'text-emerald-400':'text-muted-foreground hover:text-foreground')}>
                  {t.status==='completed'?<CheckCircle2 className="h-5 w-5"/>:<Circle className="h-5 w-5"/>}</button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={cn('text-sm font-medium', t.status==='completed'&&'line-through text-muted-foreground')}>{t.title}</p>
                    <Badge variant="outline" className={cn('text-[10px] shrink-0', st.color)}><st.icon className="h-3 w-3 mr-0.5" />{st.label}</Badge>
                  </div>
                  <div className="mt-1.5 w-full bg-muted rounded-full h-1.5">
                    <div className={cn('h-1.5 rounded-full transition-all', progress === 100 ? 'bg-emerald-500' : progress >= 50 ? 'bg-blue-500' : 'bg-amber-500')} style={{width: progress+'%'}} />
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className={cn('text-[10px]', PRIORITY_COLORS[t.priority])}>{t.priority}</Badge>
                    {t.due_date && <span className={cn('text-[10px] flex items-center gap-1', new Date(t.due_date) < new Date() && t.status !== 'completed' && t.status !== 'cancelled' ? 'text-red-400 font-medium' : 'text-muted-foreground')}>
                      <Clock className="h-3 w-3" />{formatDistanceToNow(new Date(t.due_date),{addSuffix:true,locale:es})}</span>}
                    <span className="text-[10px] text-muted-foreground">{format(new Date(t.created_at), 'dd/MM/yy')}</span>
                  </div>
                </div>
                <button onClick={e=>{e.stopPropagation();remove(t.id)}} className="p-1 text-muted-foreground hover:text-red-400 shrink-0"><Trash2 className="h-4 w-4" /></button>
              </div>)
            })}</div>}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="kanban" className="mt-2">
          {loading ? <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div> :
          <div className="grid grid-cols-3 gap-4">
            {[{ key: 'pending', label: 'Pendientes', icon: Circle, color: 'border-t-amber-500' },
              { key: 'in_progress', label: 'En Progreso', icon: Clock, color: 'border-t-blue-500' },
              { key: 'completed', label: 'Completadas', icon: CheckCircle2, color: 'border-t-emerald-500' },
            ].map(col => {
              const items = tasks.filter((t:any) => t.status === col.key)
              const Icon = col.icon
              return (
                <div key={col.key}
                  onDragOver={e=>e.preventDefault()}
                  onDrop={e=>{e.preventDefault();const id=e.dataTransfer.getData('text/plain');if(id)quickStatus(id,col.key)}}
                  className="rounded-lg border border-border bg-muted/30">
                  <div className="px-3 py-2 border-b border-border bg-card rounded-t-lg">
                    <h3 className="text-sm font-semibold flex items-center justify-between">
                      <span className="flex items-center gap-2"><Icon className="h-4 w-4" />{col.label}</span>
                      <Badge variant="secondary" className="text-[10px]">{items.length}</Badge>
                    </h3>
                  </div>
                  <div className="p-2 space-y-2 min-h-[200px]">
                    {items.length===0 && <p className="text-xs text-muted-foreground text-center py-4">Sin tareas</p>}
                    {items.map((t:any) => {
                      const st = getTaskStatus(t)
                      return (
                      <div key={t.id} onClick={()=>openEdit(t)}
                        draggable
                        onDragStart={e=>{e.dataTransfer.setData('text/plain',t.id);e.dataTransfer.setData('status',col.key)}}
                        className="rounded-lg border border-border bg-card p-3 cursor-pointer hover:shadow-md transition-shadow active:opacity-50">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-medium">{t.title}</p>
                          <Badge variant="outline" className={cn('text-[10px]', st.color)}>{st.label}</Badge>
                        </div>
                        <div className="w-full bg-muted rounded-full h-1.5 mb-2">
                          <div className={cn('h-1.5 rounded-full', getProgress(t)===100?'bg-emerald-500':getProgress(t)>=50?'bg-blue-500':'bg-amber-500')} style={{width:getProgress(t)+'%'}} />
                        </div>
                        {t.description && <p className="text-xs text-muted-foreground truncate mb-1">{t.description}</p>}
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={cn('text-[10px]', PRIORITY_COLORS[t.priority])}>{t.priority}</Badge>
                          {t.due_date && <span className={cn('text-[10px]', new Date(t.due_date)<new Date()&&t.status!=='completed'?'text-red-400':'text-muted-foreground')}>{formatDistanceToNow(new Date(t.due_date),{addSuffix:true,locale:es})}</span>}
                        </div>
                        <div className="flex gap-1 mt-2">
                          {col.key==='pending'&&<Button size="sm" variant="ghost" className="h-6 text-[10px] px-1" onClick={e=>{e.stopPropagation();quickStatus(t.id,'in_progress')}}>Iniciar</Button>}
                          {col.key==='in_progress'&&<Button size="sm" variant="ghost" className="h-6 text-[10px] px-1 text-emerald-400" onClick={e=>{e.stopPropagation();quickStatus(t.id,'completed')}}>Completar</Button>}
                        </div>
                      </div>)
                    })}
                  </div>
                </div>
              )
            })}
          </div>}
        </TabsContent>

        <TabsContent value="history" className="mt-2">
          <Card><CardContent className="p-0">
            {loading ? <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div> :
            processed.length === 0 ? <p className="text-sm text-muted-foreground text-center py-8">Sin tareas en el historial</p> :
            <div className="divide-y divide-border">{processed.map((t: any) => {
              const st = getTaskStatus(t)
              return (
              <div key={t.id} className="flex items-start gap-3 px-4 py-2 hover:bg-muted/30 cursor-pointer" onClick={()=>openEdit(t)}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm">{t.title}</p>
                    <Badge variant="outline" className={cn('text-[10px]', st.color)}><st.icon className="h-3 w-3 mr-0.5" />{st.label}</Badge>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground">
                    <span>Creada: {format(new Date(t.created_at), 'dd/MM/yy HH:mm')}</span>
                    {t.completed_at && <span>Completada: {format(new Date(t.completed_at), 'dd/MM/yy HH:mm')}</span>}
                    <Badge variant="outline" className={cn('text-[10px]', PRIORITY_COLORS[t.priority])}>{t.priority}</Badge>
                  </div>
                </div>
                <button onClick={e=>{e.stopPropagation();remove(t.id)}} className="p-1 text-muted-foreground hover:text-red-400 shrink-0"><Trash2 className="h-3 w-3" /></button>
              </div>)
            })}</div>}
          </CardContent></Card>
        </TabsContent>
      </Tabs>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{editId?'Editar tarea':'Nueva tarea'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1"><Label>Titulo</Label><Input value={form.title} onChange={e=>setForm(p=>({...p,title:e.target.value}))} placeholder="Nombre de la tarea" /></div>
            <div className="space-y-1"><Label>Descripcion</Label><textarea value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm min-h-[60px]" rows={2} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Prioridad</Label>
                <select value={form.priority} onChange={e=>setForm(p=>({...p,priority:e.target.value}))} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm">
                  <option value="low">Baja</option><option value="medium">Media</option><option value="high">Alta</option><option value="urgent">Urgente</option>
                </select>
              </div>
              <div className="space-y-1"><Label>Vencimiento</Label><Input type="datetime-local" value={form.due_date} onChange={e=>setForm(p=>({...p,due_date:e.target.value}))} /></div>
            </div>
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
