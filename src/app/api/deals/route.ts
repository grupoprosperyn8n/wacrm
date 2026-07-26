import { NextResponse } from 'next/server'
import { getCurrentAccount, toErrorResponse } from '@/lib/auth/account'
import { supabaseAdmin } from '@/lib/automations/admin-client'
import { dispatchEntityEvent } from '@/lib/webhooks/dispatch'

export async function GET(request: Request) {
  try {
    const ctx = await getCurrentAccount()
    const url = new URL(request.url)
    const status = url.searchParams.get('status')
    const pipelineId = url.searchParams.get('pipeline_id')
    const contactId = url.searchParams.get('contact_id')

    let query = supabaseAdmin().from('deals').select('*, pipeline:pipeline_id(*), stage:stage_id(*)').eq('account_id', ctx.accountId)
    if (status) query = query.eq('status', status)
    if (pipelineId) query = query.eq('pipeline_id', pipelineId)
    if (contactId) query = query.eq('contact_id', contactId)
    query = query.order('created_at', { ascending: false }).limit(100)

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ deals: data || [] })
  } catch (err) { return toErrorResponse(err) }
}

export async function POST(request: Request) {
  try {
    const ctx = await getCurrentAccount()
    const body = await request.json()
    const { data: { user } } = await supabaseAdmin().auth.getUser()
    const { data, error } = await supabaseAdmin().from('deals').insert({
      account_id: ctx.accountId,
      user_id: user?.id,
      title: body.title || 'Sin titulo',
      value: body.value || 0,
      currency: body.currency || 'USD',
      contact_id: body.contact_id || null,
      pipeline_id: body.pipeline_id || null,
      stage_id: body.stage_id || null,
      assigned_to: body.assigned_to || null,
      notes: body.notes || null,
      expected_close_date: body.expected_close_date || null,
      status: 'open',
    }).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    dispatchEntityEvent(ctx.accountId, 'deal', 'created', data).catch(() => {})
    return NextResponse.json(data)
  } catch (err) { return toErrorResponse(err) }
}
