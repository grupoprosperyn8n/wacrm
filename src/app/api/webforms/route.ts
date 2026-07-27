import { NextResponse } from 'next/server'
import { getCurrentAccount, toErrorResponse } from '@/lib/auth/account'
import { supabaseAdmin } from '@/lib/automations/admin-client'

export async function GET() {
  try {
    const ctx = await getCurrentAccount()
    const { data } = await supabaseAdmin().from('webforms').select('*').eq('account_id', ctx.accountId).order('created_at', { ascending: false })
    return NextResponse.json({ webforms: data || [] })
  } catch (err) { return toErrorResponse(err) }
}

export async function POST(request: Request) {
  try {
    const ctx = await getCurrentAccount()
    const body = await request.json()
    const slug = body.slug || 'form-' + Date.now()
    const { data, error } = await supabaseAdmin().from('webforms').insert({
      account_id: ctx.accountId, name: body.name || 'Nuevo formulario', slug,
      fields: body.fields || [{ key: 'name', label: 'Nombre', type: 'text', required: true }, { key: 'phone', label: 'Telefono', type: 'phone', required: true }, { key: 'email', label: 'Email', type: 'email', required: false }],
      config: body.config || {},
      allowed_origins: body.allowed_origins || [],
      lead_pipeline_id: body.lead_pipeline_id || null,
      lead_stage_id: body.lead_stage_id || null,
    }).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch (err) { return toErrorResponse(err) }
}
