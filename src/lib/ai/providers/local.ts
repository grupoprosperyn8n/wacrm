import type { ChatMessage } from '../types'
export async function generateLocal(messages: ChatMessage[], apiKey: string, model?: string, baseUrl?: string) {
  const url = baseUrl || 'http://localhost:1234'
  const res = await fetch(url+'/v1/chat/completions', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: model || '', messages, temperature: 0.7, max_tokens: 2048 }),
  })
  if (!res.ok) throw new Error('Local API error: '+res.status)
  const d = await res.json()
  return d.choices?.[0]?.message?.content || ''
}
