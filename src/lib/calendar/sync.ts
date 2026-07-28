import { supabaseAdmin } from '@/lib/automations/admin-client'

interface CalendarEvent {
  summary: string
  description?: string
  start: { dateTime: string; timeZone: string }
  end: { dateTime: string; timeZone: string }
  attendees?: { email: string }[]
}

/**
 * Obtiene tokens de Google Calendar vigentes para una cuenta.
 * Refresca el access_token si es necesario.
 */
async function getValidTokens(accountId: string): Promise<{
  accessToken: string
  refreshToken: string
  calendarId: string
} | null> {
  const db = supabaseAdmin()

  const { data: integration, error } = await db
    .from('calendar_integrations')
    .select('*')
    .eq('account_id', accountId)
    .eq('sync_enabled', true)
    .maybeSingle()

  if (error || !integration?.refresh_token) return null

  // Si el token expiro, refrescarlo
  if (integration.token_expires_at && new Date(integration.token_expires_at) < new Date()) {
    try {
      const refreshRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: process.env.GOOGLE_CLIENT_ID!,
          client_secret: process.env.GOOGLE_CLIENT_SECRET!,
          refresh_token: integration.refresh_token,
          grant_type: 'refresh_token',
        }),
      })

      const refreshData = await refreshRes.json()
      if (!refreshRes.ok) {
        console.error('[Calendar] Token refresh failed:', refreshData)
        return null
      }

      const newExpiry = new Date(Date.now() + refreshData.expires_in * 1000).toISOString()

      await db
        .from('calendar_integrations')
        .update({
          access_token: refreshData.access_token,
          token_expires_at: newExpiry,
          updated_at: new Date().toISOString(),
        })
        .eq('account_id', accountId)

      return {
        accessToken: refreshData.access_token,
        refreshToken: integration.refresh_token,
        calendarId: integration.calendar_id || 'primary',
      }
    } catch (err) {
      console.error('[Calendar] Error refreshing token:', err)
      return null
    }
  }

  return {
    accessToken: integration.access_token!,
    refreshToken: integration.refresh_token,
    calendarId: integration.calendar_id || 'primary',
  }
}

/**
 * Crea un evento en Google Calendar
 */
export async function createCalendarEvent(
  accountId: string,
  event: CalendarEvent,
): Promise<string | null> {
  const tokens = await getValidTokens(accountId)
  if (!tokens) return null

  try {
    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(tokens.calendarId)}/events`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${tokens.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          summary: event.summary,
          description: event.description,
          start: event.start,
          end: event.end,
          attendees: event.attendees,
        }),
      },
    )

    const data = await res.json()
    if (!res.ok) {
      console.error('[Calendar] Failed to create event:', data)
      return null
    }

    // Actualizar last_synced_at
    await supabaseAdmin()
      .from('calendar_integrations')
      .update({ last_synced_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('account_id', accountId)

    return data.id
  } catch (err) {
    console.error('[Calendar] Error creating event:', err)
    return null
  }
}

/**
 * Actualiza un evento existente en Google Calendar
 */
export async function updateCalendarEvent(
  accountId: string,
  googleEventId: string,
  event: CalendarEvent,
): Promise<boolean> {
  const tokens = await getValidTokens(accountId)
  if (!tokens) return false

  try {
    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(tokens.calendarId)}/events/${encodeURIComponent(googleEventId)}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${tokens.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          summary: event.summary,
          description: event.description,
          start: event.start,
          end: event.end,
          attendees: event.attendees,
        }),
      },
    )

    if (!res.ok) {
      const data = await res.json()
      console.error('[Calendar] Failed to update event:', data)
      return false
    }

    return true
  } catch (err) {
    console.error('[Calendar] Error updating event:', err)
    return false
  }
}

/**
 * Elimina un evento de Google Calendar
 */
export async function deleteCalendarEvent(
  accountId: string,
  googleEventId: string,
): Promise<boolean> {
  const tokens = await getValidTokens(accountId)
  if (!tokens) return false

  try {
    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(tokens.calendarId)}/events/${encodeURIComponent(googleEventId)}`,
      { method: 'DELETE', headers: { Authorization: `Bearer ${tokens.accessToken}` } },
    )

    if (!res.ok && res.status !== 410) {
      const data = await res.json()
      console.error('[Calendar] Failed to delete event:', data)
      return false
    }

    return true
  } catch (err) {
    console.error('[Calendar] Error deleting event:', err)
    return false
  }
}
