import { NextResponse } from 'next/server'
import { getCurrentAccount, requireRole, toErrorResponse } from '@/lib/auth/account'
import { supabaseAdmin } from '@/lib/automations/admin-client'
import { dispatchEntityEvent } from '@/lib/webhooks/dispatch'

export async function GET() {
  try {
    const { supabase, accountId } = await getCurrentAccount()
    const { data } = await supabase.from('bookings').select('*, contact:contacts(name, phone)').eq('account_id', accountId).order('start_time', { ascending: true })
    return NextResponse.json({ bookings: data ?? [] })
  } catch (err) { return toErrorResponse(err) }
}

export async function POST(request: Request) {
  try {
    const ctx = await requireRole('agent')
    const b = await request.json()
    if (!b.start_time || !b.title) return NextResponse.json({ error: 'start_time y title requeridos' }, { status: 400 })
    const admin = supabaseAdmin()
    const { data, error } = await admin.from('bookings').insert({
      account_id: ctx.accountId, title: b.title, description: b.description, start_time: b.start_time,
      end_time: b.end_time, contact_name: b.contact_name, contact_email: b.contact_email, contact_phone: b.contact_phone,
      status: b.status || 'pending', source: b.source || 'internal',
    }).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    dispatchEntityEvent(ctx.accountId, 'booking', 'created', data).catch(()=>{})
    return NextResponse.json({ booking: data }, { status: 201 })
  } catch (err) { return toErrorResponse(err) }
}
