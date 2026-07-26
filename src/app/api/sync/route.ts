import { NextResponse } from 'next/server'
import { getCurrentAccount, requireRole, toErrorResponse } from '@/lib/auth/account'
import { supabaseAdmin } from '@/lib/automations/admin-client'

// GET /api/sync - list sync integrations
export async function GET() {
  try {
    const ctx = await getCurrentAccount()
    const { data } = await supabaseAdmin().from('sync_integrations')
      .select('*').eq('account_id', ctx.accountId).order('created_at', { ascending: false })
    return NextResponse.json({ integrations: data || [] })
  } catch (err) { return toErrorResponse(err) }
}

// POST /api/sync - create integration
export async function POST(request: Request) {
  try {
    const ctx = await getCurrentAccount()
    const body = await request.json()
    const { data, error } = await supabaseAdmin().from('sync_integrations').insert({
      account_id: ctx.accountId,
      connector_type: body.connector_type,
      name: body.name || body.connector_type,
      config: body.config || {},
      field_mappings: body.field_mappings || [],
      entity_types: body.entity_types || ['contact', 'product', 'task'],
      enabled: true,
      sync_frequency: body.sync_frequency || 'manual',
    }).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch (err) { return toErrorResponse(err) }
}
