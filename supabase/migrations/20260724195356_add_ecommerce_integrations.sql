-- Ecommerce integrations (Shopify, MercadoLibre, WooCommerce)
CREATE TABLE IF NOT EXISTS ecommerce_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('shopify', 'mercadolibre', 'woocommerce')),
  name TEXT NOT NULL DEFAULT '',
  config JSONB NOT NULL DEFAULT '{}',
  enabled BOOLEAN NOT NULL DEFAULT true,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_ecommerce_integrations_account ON ecommerce_integrations (account_id);

-- Products synced from ecommerce platforms
CREATE TABLE IF NOT EXISTS ecommerce_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  integration_id UUID REFERENCES ecommerce_integrations(id) ON DELETE CASCADE,
  platform_product_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  price NUMERIC(12,2),
  currency TEXT DEFAULT 'USD',
  image_url TEXT,
  product_url TEXT,
  stock INTEGER DEFAULT 0,
  category TEXT,
  tags TEXT[],
  metadata JSONB DEFAULT '{}',
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_ecommerce_products_account ON ecommerce_products (account_id);
CREATE INDEX idx_ecommerce_products_integration ON ecommerce_products (integration_id);

-- Orders from ecommerce platforms
CREATE TABLE IF NOT EXISTS ecommerce_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  integration_id UUID REFERENCES ecommerce_integrations(id) ON DELETE CASCADE,
  platform_order_id TEXT NOT NULL,
  customer_name TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  total NUMERIC(12,2),
  currency TEXT DEFAULT 'USD',
  status TEXT,
  items JSONB DEFAULT '[]',
  shipping_address JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_ecommerce_orders_account ON ecommerce_orders (account_id);
CREATE INDEX idx_ecommerce_orders_integration ON ecommerce_orders (integration_id);
