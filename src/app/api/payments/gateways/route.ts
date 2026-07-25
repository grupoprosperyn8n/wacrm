import { NextResponse } from 'next/server'
import { getCurrentAccount, requireRole, toErrorResponse } from '@/lib/auth/account'
import { supabaseAdmin } from '@/lib/automations/admin-client'

const VALID = ['mercadopago', 'stripe', 'paypal', 'custom']

export async function GET() {
  try { const { supabase, accountId } = await getCurrentAccount()
    const { data } = await supabase.from('payment_gateways').select('*').eq('account_id', accountId).order('created_at', { ascending: false })
    return NextResponse.json({ gateways: data ?? [] })
  } catch (err) { return toErrorResponse(err) }
}

export async function POST(request: Request) {
  try {
    const ctx = await requireRole('admin')
    const b = await request.json()
    if (!VALID.includes(b.platform)) return NextResponse.json({ error: 'plataforma no valida' }, { status: 400 })
    const admin = supabaseAdmin()
    const { data, error } = await admin.from('payment_gateways').insert({
      account_id: ctx.accountId, platform: b.platform, name: b.name || b.platform, config: b.config || {},
    }).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ gateway: data }, { status: 201 })
  } catch (err) { return toErrorResponse(err) }
}
