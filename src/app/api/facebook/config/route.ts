import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireRole, toErrorResponse } from '@/lib/auth/account'

export async function GET() {
  try { await requireRole('agent') } catch (err) { return toErrorResponse(err) }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('account_id').eq('user_id', user.id).single()
  if (!profile) return NextResponse.json({ error: 'No account' }, { status: 404 })
  const { data } = await supabase.from('channels').select('config, is_active').eq('account_id', profile.account_id).eq('type', 'facebook').maybeSingle()
  return NextResponse.json(data ?? {})
}

export async function POST(request: Request) {
  try { await requireRole('agent') } catch (err) { return toErrorResponse(err) }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('account_id').eq('user_id', user.id).single()
  if (!profile) return NextResponse.json({ error: 'No account' }, { status: 404 })
  const body = await request.json()
  const { data, error } = await supabase.from('channels').upsert({
    account_id: profile.account_id,
    type: 'facebook',
    config: body.config,
    is_active: body.is_active ?? true,
  }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
