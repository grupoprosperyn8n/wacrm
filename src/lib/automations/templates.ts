import { SYSTEM_SNAPSHOT_TEMPLATE } from '@/lib/templates/metadata'
import type { TemplateMetadata } from '@/lib/templates/metadata'
import type {
  AutomationStepConfig,
  AutomationStepType,
  AutomationTriggerConfig,
  AutomationTriggerType,
} from '@/types'

export type TemplateSlug =
  | 'welcome_message'
  | 'out_of_office'
  | 'lead_qualifier'
  | 'follow_up_reminder'
  | 'instagram_dm'
  | 'facebook'
  | 'web_chat'
  | 'telegram'

export interface TemplateStepSeed {
  step_type: AutomationStepType
  step_config: AutomationStepConfig
  branch?: 'yes' | 'no' | null
  /** Index (within this seed list) of the Condition parent, if nested. */
  parent_index?: number | null
}

export interface AutomationTemplateDefinition extends TemplateMetadata {
  slug: TemplateSlug
  name: string
  description: string
  trigger_type: AutomationTriggerType
  trigger_config: AutomationTriggerConfig
  steps: TemplateStepSeed[]
}

export const AUTOMATION_TEMPLATES: Record<TemplateSlug, AutomationTemplateDefinition> = {
  welcome_message: {
    slug: 'welcome_message',
    version: '1.0.0',
    schema_version: 1,
    category: 'support',
    tags: ['welcome', 'auto-reply', 'tagging'],
    ...SYSTEM_SNAPSHOT_TEMPLATE,
    name: 'Welcome Message',
    description: 'Auto-reply to first-time contacts with a greeting.',
    // first_inbound_message (added in PR #33) catches both brand-new
    // contacts AND manually-added/imported contacts on their first-ever
    // reply, which is what a user setting up a "welcome" automation
    // almost always wants. new_contact_created would miss the
    // manually-imported case.
    trigger_type: 'first_inbound_message',
    trigger_config: {},
    steps: [
      {
        step_type: 'send_message',
        step_config: {
          text: "Hi! 👋 Thanks for reaching out. We'll get back to you shortly.",
        },
      },
      {
        step_type: 'add_tag',
        step_config: { tag_id: '' },
      },
    ],
  },
  out_of_office: {
    slug: 'out_of_office',
    version: '1.0.0',
    schema_version: 1,
    category: 'support',
    tags: ['out-of-office', 'hours', 'auto-reply'],
    ...SYSTEM_SNAPSHOT_TEMPLATE,
    name: 'Out of Office',
    description: 'Auto-reply during off-hours so nobody is left waiting.',
    trigger_type: 'new_message_received',
    trigger_config: {},
    steps: [
      {
        step_type: 'condition',
        step_config: {
          subject: 'time_of_day',
          operand: '18:00-09:00',
        },
      },
      {
        step_type: 'send_message',
        step_config: {
          text:
            "Thanks for your message! Our team is offline right now (9am–6pm) and will reply first thing tomorrow.",
        },
        parent_index: 0,
        branch: 'yes',
      },
    ],
  },
  lead_qualifier: {
    slug: 'lead_qualifier',
    version: '1.0.0',
    schema_version: 1,
    category: 'sales',
    tags: ['lead-qualification', 'sales', 'assignment'],
    ...SYSTEM_SNAPSHOT_TEMPLATE,
    name: 'Lead Qualifier',
    description: 'Ask qualification questions to filter inbound leads.',
    trigger_type: 'keyword_match',
    trigger_config: {
      keywords: ['pricing', 'quote', 'buy'],
      match_type: 'contains',
    },
    steps: [
      {
        step_type: 'send_message',
        step_config: {
          text:
            "Great — happy to help with pricing! Quick question: roughly how many seats are you looking for?",
        },
      },
      {
        step_type: 'wait',
        step_config: { amount: 10, unit: 'minutes' },
      },
      {
        step_type: 'assign_conversation',
        step_config: { mode: 'round_robin' },
      },
    ],
  },
  follow_up_reminder: {
    slug: 'follow_up_reminder',
    version: '1.0.0',
    schema_version: 1,
    category: 'sales',
    tags: ['follow-up', 'nurture', 'reminder'],
    ...SYSTEM_SNAPSHOT_TEMPLATE,
    name: 'Follow-up Reminder',
    description: 'Send a nudge if a contact has not replied within 24 hours.',
    trigger_type: 'new_message_received',
    trigger_config: {},
    steps: [
      {
        step_type: 'wait',
        step_config: { amount: 1, unit: 'days' },
      },
      {
        step_type: 'send_message',
        step_config: {
          text:
            "Just circling back — did you have any other questions for us? Happy to help!",
        },
      },
    ],
  },
  instagram_dm: {
    slug: 'instagram_dm',
    version: '1.0.0',
    schema_version: 1,
    category: 'social',
    tags: ['instagram', 'dm', 'interactive'],
    ...SYSTEM_SNAPSHOT_TEMPLATE,
    name: 'Instagram DM',
    description:
      'Automatically reply when a contact mentions Instagram — welcomes them and offers menu options.',
    trigger_type: 'keyword_match',
    trigger_config: {
      keywords: ['instagram', 'ig', 'insta'],
      match_type: 'contains',
    },
    steps: [
      {
        step_type: 'send_message',
        step_config: {
          text:
            '¡Gracias por contactarnos desde Instagram! 📸 Ahora estás en nuestro canal de WhatsApp. Cuéntanos, ¿qué te gustaría saber?',
          _notes:
            'Mensaje de bienvenida enviado automáticamente cuando el usuario menciona Instagram.',
        },
      },
      {
        step_type: 'send_buttons',
        step_config: {
          kind: 'buttons',
          body: '¿Qué tipo de información buscas?',
          buttons: [
            { id: 'servicios', title: 'Servicios' },
            { id: 'precios', title: 'Precios' },
            { id: 'soporte', title: 'Soporte' },
          ],
          _notes: 'Botones rápidos con las opciones más comunes de consulta.',
        },
      },
      {
        step_type: 'add_tag',
        step_config: { tag: 'instagram_lead' },
      },
    ],
  },
  facebook: {
    slug: 'facebook',
    version: '1.0.0',
    schema_version: 1,
    category: 'social',
    tags: ['facebook', 'messenger', 'interactive'],
    ...SYSTEM_SNAPSHOT_TEMPLATE,
    name: 'Facebook',
    description:
      'Handle contacts arriving from Facebook Messenger with a welcome message and a list menu of services.',
    trigger_type: 'keyword_match',
    trigger_config: {
      keywords: ['facebook', 'fb', 'messenger'],
      match_type: 'contains',
    },
    steps: [
      {
        step_type: 'send_message',
        step_config: {
          text:
            '¡Hola! Has llegado desde Facebook Messenger 👍 Te damos la bienvenida a nuestro servicio de atención por WhatsApp. Selecciona una opción para empezar:',
          _notes:
            'Primer contacto — presenta el canal y guía al usuario a elegir una opción.',
        },
      },
      {
        step_type: 'send_list',
        step_config: {
          kind: 'list',
          button_label: 'Ver opciones',
          body: 'Elige una categoría:',
          sections: [
            {
              title: 'Servicios',
              rows: [
                {
                  id: 'productos',
                  title: 'Productos',
                  description: 'Catálogo completo',
                },
                {
                  id: 'cotizacion',
                  title: 'Cotización',
                  description: 'Solicita un presupuesto',
                },
                {
                  id: 'soporte',
                  title: 'Soporte técnico',
                  description: 'Ayuda especializada',
                },
              ],
            },
          ],
          _notes:
            'Menú interactivo tipo lista — permite al usuario explorar servicios.',
        },
      },
      {
        step_type: 'assign_conversation',
        step_config: { mode: 'round_robin' },
      },
    ],
  },
  web_chat: {
    slug: 'web_chat',
    version: '1.0.0',
    schema_version: 1,
    category: 'support',
    tags: ['web-chat', 'welcome', 'assignment'],
    ...SYSTEM_SNAPSHOT_TEMPLATE,
    name: 'Web Chat',
    description:
      'Simple welcome flow for web chat contacts — greets them, waits briefly, then auto-assigns to an agent.',
    trigger_type: 'new_message_received',
    trigger_config: {},
    steps: [
      {
        step_type: 'send_message',
        step_config: {
          text:
            '🖥️ ¡Bienvenido a nuestro chat web! Un agente te atenderá en breve. Mientras tanto, ¿hay algo en específico en lo que podamos ayudarte?',
          _notes:
            'Mensaje automático al recibir el primer mensaje del contacto en el chat web.',
        },
      },
      {
        step_type: 'wait',
        step_config: { amount: 5, unit: 'minutes' },
      },
      {
        step_type: 'assign_conversation',
        step_config: { mode: 'round_robin' },
      },
    ],
  },
  telegram: {
    slug: 'telegram',
    version: '1.0.0',
    schema_version: 1,
    category: 'social',
    tags: ['telegram', 'hours', 'conditional'],
    ...SYSTEM_SNAPSHOT_TEMPLATE,
    name: 'Telegram',
    description:
      'Respond to Telegram referrals with a condition — shows different messages during vs. outside business hours.',
    trigger_type: 'keyword_match',
    trigger_config: {
      keywords: ['telegram', 'tg'],
      match_type: 'contains',
    },
    steps: [
      {
        step_type: 'condition',
        step_config: {
          subject: 'time_of_day',
          operand: '09:00-18:00',
          _notes:
            'Evalúa si la hora actual está dentro del horario laboral (9am–6pm).',
        },
      },
      {
        step_type: 'send_message',
        step_config: {
          text:
            '¡Gracias por contactarnos desde Telegram! 💬 Estamos en horario laboral (9am–6pm) y te atenderemos en breve. ¿En qué podemos ayudarte?',
          _notes:
            'Rama SÍ — se envía cuando el contacto escribe dentro del horario laboral.',
        },
        parent_index: 0,
        branch: 'yes',
      },
      {
        step_type: 'send_message',
        step_config: {
          text:
            '¡Gracias por contactarnos desde Telegram! 💬 Nuestro horario es de 9am a 6pm. Te responderemos en cuanto abramos. ¡Gracias por tu paciencia!',
          _notes:
            'Rama NO — se envía cuando el contacto escribe fuera del horario laboral.',
        },
        parent_index: 0,
        branch: 'no',
      },
    ],
  },
}

export function getTemplate(slug: string): AutomationTemplateDefinition | null {
  return AUTOMATION_TEMPLATES[slug as TemplateSlug] ?? null
}
