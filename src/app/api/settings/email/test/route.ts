import { NextResponse } from 'next/server'
import { sendEmail, buildInviteEmail } from '@/lib/email/sender'
import { getCurrentAccount, toErrorResponse } from '@/lib/auth/account'

export async function POST(request: Request) {
  try {
    const ctx = await getCurrentAccount()
    const body = await request.json()
    if (!body.to) return NextResponse.json({ error: 'Email requerido' }, { status: 400 })
    const email = buildInviteEmail('Test', 'wacrm', 'Admin', 'https://wacrm.sistemasagenticos.cloud')
    const result = await sendEmail({ to: body.to, subject: email.subject, html: email.html, text: email.text })
    if (result.success) return NextResponse.json({ ok: true })
    return NextResponse.json({ error: result.error || 'Error al enviar' }, { status: 500 })
  } catch (err) { return toErrorResponse(err) }
}
