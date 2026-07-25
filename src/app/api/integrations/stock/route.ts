import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/flows/admin-client'
import { getCurrentAccount, toErrorResponse } from '@/lib/auth/account'

export async function POST(request: Request) {
  try {
    const ctx = await getCurrentAccount()
    const body = await request.json()
    const updates = Array.isArray(body) ? body : [body]
    let updated = 0

    const db = supabaseAdmin()
    for (const item of updates) {
      const productId = item.platform_product_id || item.id
      const stock = parseInt(item.stock ?? item.quantity ?? '0')
      if (!productId) continue

      const { error } = await db.from('ecommerce_products')
        .update({ stock, synced_at: new Date().toISOString() })
        .eq('platform_product_id', String(productId))
        .eq('account_id', ctx.accountId)
      if (!error) updated++
    }

    return NextResponse.json({ ok: true, updated })
  } catch (err) { return toErrorResponse(err) }
}
