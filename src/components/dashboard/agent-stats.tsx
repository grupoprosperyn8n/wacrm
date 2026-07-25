'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Bot, MessageSquare, Users, TrendingUp, Loader2 } from 'lucide-react'

export function AgentStats() {
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    Promise.all([
      supabase.from('messages').select('id', { count: 'exact', head: true }).eq('sender_type', 'bot'),
      supabase.from('messages').select('id', { count: 'exact', head: true }).eq('sender_type', 'agent'),
      supabase.from('ai_config').select('id'),
    ]).then(([bot, agent, config]) => {
      setStats({
        botMessages: bot.count ?? 0,
        agentMessages: agent.count ?? 0,
        aiConfigured: (config.data ?? []).length > 0,
      })
      setLoading(false)
    })
  }, [])

  if (loading) return null

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <Bot className="h-4 w-4 text-primary" />
          Estadisticas de Agentes
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Bot className="h-3 w-3" /> Mensajes IA
            </div>
            <p className="text-2xl font-bold tabular-nums">{stats?.botMessages || 0}</p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Users className="h-3 w-3" /> Mensajes humanos
            </div>
            <p className="text-2xl font-bold tabular-nums">{stats?.agentMessages || 0}</p>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-1.5 text-xs">
          {stats?.aiConfigured ? (
            <span className="text-emerald-400 flex items-center gap-1"><TrendingUp className="h-3 w-3" /> IA configurada</span>
          ) : (
            <span className="text-muted-foreground">IA no configurada</span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
