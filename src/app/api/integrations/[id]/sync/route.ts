import { NextResponse } from 'next/server'
import { requireRole, toErrorResponse } from '@/lib/auth/account'
import { supabaseAdmin } from '@/lib/automations/admin-client'
import { syncShopify } from '@/lib/integrations/sync'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await requireRole('admin')
    const { id } = await params
    const admin = supabaseAdmin()

    const { data: integration, error: loadErr } = await admin
      .from('ecommerce_integrations')
      .select('*')
      .eq('id', id)
      .eq('account_id', ctx.accountId)
      .maybeSingle()

    if (loadErr) return NextResponse.json({ error: loadErr.message }, { status: 500 })
    if (!integration) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    let result: { products: number; orders: number }
    switch (integration.platform) {
      case 'shopify':
        result = await syncShopify(admin, ctx.accountId, id, integration.config as Record<string, unknown>)
        break
      default:
        return NextResponse.json({ error: 'Sync no implementada para ' + integration.platform }, { status: 400 })
    }

    await admin.from('ecommerce_integrations').update({ last_synced_at: new Date().toISOString() }).eq('id', id)

    return NextResponse.json({
      synced: true,
      products: result.products,
      platform: integration.platform,
      last_synced_at: new Date().toISOString(),
    })
  } catch (err) {
    return toErrorResponse(err)
  }
}
