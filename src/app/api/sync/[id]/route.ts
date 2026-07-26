import { NextResponse } from 'next/server'
import { getCurrentAccount, toErrorResponse } from '@/lib/auth/account'
import { supabaseAdmin } from '@/lib/automations/admin-client'
import { testConnection, runSync, getConnectorConfig } from '@/lib/sync/engine'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await getCurrentAccount()
    const { id } = await params
    const body = await request.json()
    const { error } = await supabaseAdmin().from('sync_integrations')
      .update(body).eq('id', id).eq('account_id', ctx.accountId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (err) { return toErrorResponse(err) }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await getCurrentAccount()
    const { id } = await params
    await supabaseAdmin().from('sync_integrations').delete().eq('id', id).eq('account_id', ctx.accountId)
    return NextResponse.json({ ok: true })
  } catch (err) { return toErrorResponse(err) }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await getCurrentAccount()
    const { id } = await params
    const url = new URL(request.url)
    const action = url.searchParams.get('action') || 'sync'
    const cfg = await getConnectorConfig(id)
    if (!cfg || cfg.accountId !== ctx.accountId) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    switch (action) {
      case 'test': return NextResponse.json(await testConnection(id))
      case 'push': return NextResponse.json(await runSync(id, 'push'))
      case 'pull': return NextResponse.json(await runSync(id, 'pull'))
      default: return NextResponse.json(await runSync(id, 'bidirectional'))
    }
  } catch (err) { return toErrorResponse(err) }
}
