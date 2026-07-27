'use client'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, Trash2, Copy, Loader2, ExternalLink, Eye } from 'lucide-react'
import { toast } from 'sonner'

export function WebformsPanel() {
  const [items, setItems] = useState<any[]>([]); const [loading, setLoading] = useState(true)
  const [show, setShow] = useState(false); const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', slug: '', fields: [{ key: 'name', label: 'Nombre', type: 'text', required: true }, { key: 'phone', label: 'Telefono', type: 'phone', required: true }] })
  const [saving, setSaving] = useState(false)

  async function load() { setLoading(true); try { const r = await fetch('/api/webforms'); if (r.ok) setItems((await r.json()).webforms ?? []) } catch {}; setLoading(false) }
  useEffect(() => { load() }, [])

  function openNew() { setEditId(null); setForm({ name: '', slug: 'form-' + Date.now(), fields: [{ key: 'name', label: 'Nombre', type: 'text', required: true }, { key: 'phone', label: 'Telefono', type: 'phone', required: true }] }); setShow(true) }
  function openEdit(i: any) { setEditId(i.id); setForm({ name: i.name, slug: i.slug, fields: i.fields || [] }); setShow(true) }
  function addField() { setForm(p => ({ ...p, fields: [...p.fields, { key: 'field_' + Date.now(), label: '', type: 'text', required: false }] })) }
  function updateField(i: number, key: string, value: any) { const f = [...form.fields]; (f[i] as any)[key] = value; setForm(p => ({ ...p, fields: f })) }
  function removeField(i: number) { setForm(p => ({ ...p, fields: p.fields.filter((_: any, idx: number) => idx !== i) })) }

  async function save() {
    setSaving(true)
    const r = await fetch(editId ? '/api/webforms/' + editId : '/api/webforms', { method: editId ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    if (r.ok) { toast.success(editId ? 'Formulario actualizado' : 'Formulario creado'); setShow(false); load() }
    else { const d = await r.json(); toast.error(d.error || 'Error') }
    setSaving(false)
  }

  async function remove(id: string) { if (!confirm('Eliminar formulario?')) return; await fetch('/api/webforms/' + id, { method: 'DELETE' }); toast.success('Eliminado'); load() }

  const origin = typeof window !== 'undefined' ? window.location.origin : ''

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base"><ExternalLink className="h-4 w-4 text-primary" /> Webforms</CardTitle>
        <CardDescription>Crea formularios para capturar leads desde tu sitio web. Se crean contactos y deals automáticamente.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between items-center"><p className="text-xs text-muted-foreground">{items.length} formularios</p><Button size="sm" onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Nuevo</Button></div>
        {loading ? <p className="text-sm text-center text-muted-foreground">Cargando...</p> :
        items.length === 0 ? <p className="text-sm text-center text-muted-foreground">Sin formularios. Crea uno para empezar a capturar leads.</p> :
        items.map((i: any) => (
          <div key={i.id} className="rounded-lg border border-border bg-card p-3">
            <div className="flex items-center justify-between mb-2">
              <div><p className="text-sm font-medium">{i.name}</p><p className="text-xs text-muted-foreground">{i.fields?.length || 0} campos · {i.submission_count || 0} submissions</p></div>
              <Badge variant={i.enabled ? 'default' : 'secondary'}>{i.enabled ? 'Activo' : 'Inactivo'}</Badge>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
              <span className="truncate max-w-[200px]">{origin}/api/public/webform/{i.slug}</span>
              <button onClick={() => { navigator.clipboard.writeText(origin + '/api/public/webform/' + i.slug); toast.success('URL copiada') }}><Copy className="h-3 w-3" /></button>
            </div>
            <div className="flex flex-wrap gap-1 mb-2">{i.fields?.map((f: any) => <Badge key={f.key} variant="outline" className="text-[10px]">{f.label}{f.required?' *':''}</Badge>)}</div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => openEdit(i)}>Editar</Button>
              <Button size="sm" variant="ghost" onClick={() => remove(i.id)} className="text-red-400"><Trash2 className="h-3 w-3" /></Button>
            </div>
          </div>
        ))}

        {show && (
          <div className="rounded-lg border border-primary/30 bg-muted/30 p-3 space-y-3">
            <h4 className="text-sm font-medium">{editId ? 'Editar' : 'Nuevo'} formulario</h4>
            <div><Label>Nombre</Label><Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></div>
            <div><Label>Slug (URL)</Label><Input value={form.slug} onChange={e => setForm(p => ({ ...p, slug: e.target.value }))} /></div>
            <div><Label className="flex items-center justify-between">Campos <Button size="sm" variant="outline" onClick={addField} className="h-6 text-[10px]">+ Campo</Button></Label>
              <div className="space-y-2 mt-1">{form.fields.map((f: any, i: number) => (
                <div key={i} className="flex items-center gap-2">
                  <Input value={f.key} onChange={e => updateField(i, 'key', e.target.value)} className="w-24 text-xs h-7" placeholder="key" />
                  <Input value={f.label} onChange={e => updateField(i, 'label', e.target.value)} className="flex-1 text-xs h-7" placeholder="Label" />
                  <select value={f.type} onChange={e => updateField(i, 'type', e.target.value)} className="text-xs rounded border border-border bg-background h-7 px-1">
                    <option value="text">Texto</option><option value="phone">Telefono</option><option value="email">Email</option><option value="textarea">Area</option>
                  </select>
                  <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={f.required} onChange={e => updateField(i, 'required', e.target.checked)} />Req</label>
                  <button onClick={() => removeField(i)} className="text-red-400"><Trash2 className="h-3 w-3" /></button>
                </div>
              ))}</div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setShow(false)}>Cancelar</Button>
              <Button onClick={save} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Guardar'}</Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
