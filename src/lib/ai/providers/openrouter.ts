import type { ChatMessage } from '../types'
export async function generateOpenRouter(messages: ChatMessage[], apiKey: string, model?: string) {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer '+apiKey, 'HTTP-Referer': 'https://wacrm.sistemasagenticos.cloud' },
    body: JSON.stringify({ model: model || 'openai/gpt-4o-mini', messages, temperature: 0.7 }),
  })
  if (!res.ok) throw new Error('OpenRouter error: '+res.status)
  const d = await res.json()
  return d.choices?.[0]?.message?.content || ''
}
