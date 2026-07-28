// Email sender utility for wacrm
// Uses Resend (free tier: 100 emails/day) or SMTP as fallback

const RESEND_API = 'https://api.resend.com/emails'

interface EmailParams {
  to: string
  subject: string
  html: string
  text?: string
}

export async function sendEmail(params: EmailParams): Promise<{ success: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY
  const fromEmail = process.env.FROM_EMAIL || 'noreply@wacrm.app'

  if (apiKey) {
    // Send via Resend
    try {
      const res = await fetch(RESEND_API, {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: fromEmail, to: params.to, subject: params.subject, html: params.html, text: params.text || '' }),
      })
      if (res.ok) return { success: true }
      const d = await res.json().catch(() => ({}))
      return { success: false, error: d.message || 'Resend error: ' + res.status }
    } catch (e) { return { success: false, error: String(e) } }
  }

  // If SMTP is configured, use it
  const smtpHost = process.env.SMTP_HOST
  if (smtpHost) {
    try {
      const res = await fetch(smtpHost, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: params.to, subject: params.subject, html: params.html,
          text: params.text, from: process.env.FROM_EMAIL || 'noreply@wacrm.app',
          smtp_user: process.env.SMTP_USER, smtp_pass: process.env.SMTP_PASS,
          smtp_port: process.env.SMTP_PORT || '587',
        }),
      })
      if (res.ok) return { success: true }
    } catch {}
  }

  return { success: false, error: 'No email provider configured. Set RESEND_API_KEY or SMTP_HOST.' }
}

export function buildInviteEmail(inviterName: string, accountName: string, role: string, inviteUrl: string): { subject: string; html: string; text: string } {
  const subject = inviterName + ' te invitó a ' + accountName
  const text = 'Hola,\n\n' + inviterName + ' te invitó a unirte a ' + accountName + ' como ' + role + '.\n\nHace clic en este enlace para aceptar:\n' + inviteUrl + '\n\nEl enlace es válido por unos días. Si no esperabas esta invitación, ignorá este mensaje.'
  const html = '<p>Hola,</p><p><strong>' + inviterName + '</strong> te invitó a unirte a <strong>' + accountName + '</strong> como <strong>' + role + '</strong>.</p><p><a href="' + inviteUrl + '" style="display:inline-block;padding:12px 24px;background:#7c3aed;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">Aceptar invitación</a></p><p style="color:#888;font-size:12px;">El enlace es válido por unos días. Si no esperabas esta invitación, ignorá este mensaje.</p>'
  return { subject, html, text }
}
