'use client'
import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { DollarSign, TrendingUp, TrendingDown, Users, ShoppingCart, Target, Loader2 } from 'lucide-react'
import { formatCurrency } from '@/lib/currency'

export default function AnalyticsPage() {
  const [data, setData] = useState<any>(null); const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    try {
      // Get deals data for ROI calculations
      const [dealsRes, contactsRes, productsRes] = await Promise.all([
        fetch('/api/deals?status=won'),
        fetch('/api/contacts'),
        fetch('/api/products'),
      ])
      const deals = dealsRes.ok ? (await dealsRes.json()).deals || [] : []
      const contacts = contactsRes.ok ? (await contactsRes.json()).contacts || [] : []
      const products = productsRes.ok ? (await productsRes.json()).products || [] : []

      const totalRevenue = deals.reduce((sum: number, d: any) => sum + (d.value || 0), 0)
      const wonDeals = deals.filter((d: any) => d.status === 'won')
      const avgDealValue = wonDeals.length > 0 ? totalRevenue / wonDeals.length : 0
      const conversionRate = deals.length > 0 ? (wonDeals.length / deals.length * 100) : 0
      const revenuePerContact = contacts.length > 0 ? totalRevenue / contacts.length : 0

      // Simple ROI: assume cost = VPS (~$15/mes) + API keys
      const monthlyCost = 15 + 20 // VPS $15 + AI API $20
      const monthlyRevenue = totalRevenue // total won deals (all time)
      const roi = monthlyCost > 0 && totalRevenue > 0 ? ((totalRevenue - monthlyCost) / monthlyCost * 100) : 0

      setData({ totalRevenue, wonDeals: wonDeals.length, avgDealValue, conversionRate, revenuePerContact, roi, totalDeals: deals.length, totalContacts: contacts.length, totalProducts: products.length })
    } catch {}
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  if (loading) return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>

  return (
    <div className="space-y-6 p-6">
      <div><h1 className="text-2xl font-bold">Analíticas</h1><p className="text-sm text-muted-foreground mt-1">Métricas de negocio y retorno de inversión</p></div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><DollarSign className="h-4 w-4 text-emerald-400" /> Ingresos Totales</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">${(data?.totalRevenue || 0).toLocaleString()}</p><p className="text-xs text-muted-foreground mt-1">Deals ganados: {data?.wonDeals || 0}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><Target className="h-4 w-4 text-blue-400" /> Ticket Promedio</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">${(data?.avgDealValue || 0).toLocaleString()}</p><p className="text-xs text-muted-foreground mt-1">Valor por deal ganado</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><TrendingUp className="h-4 w-4 text-primary" /> Tasa Conversión</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{data?.conversionRate.toFixed(1) || 0}%</p><p className="text-xs text-muted-foreground mt-1">{data?.wonDeals || 0} de {data?.totalDeals || 0} deals</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><TrendingUp className="h-4 w-4 text-emerald-400" /> ROI</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-emerald-400">{data?.roi.toFixed(0) || 0}%</p><p className="text-xs text-muted-foreground mt-1">Retorno sobre inversión</p></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card><CardHeader><CardTitle className="text-sm">Eficiencia Comercial</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between"><span className="text-sm">Ingreso por contacto</span><span className="text-sm font-semibold">${(data?.revenuePerContact || 0).toLocaleString()}</span></div>
              <div className="flex items-center justify-between"><span className="text-sm">Contactos totales</span><span className="text-sm font-semibold">{data?.totalContacts || 0}</span></div>
              <div className="flex items-center justify-between"><span className="text-sm">Deals totales</span><span className="text-sm font-semibold">{data?.totalDeals || 0}</span></div>
              <div className="flex items-center justify-between"><span className="text-sm">Productos</span><span className="text-sm font-semibold">{data?.totalProducts || 0}</span></div>
            </div>
          </CardContent>
        </Card>

        <Card><CardHeader><CardTitle className="text-sm">Resumen de Canal</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Los leads pueden venir de múltiples canales. Configurá webforms, WhatsApp, y redes sociales para maximizar captura.</p>
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30"><span className="text-sm">💬 WhatsApp</span><Badge>Activo</Badge></div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30"><span className="text-sm">📱 Webforms</span><Badge>{data?.totalContacts > 0 ? 'Recibiendo leads' : 'Configurar'}</Badge></div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30"><span className="text-sm">🤖 AI Agent</span><Badge>Auto-respuesta</Badge></div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
