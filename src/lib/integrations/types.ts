export type IntegrationPlatform = 'shopify' | 'mercadolibre' | 'woocommerce'

export interface IntegrationConfig {
  id: string
  account_id: string
  platform: IntegrationPlatform
  name: string
  config: Record<string, unknown>
  enabled: boolean
  last_synced_at: string | null
  created_at: string
}

export interface EcommerceProduct {
  id: string
  account_id: string
  integration_id: string
  platform_product_id: string
  title: string
  description: string | null
  price: number | null
  currency: string
  image_url: string | null
  product_url: string | null
  stock: number
  category: string | null
  synced_at: string
}

export interface EcommerceOrder {
  id: string
  account_id: string
  integration_id: string
  platform_order_id: string
  customer_name: string | null
  customer_email: string | null
  total: number | null
  currency: string
  status: string | null
  items: unknown[]
  synced_at: string
}
