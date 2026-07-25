'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'

export function usePushNotifications() {
  const { profile } = useAuth()

  useEffect(() => {
    if (!('Notification' in window)) return
    if (Notification.permission === 'default') Notification.requestPermission()
    if (Notification.permission !== 'granted') return

    const supabase = createClient()
    const channel = supabase.channel('push-notifications')
    
    channel.on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'messages',
      filter: 'sender_type=eq.customer',
    }, (payload: any) => {
      const msg = payload.new
      if (!msg?.content_text || !document.hidden) return
      
      // Get account-specific notification prefs
      const prefs = JSON.parse(localStorage.getItem('notif_prefs') || '{}')
      if (prefs.notify_message_received === false) return

      const title = 'Nuevo mensaje'
      const body = msg.content_text.slice(0, 120)
      const tag = 'msg-' + msg.id
      
      // Don't notify if already showing
      if (tag && document.querySelector(`[data-notif-tag="${tag}"]`)) return

      try {
        const n = new Notification(title, {
          body, tag, icon: '/favicon.ico',
          data: { conversationId: msg.conversation_id },
        })
        n.onclick = () => {
          window.focus()
          window.location.href = '/inbox?c=' + msg.conversation_id
        }
      } catch {}
    })

    channel.subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [profile?.id])
}