import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/automations/admin-client'

/**
 * GET /api/calendar/auth/callback
 * Callback OAuth de Google. Intercambia el codigo por tokens
 * y los guarda en la base de datos.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')
  const state = searchParams.get('state') // account_id opcional

  if (error) {
    console.error('[Calendar Auth] Google error:', error)
    return NextResponse.redirect(
      new URL('/settings?tab=calendar&error=google_denied', req.url),
    )
  }

  if (!code) {
    return NextResponse.redirect(
      new URL('/settings?tab=calendar&error=no_code', req.url),
    )
  }

  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const redirectUri = process.env.GOOGLE_REDIRECT_URI

  if (!clientId || !clientSecret || !redirectUri) {
    return NextResponse.json(
      { error: 'Google OAuth env vars missing' },
      { status: 500 },
    )
  }

  try {
    // Intercambiar codigo por tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    })

    const tokenData = await tokenRes.json()

    if (!tokenRes.ok) {
      console.error('[Calendar Auth] Token exchange failed:', tokenData)
      return NextResponse.redirect(
        new URL('/settings?tab=calendar&error=token_exchange', req.url),
      )
    }

    // Obtener informacion del usuario (email)
    const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    })
    const userInfo = await userInfoRes.json()

    // Si tenemos un state con account_id, usarlo. Sino, buscar el account
    // via la sesion del usuario (requiere cookie de sesion de Supabase)
    let accountId: string | null = null

    if (state) {
      accountId = state
    }

    if (!accountId) {
      // Intentar obtener el account_id del usuario autenticado
      const authHeader = req.headers.get('authorization')
      // Fallback: si no podemos determinar la cuenta, redirigir a settings
      return NextResponse.redirect(
        new URL('/settings?tab=calendar&error=no_account', req.url),
      )
    }

    // Guardar/actualizar integracion
    const db = supabaseAdmin()
    const expiresAt = new Date(Date.now() + (tokenData.expires_in || 3600) * 1000).toISOString()

    const payload = {
      account_id: accountId,
      google_email: userInfo.email,
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      token_expires_at: expiresAt,
      sync_enabled: true,
      updated_at: new Date().toISOString(),
    }

    const { error: upsertError } = await db
      .from('calendar_integrations')
      .upsert(payload, { onConflict: 'account_id' })

    if (upsertError) {
      console.error('[Calendar Auth] DB upsert failed:', upsertError)
      return NextResponse.redirect(
        new URL('/settings?tab=calendar&error=db_error', req.url),
      )
    }

    return NextResponse.redirect(new URL('/settings?tab=calendar&success=true', req.url))
  } catch (err) {
    console.error('[Calendar Auth] Error:', err)
    return NextResponse.redirect(
      new URL('/settings?tab=calendar&error=unexpected', req.url),
    )
  }
}
