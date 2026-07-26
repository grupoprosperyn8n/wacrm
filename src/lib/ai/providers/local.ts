import { AiError, type ProviderResult } from '../types'
import { MAX_OUTPUT_TOKENS } from '../defaults'
import {
  mergeConsecutive,
  normalizeUsage,
  providerHttpError,
  toNetworkError,
  type ProviderArgs,
} from './shared'

interface LocalResponse {
  choices?: { message?: { content?: string } }[]
}

export async function generateLocal(args: ProviderArgs & { baseUrl?: string }): Promise<ProviderResult> {
  const { apiKey, model, systemPrompt, messages, timeoutMs } = args
  const baseUrl = (args as any).baseUrl || 'http://localhost:1234'

  let res: Response
  try {
    res = await fetch(baseUrl + '/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: apiKey ? `Bearer ${apiKey}` : '',
      },
      body: JSON.stringify({
        model: model || '',
        messages: [
          { role: 'system', content: systemPrompt },
          ...mergeConsecutive(messages),
        ],
        max_tokens: MAX_OUTPUT_TOKENS,
        temperature: 0.7,
      }),
      signal: AbortSignal.timeout(timeoutMs),
    })
  } catch (err) {
    throw toNetworkError(err)
  }

  if (!res.ok) {
    throw await providerHttpError('Local API', res)
  }

  const data = (await res.json().catch(() => null)) as LocalResponse | null
  const text = data?.choices?.[0]?.message?.content
  if (!text || typeof text !== 'string' || !text.trim()) {
    throw new AiError('Local API returned an empty response.', { code: 'empty_response' })
  }
  return { text, usage: null }
}
