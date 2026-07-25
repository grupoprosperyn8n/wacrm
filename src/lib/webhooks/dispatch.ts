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
  
  // Get all outgoing webhooks for this account that match the event
  const { data: webhooks } = await db
    .from('webhook_outgoing')
    .select('*')
    .eq('account_id', payload.account_id)
    .eq('enabled', true)
    .or(`event.eq.${payload.event},event.eq.*`)

  if (!webhooks?.length) return

  const body = JSON.stringify(payload)

  for (const wh of webhooks) {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-CRM-Event': payload.event,
      'X-CRM-Action': payload.action,
    }
    if (wh.secret) {
      headers['X-Webhook-Secret'] = wh.secret
    }

    fetch(wh.url, {
      method: 'POST',
      headers,
      body,
    }).catch(() => {
      // Silently fail - webhook delivery is best-effort
    })
  }
}

export async function dispatchEntityEvent(
  accountId: string,
  entityType: EntityType,
  action: 'created' | 'updated' | 'deleted',
  data: Record<string, unknown>,
) {
  await dispatchWebhook({
    event: `${entityType}.${action}`,
    entity_type: entityType,
    action,
    data,
    account_id: accountId,
  })
}
