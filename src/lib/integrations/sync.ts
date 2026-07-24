import type { SupabaseClient } from '@supabase/supabase-js'

interface SyncResult { products: number; orders: number }

export async function syncShopify(
  db: SupabaseClient,
  accountId: string,
  integrationId: string,
  config: Record<string, unknown>,
): Promise<SyncResult> {
  const shop = config.shop as string
  const token = config.access_token as string
  if (!shop || !token) throw new Error('Shopify: faltan credenciales')

  const base = `https://${shop}/admin/api/2024-01`

  // Sync products
  const prodRes = await fetch(`${base}/products.json?limit=250`, {
    headers: { 'X-Shopify-Access-Token': token },
  })
  if (!prodRes.ok) throw new Error(`Shopify API error: ${prodRes.status}`)
  const { products: shopifyProducts } = await prodRes.json()

  if (shopifyProducts?.length) {
    const rows = shopifyProducts.map((p: any) => ({
      account_id: accountId,
      integration_id: integrationId,
      platform_product_id: String(p.id),
      title: p.title,
      description: p.body_html?.replace(/<[^>]+>/g, '')?.slice(0, 2000) ?? '',
      price: parseFloat(p.variants?.[0]?.price ?? '0'),
      currency: p.variants?.[0]?.presentment_prices?.[0]?.currency_code ?? 'USD',
      image_url: p.images?.[0]?.src ?? null,
      product_url: `https://${shop}/products/${p.handle}`,
      stock: p.variants?.[0]?.inventory_quantity ?? 0,
      category: p.product_type ?? null,
      tags: p.tags?.split(',').map((t: string) => t.trim()).filter(Boolean) ?? [],
      synced_at: new Date().toISOString(),
    }))

    for (const row of rows) {
      await db.from('ecommerce_products').upsert(row, {
        onConflict: 'platform_product_id',
        ignoreDuplicates: false,
      })
    }
  }

  const ordRes = await fetch(`${base}/orders.json?limit=50&status=any`, {
    headers: { 'X-Shopify-Access-Token': token },
  })
  if (ordRes.ok) {
    const { orders: shopifyOrders } = await ordRes.json()
    if (shopifyOrders?.length) {
      const orderRows = shopifyOrders.map((o: any) => ({
        account_id: accountId,
        integration_id: integrationId,
        platform_order_id: String(o.id),
        customer_name: (o.customer?.firstName || '') + ' ' + (o.customer?.lastName || '') || o.customer?.email || '',
        customer_email: o.customer?.email ?? null,
        customer_phone: o.customer?.phone ?? null,
        total: parseFloat(o.totalPrice ?? '0'),
        currency: o.currency ?? 'USD',
        status: o.financialStatus ?? o.fulfillmentStatus ?? 'pending',
        items: o.lineItems?.map((li: any) => ({
          title: li.title, quantity: li.quantity, price: li.price, product_id: li.productId,
        })) ?? [],
        synced_at: new Date().toISOString(),
      }))
      for (const row of orderRows) {
        await db.from('ecommerce_orders').upsert(row, {
          onConflict: 'platform_order_id',
          ignoreDuplicates: false,
        })
      }
    }
  }

  return { products: shopifyProducts?.length ?? 0, orders: 0 }
}
