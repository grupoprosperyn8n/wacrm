import type { ChatMessage } from '../types'
export async function generateDeepSeek(messages: ChatMessage[], apiKey: string, model?: string) {
  const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer '+apiKey },
    body: JSON.stringify({ model: model || 'deepseek-chat', messages, temperature: 0.7 }),
  })
  if (!res.ok) throw new Error('DeepSeek error: '+res.status)
  const d = await res.json()
  return d.choices?.[0]?.message?.content || ''
}
