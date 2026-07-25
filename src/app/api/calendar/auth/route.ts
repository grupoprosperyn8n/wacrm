import { NextResponse } from 'next/server'
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || ''
export async function GET() {
  if (!CLIENT_ID) return NextResponse.json({ error: 'Google Calendar no configurado', instructions: 'Configurar GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET en el servidor' })
  const redirect = process.env.NEXT_PUBLIC_APP_URL + '/api/calendar/callback'
  const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${CLIENT_ID}&redirect_uri=${redirect}&response_type=code&scope=https://www.googleapis.com/auth/calendar.events&access_type=offline`
  return NextResponse.redirect(url)
}
