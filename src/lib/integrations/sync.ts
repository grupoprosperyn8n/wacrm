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

  // Auto-create ecommerce pipeline
  const { ensureEcommercePipeline } = await import('./pipeline')
  await ensureEcommercePipeline(db, accountId)

  return { products: shopifyProducts?.length ?? 0, orders: 0 }
}

export async function syncMercadoLibre(
  db: SupabaseClient,
  accountId: string,
  integrationId: string,
  config: Record<string, unknown>,
): Promise<SyncResult> {
  const token = config.access_token as string
  const userId = config.user_id as string
  if (!token) throw new Error('MercadoLibre: falta access_token')

  // Get user's items
  const searchUrl = userId
    ? `https://api.mercadolibre.com/users/${userId}/items/search?limit=100`
    : 'https://api.mercadolibre.com/users/me/items/search?limit=100'

  const searchRes = await fetch(searchUrl, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!searchRes.ok) throw new Error(`MercadoLibre API error: ${searchRes.status}`)
  const searchData = await searchRes.json()
  const itemIds: string[] = searchData.results ?? []

  // Fetch details for each item
  let productsSynced = 0
  for (let i = 0; i < itemIds.length; i += 20) {
    const batch = itemIds.slice(i, i + 20)
    const detailRes = await fetch(`https://api.mercadolibre.com/items?ids=${batch.join(',')}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!detailRes.ok) continue
    const details = await detailRes.json()
    for (const item of details) {
      const body = item.body ?? item
      if (!body.id) continue
      await db.from('ecommerce_products').upsert({
        account_id: accountId,
        integration_id: integrationId,
        platform_product_id: body.id,
        title: body.title ?? '',
        description: body.description?.plain_text ?? body.title ?? '',
        price: body.price ?? 0,
        currency: body.currency_id ?? 'ARS',
        image_url: body.pictures?.[0]?.url ?? body.thumbnail ?? null,
        product_url: body.permalink ?? null,
        stock: body.available_quantity ?? 0,
        category: body.category_id ?? null,
        synced_at: new Date().toISOString(),
      }, { onConflict: 'platform_product_id', ignoreDuplicates: false })
      productsSynced++
    }
  }
  const { ensureEcommercePipeline } = await import('./pipeline')
  await ensureEcommercePipeline(db, accountId)
  return { products: productsSynced, orders: 0 }
}

export async function syncWooCommerce(
  db: SupabaseClient,
  accountId: string,
  integrationId: string,
  config: Record<string, unknown>,
): Promise<SyncResult> {
  const url = config.url as string
  const consumerKey = config.consumer_key as string
  const consumerSecret = config.consumer_secret as string
  if (!url || !consumerKey || !consumerSecret) throw new Error('WooCommerce: faltan credenciales')

  const base = url.replace(/\/+$/, '')
  const auth = btoa(`${consumerKey}:${consumerSecret}`)

  // Fetch products
  const prodRes = await fetch(`${base}/wp-json/wc/v3/products?per_page=100`, {
    headers: { Authorization: `Basic ${auth}` },
  })
  if (!prodRes.ok) throw new Error(`WooCommerce API error: ${prodRes.status}`)
  const products = await prodRes.json()

  for (const p of products) {
    await db.from('ecommerce_products').upsert({
      account_id: accountId,
      integration_id: integrationId,
      platform_product_id: String(p.id),
      title: p.name ?? '',
      description: p.description?.replace(/<[^>]+>/g, '')?.slice(0, 2000) ?? '',
      price: parseFloat(p.price ?? '0'),
      currency: p.currency ?? 'USD',
      image_url: p.images?.[0]?.src ?? null,
      product_url: p.permalink ?? null,
      stock: p.stock_quantity ?? 0,
      category: p.categories?.[0]?.name ?? null,
      tags: p.tags?.map((t: any) => t.name) ?? [],
      synced_at: new Date().toISOString(),
    }, { onConflict: 'platform_product_id', ignoreDuplicates: false })
  }

  const { ensureEcommercePipeline } = await import('./pipeline')
  await ensureEcommercePipeline(db, accountId)
  return { products: products.length ?? 0, orders: 0 }
}
