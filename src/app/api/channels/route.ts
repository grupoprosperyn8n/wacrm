import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getCurrentAccount, requireRole, toErrorResponse } from '@/lib/auth/account'
import { supabaseAdmin } from '@/lib/automations/admin-client'

const VALID_CHANNEL_TYPES = ['whatsapp', 'telegram', 'facebook', 'instagram', 'web'] as const
type ChannelType = (typeof VALID_CHANNEL_TYPES)[number]

// ---------------------------------------------------------------------------
// GET /api/channels — list all channels for the current account (RLS-scoped)
// ---------------------------------------------------------------------------
export async function GET() {
  try {
    const { supabase } = await getCurrentAccount()
    const { data, error } = await supabase
      .from('channels')
      .select('*')
      .order('name', { ascending: true })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data: data ?? [] })
  } catch (err) {
    return toErrorResponse(err)
  }
}

// ---------------------------------------------------------------------------
// POST /api/channels — create a new channel (admin only)
// ---------------------------------------------------------------------------
export async function POST(request: NextRequest) {
  let ctx
  try {
    ctx = await requireRole('admin')
  } catch (err) {
    return toErrorResponse(err)
  }

  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })

  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const type = body.type as string | undefined
  const config = body.config ?? {}
  const is_active = body.is_active !== undefined ? Boolean(body.is_active) : true

  if (!name) {
    return NextResponse.json({ error: 'Field "name" is required' }, { status: 400 })
  }
  if (!VALID_CHANNEL_TYPES.includes(type as ChannelType)) {
    return NextResponse.json(
      { error: `Field "type" must be one of: ${VALID_CHANNEL_TYPES.join(', ')}` },
      { status: 400 },
    )
  }
  if (typeof config !== 'object' || config === null || Array.isArray(config)) {
    return NextResponse.json({ error: 'Field "config" must be a JSON object' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin()
    .from('channels')
    .insert({
      account_id: ctx.accountId,
      name,
      type,
      config,
      is_active,
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'An active channel of this type already exists. Set is_active=false on the existing one first.' },
        { status: 409 },
      )
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ data }, { status: 201 })
}
