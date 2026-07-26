'use client'
import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Search, ShoppingCart, Package, Loader2, Send, Plus } from 'lucide-react'
import { toast } from 'sonner'

interface Product { id: string; title: string; description: string; price: number; currency: string; stock: number; image_url: string; category: string; product_url?: string }
interface Props { conversationId: string; onSendMessage: (text: string) => void; onClose: () => void }

export function ProductPanel({ conversationId, onSendMessage, onClose }: Props) {
  const [query, setQuery] = useState('')
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<Product | null>(null)

  const search = useCallback(async (q: string) => {
    if (!q.trim()) { setProducts([]); return }
    setLoading(true)
    try {
      const res = await fetch('/api/products?search=' + encodeURIComponent(q))
      if (res.ok) setProducts((await res.json()).products || [])
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => search(query), 300)
    return () => clearTimeout(timer)
  }, [query, search])

  function sendProduct(p: Product) {
    const text = '*🛒 ' + p.title + '*\n' +
      (p.description ? p.description + '\n' : '') +
      'Precio: $' + p.price + ' | Stock: ' + p.stock +
      (p.product_url ? '\n' + p.product_url : '')
    onSendMessage(text)
    toast.success('Producto enviado al chat')
    onClose()
  }

  function createOrder(p: Product) {
    const text = '*🛒 COMPRA: ' + p.title + '*\nPrecio: $' + p.price + '\n_Procesando orden..._'
    // Create order in background
    fetch('/api/orders', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversation_id: conversationId,
        product_id: p.id,
        title: p.title,
        price: p.price,
        currency: p.currency,
        quantity: 1,
        status: 'pending',
      }),
    }).catch(() => {})
    onSendMessage(text)
    toast.success('Orden creada. Envia link de pago para cobrar.')
    onClose()
  }

  return (
    <div className="rounded-lg border border-border bg-card p-3 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium flex items-center gap-1.5"><Package className="h-4 w-4 text-primary" /> Productos</h4>
        <Button variant="ghost" size="sm" onClick={onClose}>X</Button>
      </div>
      <div className="relative">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar productos..." className="pl-8 text-sm" autoFocus />
      </div>
      {loading && <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>}
      {!loading && products.length === 0 && query && <p className="text-xs text-center text-muted-foreground py-2">Sin resultados</p>}
      {!loading && products.slice(0, 5).map(p => (
        <div key={p.id} className="flex items-center gap-3 rounded-lg border border-border p-2 hover:bg-muted/50 cursor-pointer" onClick={() => setSelected(selected?.id === p.id ? null : p)}>
          {p.image_url && <img src={p.image_url} alt={p.title} className="w-10 h-10 rounded object-cover" />}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{p.title}</p>
            <p className="text-xs text-muted-foreground">${p.price} · Stock: {p.stock}</p>
          </div>
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={e => { e.stopPropagation(); sendProduct(p) }} title="Enviar al chat"><Send className="h-3.5 w-3.5" /></Button>
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-emerald-400" onClick={e => { e.stopPropagation(); createOrder(p) }} title="Vender"><Plus className="h-3.5 w-3.5" /></Button>
          </div>
        </div>
      ))}
    </div>
  )
}
