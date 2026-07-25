import type { ChatMessage } from '../types'
export async function generateGemini(messages: ChatMessage[], apiKey: string, model?: string) {
  const m = model || 'gemini-2.0-flash'
  const history = messages.slice(0, -1).map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }))
  const last = messages[messages.length - 1]
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${apiKey}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [...history, { role: 'user', parts: [{ text: last.content }] }], generationConfig: { temperature: 0.7 } }),
  })
  if (!res.ok) throw new Error('Gemini error: '+res.status)
  const d = await res.json()
  return d.candidates?.[0]?.content?.parts?.[0]?.text || ''
}
