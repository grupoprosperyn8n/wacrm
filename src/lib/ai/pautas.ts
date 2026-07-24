interface Pauta {
  id: string
  condition: string  // keyword or regex pattern
  action: 'transfer_human' | 'escalate' | 'tag_contact' | 'custom_reply'
  actionValue?: string
  enabled: boolean
}

const DEFAULT_PAUTAS: Pauta[] = [
  { id: 'p1', condition: 'hablar con un asesor|asesor humano|transferir', action: 'transfer_human', enabled: true },
  { id: 'p2', condition: 'queja|reclamo|problema', action: 'escalate', enabled: true },
]

export function evaluatePautas(message: string, pautas: Pauta[]): Pauta[] {
  const matched: Pauta[] = []
  const text = message.toLowerCase()
  for (const p of pautas) {
    if (!p.enabled) continue
    const keywords = p.condition.split('|')
    if (keywords.some(k => text.includes(k.trim().toLowerCase()))) {
      matched.push(p)
    }
  }
  return matched
}
