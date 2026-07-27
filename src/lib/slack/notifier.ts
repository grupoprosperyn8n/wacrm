import { supabaseAdmin } from '@/lib/automations/admin-client'

type EventType = 'new_lead' | 'new_deal' | 'conversation_assigned'

interface NotificationPayload {
  type: EventType
  account_id: string
  title: string
  message: string
  fields?: { label: string; value: string }[]
  url?: string
}

/**
 * Envia una notificacion a Slack para una cuenta.
 * Verifica si la integracion esta activa y el evento habilitado.
 */
export async function sendSlackNotification(payload: NotificationPayload): Promise<void> {
  const db = supabaseAdmin()

  // Obtener configuracion Slack de la cuenta
  const { data: config } = await db
    .from('slack_integrations')
    .select('webhook_url, notify_new_lead, notify_new_deal, notify_conversation_assigned')
    .eq('account_id', payload.account_id)
    .eq('is_active', true)
    .maybeSingle()

  if (!config?.webhook_url) return

  // Verificar si el evento esta habilitado
  const eventMap: Record<EventType, keyof typeof config> = {
    new_lead: 'notify_new_lead',
    new_deal: 'notify_new_deal',
    conversation_assigned: 'notify_conversation_assigned',
  }

  const flag = eventMap[payload.type]
  if (!config[flag]) return

  // Construir payload de Slack
  const blocks: any[] = [
    {
      type: 'header',
      text: { type: 'plain_text', text: payload.title, emoji: true },
    },
    {
      type: 'section',
      text: { type: 'mrkdwn', text: payload.message },
    },
  ]

  if (payload.fields && payload.fields.length > 0) {
    blocks.push({
      type: 'section',
      fields: payload.fields.map((f) => ({
        type: 'mrkdwn',
        text: `*${f.label}:*\n${f.value}`,
      })),
    })
  }

  if (payload.url) {
    blocks.push({
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: { type: 'plain_text', text: 'Ver en wacrm', emoji: true },
          url: payload.url,
        },
      ],
    })
  }

  try {
    const response = await fetch(config.webhook_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: payload.title, // fallback
        blocks,
        unfurl_links: false,
      }),
    })

    if (!response.ok) {
      const text = await response.text()
      console.error('[Slack] Error sending notification:', response.status, text)
    }
  } catch (err) {
    console.error('[Slack] Failed to send notification:', err)
  }
}
