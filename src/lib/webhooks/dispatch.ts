import { supabaseAdmin } from '@/lib/automations/admin-client'

type EntityType = 'contact' | 'product' | 'task' | 'booking' | 'deal' | 'member'

interface WebhookPayload {
  event: string
  entity_type: EntityType
  action: 'created' | 'updated' | 'deleted'
  data: Record<string, unknown>
  account_id: string
}

export async function dispatchWebhook(payload: WebhookPayload) {
  const db = supabaseAdmin()
  const { data: webhooks } = await db
    .from('webhook_outgoing')
    .select('*')
    .eq('account_id', payload.account_id)
    .eq('enabled', true)
    .or('event.eq.' + payload.event + ',event.eq.*')
  if (!webhooks?.length) return
  const body = JSON.stringify(payload)
  for (const wh of webhooks) {
    const headers: Record<string, string> = { 'Content-Type': 'application/json', 'X-CRM-Event': payload.event, 'X-CRM-Action': payload.action }
    if (wh.secret) headers['X-Webhook-Secret'] = wh.secret
    fetch(wh.url, { method: 'POST', headers, body }).catch(function() {})
  }
}

export async function dispatchEntityEvent(
  accountId: string,
  entityType: EntityType,
  action: 'created' | 'updated' | 'deleted',
  data: Record<string, unknown>,
) {
  const db = supabaseAdmin()

  // 1. Legacy webhook_outgoing dispatch
  dispatchWebhook({ event: entityType + '.' + action, entity_type: entityType, action: action, data: data, account_id: accountId }).catch(function() {})

  // 2. Sync integrations - push to ALL connected external systems
  try {
    const { data: integrations } = await db
      .from('sync_integrations')
      .select('*')
      .eq('account_id', accountId)
      .eq('enabled', true)
      .contains('entity_types', [entityType])

    if (integrations?.length) {
      const { runSync } = await import('@/lib/sync/engine')
      for (const integration of integrations) {
        runSync(integration.id, 'push').catch(function(e: Error) {
          console.error('[sync] ' + integration.connector_type + ' push failed:', e.message)
        })
      }
    }
  } catch {
    // Silent fail - sync is best-effort
  }
}
