// Email sender utility for wacrm
// Checks env vars first (Coolify), then falls back to DB config (Settings UI)
// Supports: Resend API, SMTP (nodemailer)

import nodemailer from 'nodemailer'
import { supabaseAdmin } from '@/lib/automations/admin-client'

const RESEND_API = 'https://api.resend.com/emails'

export interface EmailParams {
  to: string
  subject: string
  html: string
  text?: string
}

interface EmailConfig {
  host?: string
  port?: number
  user?: string
  pass?: string
  from_email?: string
  resend_key?: string
}

async function loadDbConfig(accountId?: string): Promise<EmailConfig> {
  if (!accountId) return {}
  try {
    const db = supabaseAdmin()
    const { data } = await db.from('app_settings').select('value').eq('key', 'email_config').single()
    if (data?.value) return data.value as EmailConfig
  } catch {}
  return {}
}

export async function sendEmail(params: EmailParams, accountId?: string): Promise<{ success: boolean; error?: string }> {
  // Priority 1: Resend API key from env (Coolify)
  const envResendKey = process.env.RESEND_API_KEY
  if (envResendKey) {
    try {
      const from = process.env.FROM_EMAIL || 'noreply@wacrm.app'
      const res = await fetch(RESEND_API, {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + envResendKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, to: params.to, subject: params.subject, html: params.html, text: params.text || '' }),
      })
      if (res.ok) return { success: true }
    } catch {}
  }

  // Priority 2: SMTP from env (Coolify)
  const envSmtpHost = process.env.SMTP_HOST
  if (envSmtpHost) {
    try {
      const transporter = nodemailer.createTransport({
        host: envSmtpHost,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_PORT === '465',
        auth: { user: process.env.SMTP_USER || '', pass: process.env.SMTP_PASS || '' },
      })
      await transporter.sendMail({
        from: process.env.FROM_EMAIL || 'noreply@wacrm.app',
        to: params.to, subject: params.subject, html: params.html, text: params.text,
      })
      return { success: true }
    } catch (e) { return { success: false, error: String(e) } }
  }

  // Priority 3: DB config (from Settings UI)
  const dbConfig = await loadDbConfig(accountId)
  if (dbConfig.resend_key) {
    try {
      const from = dbConfig.from_email || 'noreply@wacrm.app'
      const res = await fetch(RESEND_API, {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + dbConfig.resend_key, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, to: params.to, subject: params.subject, html: params.html, text: params.text || '' }),
      })
      if (res.ok) return { success: true }
    } catch {}
  }

  if (dbConfig.host) {
    try {
      const transporter = nodemailer.createTransport({
        host: dbConfig.host,
        port: dbConfig.port || 587,
        secure: dbConfig.port === 465,
        auth: { user: dbConfig.user || '', pass: dbConfig.pass || '' },
      })
      await transporter.sendMail({
        from: dbConfig.from_email || 'noreply@wacrm.app',
        to: params.to, subject: params.subject, html: params.html, text: params.text,
      })
      return { success: true }
    } catch (e) { return { success: false, error: String(e) } }
  }

  return { success: false, error: 'No email provider configured. Configure SMTP in Settings > Email or set SMTP_HOST/RESEND_API_KEY in Coolify env vars.' }
}

export function buildInviteEmail(inviterName: string, accountName: string, role: string, inviteUrl: string): { subject: string; html: string; text: string } {
  const subject = inviterName + ' te invitó a ' + accountName
  const text = 'Hola,\n\n' + inviterName + ' te invitó a unirte a ' + accountName + ' como ' + role + '.\n\nHace clic en este enlace para aceptar:\n' + inviteUrl + '\n\nEl enlace es válido por unos días. Si no esperabas esta invitación, ignorá este mensaje.'
  const html = '<p>Hola,</p><p><strong>' + inviterName + '</strong> te invitó a unirte a <strong>' + accountName + '</strong> como <strong>' + role + '</strong>.</p><p><a href="' + inviteUrl + '" style="display:inline-block;padding:12px 24px;background:#7c3aed;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">Aceptar invitación</a></p><p style="color:#888;font-size:12px;">El enlace es válido por unos días. Si no esperabas esta invitación, ignorá este mensaje.</p>'
  return { subject, html, text }
}
