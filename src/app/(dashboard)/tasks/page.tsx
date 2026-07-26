'use client'
import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { CheckCircle2, Circle, Plus, Trash2, Loader2, Flag, Clock, List, Columns3 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

const PRIORITY_ORDER: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 }
const PRIORITY_COLORS: Record<string, string> = { urgent: 'text-red-400 border-red-500/30 bg-red-500/10', high: 'text-amber-400 border-amber-500/30 bg-amber-500/10', medium: 'text-blue-400 border-blue-500/30 bg-blue-500/10', low: 'text-muted-foreground border-border bg-muted' }
const KANBAN_COLUMNS = [
  { key: 'pending', label: 'Pendientes', icon: Circle, color: 'border-t-amber-500' },
  { key: 'in_progress', label: 'En Progreso', icon: Clock, color: 'border-t-blue-500' },
  { key: 'completed', label: 'Completadas', icon: CheckCircle2, color: 'border-t-emerald-500' },
]

export default function TasksPage() {
  const [tasks, setTasks] = useState<any[]>([]); const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false); const [editId, setEditId] = useState<string | null>(null)
  const [tab, setTab] = useState('list')
  const [form, setForm] = useState({ title: '', description: '', priority: 'medium', due_date: '' })
  const [saving, setSaving] = useState(false)

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

  const sorted = [...tasks].sort((a: any, b: any) => (PRIORITY_ORDER[a.priority]??99)-(PRIORITY_ORDER[b.priority]??99))
  const pending = sorted.filter(t => t.status !== 'completed' && t.status !== 'cancelled')
  const completed = sorted.filter(t => t.status === 'completed')

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Tareas</h1><p className="text-sm text-muted-foreground">{pending.length} pendientes</p></div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Nueva tarea</Button>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="list"><List className="h-4 w-4 mr-1" /> Lista</TabsTrigger>
          <TabsTrigger value="kanban"><Columns3 className="h-4 w-4 mr-1" /> Kanban</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="mt-4">
          <Card><CardContent className="p-0">
            {loading ? <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div> :
            tasks.length===0 ? <p className="text-sm text-muted-foreground text-center py-8">Sin tareas</p> :
            <div className="divide-y divide-border">{sorted.map((t: any) => (
              <div key={t.id} className="flex items-start gap-3 px-4 py-3 hover:bg-muted/30 cursor-pointer" onClick={()=>openEdit(t)}>
                <button onClick={e=>{e.stopPropagation();toggleStatus(t)}} className={cn('mt-0.5 shrink-0', t.status==='completed'?'text-emerald-400':'text-muted-foreground hover:text-foreground')}>
                  {t.status==='completed'?<CheckCircle2 className="h-5 w-5"/>:<Circle className="h-5 w-5"/>}</button>
                <div className="flex-1 min-w-0">
                  <p className={cn('text-sm', t.status==='completed'&&'line-through text-muted-foreground')}>{t.title}</p>
                  {t.description && <p className="text-xs text-muted-foreground truncate mt-0.5">{t.description}</p>}
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className={cn('text-[10px]', PRIORITY_COLORS[t.priority])}>{t.priority}</Badge>
                    {t.due_date && <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" />{formatDistanceToNow(new Date(t.due_date),{addSuffix:true,locale:es})}</span>}
                  </div>
                </div>
                <button onClick={e=>{e.stopPropagation();remove(t.id)}} className="p-1 text-muted-foreground hover:text-red-400 shrink-0"><Trash2 className="h-4 w-4" /></button>
              </div>))}</div>}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="kanban" className="mt-4">
          {loading ? <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div> :
          <div className="grid grid-cols-3 gap-4">
            {KANBAN_COLUMNS.map(col => {
              const items = tasks.filter((t:any) => t.status === col.key)
              const Icon = col.icon
              return (
                <div key={col.key} className="rounded-lg border border-border bg-muted/30">
                  <div className="px-3 py-2 border-b border-border bg-card rounded-t-lg">
                    <h3 className="text-sm font-semibold flex items-center justify-between">
                      <span className="flex items-center gap-2"><Icon className="h-4 w-4" />{col.label}</span>
                      <Badge variant="secondary" className="text-[10px]">{items.length}</Badge>
                    </h3>
                  </div>
                  <div className="p-2 space-y-2 min-h-[200px]">
                    {items.length===0 && <p className="text-xs text-muted-foreground text-center py-4">Sin tareas</p>}
                    {items.map((t:any) => (
                      <div key={t.id} onClick={()=>openEdit(t)} className="rounded-lg border border-border bg-card p-3 cursor-pointer hover:shadow-md transition-shadow">
                        <p className="text-sm font-medium">{t.title}</p>
                        {t.description && <p className="text-xs text-muted-foreground mt-1 truncate">{t.description}</p>}
                        <div className="flex items-center justify-between mt-2">
                          <Badge variant="outline" className={cn('text-[10px]', PRIORITY_COLORS[t.priority])}>{t.priority}</Badge>
                          {t.due_date && <span className="text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(t.due_date),{addSuffix:true,locale:es})}</span>}
                        </div>
                        <div className="flex gap-1 mt-2">
                          {col.key==='pending'&&<Button size="sm" variant="ghost" className="h-6 text-[10px] px-1" onClick={e=>{e.stopPropagation();quickStatus(t.id,'in_progress')}}>Iniciar</Button>}
                          {col.key==='in_progress'&&<Button size="sm" variant="ghost" className="h-6 text-[10px] px-1 text-emerald-400" onClick={e=>{e.stopPropagation();quickStatus(t.id,'completed')}}>Completar</Button>}
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
