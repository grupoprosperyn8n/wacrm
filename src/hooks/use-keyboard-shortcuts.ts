'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export function useKeyboardShortcuts() {
  const router = useRouter()

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      
      const ctrl = e.metaKey || e.ctrlKey
      
      if (ctrl && e.key === '1') { e.preventDefault(); router.push('/dashboard') }
      if (ctrl && e.key === '2') { e.preventDefault(); router.push('/inbox') }
      if (ctrl && e.key === '3') { e.preventDefault(); router.push('/contacts') }
      if (ctrl && e.key === '4') { e.preventDefault(); router.push('/pipelines') }
      if (ctrl && e.key === '5') { e.preventDefault(); router.push('/automations') }
      if (ctrl && e.key === '6') { e.preventDefault(); router.push('/flows') }
      if (ctrl && e.key === '7') { e.preventDefault(); router.push('/channels') }
      if (ctrl && e.key === '8') { e.preventDefault(); router.push('/settings') }
      if (e.key === '?' && !ctrl) { e.preventDefault(); alert('Atajos:\nCtrl+1: Panel\nCtrl+2: Bandeja\nCtrl+3: Contactos\nCtrl+4: Tuberias\nCtrl+5: Automatizaciones\nCtrl+6: Flujos\nCtrl+7: Canales\nCtrl+8: Config\nCtrl+K: Buscar') }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [router])
}
