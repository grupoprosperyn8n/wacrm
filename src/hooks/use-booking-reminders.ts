'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'

export function useBookingReminders() {
  const { accountId } = useAuth()

  useEffect(() => {
    if (!accountId) return
    const notified = new Set<string>()

    const check = async () => {
      const supabase = createClient()
      const now = new Date()
      const in1h = new Date(now.getTime() + 60 * 60 * 1000)

      const { data } = await supabase
        .from('bookings')
        .select('id, title, start_time, contact_name')
        .eq('account_id', accountId)
        .eq('status', 'confirmed')
        .gte('start_time', now.toISOString())
        .lte('start_time', in1h.toISOString())

      for (const b of data ?? []) {
        if (notified.has(b.id)) continue
        notified.add(b.id)
        if (!('Notification' in window) || Notification.permission !== 'granted') continue
        const mins = Math.round((new Date(b.start_time).getTime() - Date.now()) / 60000)
        try {
          new Notification('Recordatorio de turno', {
            body: `${b.title || 'Turno'}${b.contact_name ? ' - ' + b.contact_name : ''} en ${mins} minutos`,
            icon: '/favicon.ico',
          })
        } catch {}
      }
    }

    check()
    const interval = setInterval(check, 60000)
    return () => clearInterval(interval)
  }, [accountId])
}
