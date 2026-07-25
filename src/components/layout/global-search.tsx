'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { Search, Loader2, MessageSquare, Users, Briefcase, ExternalLink } from 'lucide-react'

const MAX_RESULTS = 5

export function GlobalSearch() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<{ contacts: any[]; conversations: any[]; deals: any[] }>({ contacts: [], conversations: [], deals: [] })
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { accountId } = useAuth()
  const inputRef = useRef<HTMLInputElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setOpen(o => !o) } }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 100) }, [open])

  useEffect(() => {
    if (!query.trim() || !accountId) { setResults({ contacts: [], conversations: [], deals: [] }); return }
    const q = query.toLowerCase()
    setLoading(true)
    const supabase = createClient()
    Promise.all([
      supabase.from('contacts').select('id, name, phone, email').eq('account_id', accountId).ilike('name', `%${q}%`).limit(MAX_RESULTS),
      supabase.from('conversations').select('id, last_message_text, channel, contact:contacts(name)').eq('account_id', accountId).ilike('last_message_text', `%${q}%`).limit(MAX_RESULTS),
      supabase.from('deals').select('id, title, value').eq('account_id', accountId).ilike('title', `%${q}%`).limit(MAX_RESULTS),
    ]).then(([c, conv, d]) => {
      setResults({
        contacts: (c.data ?? []) as any[],
        conversations: (conv.data ?? []) as any[],
        deals: (d.data ?? []) as any[],
      })
      setLoading(false)
    })
  }, [query, accountId])

  const go = (url: string) => { setOpen(false); setQuery(''); router.push(url) }

  const hasResults = results.contacts.length > 0 || results.conversations.length > 0 || results.deals.length > 0

  return (
    <>
      <button onClick={() => setOpen(true)} className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground" title="Buscar (Ctrl+K)">
        <Search className="h-4 w-4" />
      </button>

      {open && (
        <div ref={overlayRef} className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-background/60 backdrop-blur-sm" onClick={(e) => { if (e.target === overlayRef.current) setOpen(false) }}>
          <div className="w-full max-w-lg rounded-xl border border-border bg-popover shadow-2xl overflow-hidden">
            <div className="flex items-center gap-2 border-b border-border px-4 py-3">
              <Search className="h-4 w-4 text-muted-foreground shrink-0" />
              <input ref={inputRef} value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar contactos, conversaciones, negocios..." className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/60" />
              {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
              <kbd className="hidden sm:inline-flex items-center rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">ESC</kbd>
            </div>
            {query && !loading && !hasResults && <p className="px-4 py-6 text-center text-sm text-muted-foreground">Sin resultados</p>}
            {query && hasResults && (
              <div className="max-h-80 overflow-y-auto p-2 space-y-1">
                {results.contacts.length > 0 && (
                  <div>
                    <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Contactos</p>
                    {results.contacts.map(c => (
                      <button key={c.id} onClick={() => go('/contacts')} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm hover:bg-muted transition-colors">
                        <Users className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="flex-1 truncate font-medium">{c.name || c.phone}</span>
                        {c.email && <span className="text-xs text-muted-foreground truncate max-w-[120px]">{c.email}</span>}
                      </button>
                    ))}
                  </div>
                )}
                {results.conversations.length > 0 && (
                  <div>
                    <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Conversaciones</p>
                    {results.conversations.map(c => (
                      <button key={c.id} onClick={() => go('/inbox?c=' + c.id)} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm hover:bg-muted transition-colors">
                        <MessageSquare className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="flex-1 truncate">{(c.contact?.name || 'Unknown')}: {c.last_message_text?.slice(0, 40) || '...'}</span>
                      </button>
                    ))}
                  </div>
                )}
                {results.deals.length > 0 && (
                  <div>
                    <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Negocios</p>
                    {results.deals.map(d => (
                      <button key={d.id} onClick={() => go('/pipelines')} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm hover:bg-muted transition-colors">
                        <Briefcase className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="flex-1 truncate font-medium">{d.title}</span>
                        {d.value && <span className="text-xs text-muted-foreground">${d.value}</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
