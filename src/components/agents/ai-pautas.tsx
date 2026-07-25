'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Plus, Trash2, AlertTriangle } from 'lucide-react'

interface Pauta {
  id: string
  condition: string
  action: string
  actionValue: string
  enabled: boolean
}

const STORAGE_KEY = 'crmagentico.pautas'

export function AiPautas() {
  const [pautas, setPautas] = useState<Pauta[]>(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') }
    catch { return [] }
  })

  function save(p: Pauta[]) {
    setPautas(p)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p))
  }

  function add() {
    save([...pautas, { id: String(Date.now()), condition: '', action: 'transfer_human', actionValue: '', enabled: true }])
  }

  function update(id: string, field: keyof Pauta, value: any) {
    save(pautas.map(p => p.id === id ? { ...p, [field]: value } : p))
  }

  function remove(id: string) {
    save(pautas.filter(p => p.id !== id))
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertTriangle className="h-4 w-4 text-amber-400" /> Pautas del Agente IA
        </CardTitle>
        <CardDescription>Reglas automáticas: si el cliente dice X, entonces hacé Y.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {pautas.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">Sin pautas todavía. Agregá una regla para empezar.</p>
        )}
        {pautas.map((p) => (
          <div key={p.id} className="flex items-start gap-2 rounded-lg border border-border bg-muted/30 p-3">
            <div className="flex-1 space-y-2">
              <div>
                <Label className="text-xs">Si el cliente dice...</Label>
                <Input value={p.condition} onChange={(e) => update(p.id, 'condition', e.target.value)}
                  placeholder="presupuesto, precio, cuánto cuesta" className="text-xs h-8" />
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Label className="text-xs">Entonces...</Label>
                  <select value={p.action} onChange={(e) => update(p.id, 'action', e.target.value)}
                    className="w-full rounded border border-border bg-background px-2 py-1.5 text-xs">
                    <option value="transfer_human">Transferir a humano</option>
                    <option value="escalate">Escalar (prioridad)</option>
                    <option value="tag_contact">Etiquetar contacto</option>
                    <option value="custom_reply">Respuesta personalizada</option>
                  </select>
                </div>
                {p.action === 'tag_contact' && (
                  <div className="flex-1">
                    <Label className="text-xs">Etiqueta</Label>
                    <Input value={p.actionValue} onChange={(e) => update(p.id, 'actionValue', e.target.value)}
                      placeholder="nombre-etiqueta" className="text-xs h-8" />
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1 pt-5">
              <Switch checked={p.enabled} onCheckedChange={(v) => update(p.id, 'enabled', v)} />
              <button onClick={() => remove(p.id)} className="p-1 text-muted-foreground hover:text-red-400">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={add} className="w-full">
          <Plus className="h-4 w-4 mr-1" /> Agregar pauta
        </Button>
      </CardContent>
    </Card>
  )
}
