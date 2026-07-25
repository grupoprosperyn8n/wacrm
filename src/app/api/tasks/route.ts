import { NextResponse } from 'next/server'
import { getCurrentAccount, requireRole, toErrorResponse } from '@/lib/auth/account'
import { supabaseAdmin } from '@/lib/automations/admin-client'
import { dispatchEntityEvent } from '@/lib/webhooks/dispatch'

export async function GET() {
  try {
    const { supabase, accountId } = await getCurrentAccount()
    const { data } = await supabase.from('tasks').select('*, assigned_to_user:auth.users!assigned_to(email)').eq('account_id', accountId).order('created_at', { ascending: false })
    return NextResponse.json({ tasks: data ?? [] })
  } catch (err) { return toErrorResponse(err) }
}

export async function POST(request: Request) {
  try {
    const ctx = await requireRole('agent')
    const b = await request.json()
    if (!b.title) return NextResponse.json({ error: 'title requerido' }, { status: 400 })
    const admin = supabaseAdmin()
    const { data, error } = await admin.from('tasks').insert({
      account_id: ctx.accountId, created_by: ctx.userId, title: b.title,
      description: b.description, priority: b.priority || 'medium',
      due_date: b.due_date || null, assigned_to: b.assigned_to || null,
      related_to_type: b.related_to_type, related_to_id: b.related_to_id,
    }).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    dispatchEntityEvent(ctx.accountId, 'task', 'created', data).catch(()=>{})
    return NextResponse.json({ task: data }, { status: 201 })
  } catch (err) { return toErrorResponse(err) }
}
