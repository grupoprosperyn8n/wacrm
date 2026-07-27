'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, RefreshCw, Users } from 'lucide-react'
import { toast } from 'sonner'

interface AgentInfo {
  id: string
  full_name: string | null
  email: string
  avatar_url: string | null
  round_robin_index: number
  account_role: string
}

export function RoundRobinConfig() {
  const supabase = createClient()
  const { accountId } = useAuth()

  const [loading, setLoading] = useState(true)
  const [agents, setAgents] = useState<AgentInfo[]>([])

  async function loadAgents() {
    if (!accountId) return
    setLoading(true)
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, avatar_url, round_robin_index, account_role')
      .eq('account_id', accountId)
      .in('account_role', ['agent', 'admin', 'owner'])
      .order('round_robin_index', { ascending: true })

    if (error) {
      toast.error(error.message)
    } else {
      setAgents(data ?? [])
    }
    setLoading(false)
  }

  useEffect(() => { loadAgents() }, [accountId])

  async function resetIndex(agentId: string) {
    const { error } = await supabase
      .from('profiles')
      .update({ round_robin_index: 0 })
      .eq('id', agentId)

    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Indice reiniciado')
      loadAgents()
    }
  }

  async function testNext() {
    try {
      const res = await fetch('/api/round-robin/next-agent')
      const data = await res.json()
      if (data.agent) {
        toast.success(`Proximo agente: ${data.agent.full_name || data.agent.email}`)
      } else {
        toast.error(data.error || 'No hay agente disponible')
      }
    } catch {
      toast.error('Error al probar round robin')
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="h-4 w-4 text-primary" />
          Round Robin
        </CardTitle>
        <CardDescription>
          Distribucion automatica de leads entre agentes. El sistema asigna cada nuevo lead al
          agente con menor indice de asignacion.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadAgents} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1" />}
            Recargar
          </Button>
          <Button variant="outline" size="sm" onClick={testNext}>
            Probar proximo agente
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : agents.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No hay agentes disponibles en esta cuenta. Invita agentes para usar Round Robin.
          </p>
        ) : (
          <div className="space-y-2">
            {agents.map((agent) => (
              <div
                key={agent.id}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {(agent.full_name || agent.email).charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      {agent.full_name || 'Sin nombre'}
                    </p>
                    <p className="text-xs text-muted-foreground">{agent.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    Indice: {agent.round_robin_index}
                  </Badge>
                  <Badge variant="outline" className="text-xs capitalize">
                    {agent.account_role}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => resetIndex(agent.id)}
                    title="Reiniciar indice a 0"
                  >
                    <RefreshCw className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="rounded-lg bg-muted p-3">
          <p className="text-xs text-muted-foreground">
            <strong>Como funciona:</strong> Cada vez que se crea un lead, el sistema selecciona
            el agente con el indice mas bajo. El indice del agente seleccionado se incrementa
            automaticamente, asegurando una distribucion equitativa. Usa &quot;Reiniciar indice&quot;
            para volver a empezar el ciclo de un agente.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
