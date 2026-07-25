import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/flows/admin-client'
import { runAutomationsForTrigger } from '@/lib/automations/engine'

export async function POST(request: Request) {
  let body: any
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const token = request.headers.get('x-n8n-token')
  if (!token) return NextResponse.json({ error: 'Token requerido' }, { status: 401 })

  const db = supabaseAdmin()
  const { data: integrations } = await db
    .from('ecommerce_integrations')
    .select('account_id')
    .eq('platform', 'webhook')
    .filter('config->>n8n_token', 'eq', token)
    .limit(1)

  if (!integrations?.length) return NextResponse.json({ error: 'Token invalido' }, { status: 401 })

  const accountId = integrations[0].account_id
  const eventType = body.event || 'n8n_webhook_received'

  runAutomationsForTrigger({ accountId: accountId as string, triggerType: eventType, channel: 'web' }).catch(() => {})

  return NextResponse.json({ ok: true, event: eventType })
}
