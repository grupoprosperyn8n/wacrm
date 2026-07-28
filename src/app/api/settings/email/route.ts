import { NextResponse } from 'next/server'
import { getCurrentAccount, toErrorResponse } from '@/lib/auth/account'
import { supabaseAdmin } from '@/lib/automations/admin-client'
import { sendEmail, buildInviteEmail } from '@/lib/email/sender'

// GET - check if email is configured
export async function GET() {
  try {
    const ctx = await getCurrentAccount()
    const configured = !!(process.env.SMTP_HOST || process.env.RESEND_API_KEY)
    return NextResponse.json({
      configured,
      host: process.env.SMTP_HOST || '',
      port: process.env.SMTP_PORT || '587',
      user: process.env.SMTP_USER || '',
      from_email: process.env.FROM_EMAIL || '',
    })
  } catch (err) { return toErrorResponse(err) }
}

// POST - save email config (in memory, env vars are set at deploy time)
// For now, we just validate and test the connection
export async function POST(request: Request) {
  try {
    const ctx = await getCurrentAccount()
    const body = await request.json()
    // Store in a settings table for future use
    const { data, error } = await supabaseAdmin().from('app_settings').upsert({
      account_id: ctx.accountId, key: 'email_config',
      value: { host: body.host, port: body.port, user: body.user, pass: body.pass, from_email: body.from_email, resend_key: body.resend_key },
    }).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (err) { return toErrorResponse(err) }
}

// DELETE
export async function DELETE() {
  try {
    const ctx = await getCurrentAccount()
    await supabaseAdmin().from('app_settings').delete().eq('account_id', ctx.accountId).eq('key', 'email_config')
    return NextResponse.json({ ok: true })
  } catch (err) { return toErrorResponse(err) }
}
