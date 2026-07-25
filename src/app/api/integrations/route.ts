import { NextResponse } from 'next/server'
import { requireRole, toErrorResponse } from '@/lib/auth/account'
import { supabaseAdmin } from '@/lib/automations/admin-client'
import type { IntegrationPlatform } from '@/lib/integrations/types'

// ============================================================
// GET /api/integrations — list all ecommerce integrations for
// the caller's account
// ============================================================
export async function GET() {
  let ctx
  try {
    ctx = await requireRole('admin')
  } catch (err) {
    return toErrorResponse(err)
  }

  const admin = supabaseAdmin()
  const { data, error } = await admin
    .from('ecommerce_integrations')
    .select('*')
    .eq('account_id', ctx.accountId)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ integrations: data ?? [] })
}

// ============================================================
// POST /api/integrations — create a new ecommerce integration
// ============================================================
export async function POST(request: Request) {
  let ctx
  try {
    ctx = await requireRole('admin')
  } catch (err) {
    return toErrorResponse(err)
  }

  const body = await request.json().catch(() => null)
  if (!body) {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { platform, name, config, enabled } = body

  if (!platform || !['shopify', 'mercadolibre', 'woocommerce', 'webhook'].includes(platform)) {
    return NextResponse.json(
      { error: 'platform must be one of: shopify, mercadolibre, woocommerce, webhook' },
      { status: 400 },
    )
  }

  if (!config || typeof config !== 'object') {
    return NextResponse.json(
      { error: 'config is required and must be an object' },
      { status: 400 },
    )
  }

  // Validate platform-specific config
  const configValidation = validatePlatformConfig(
    platform as IntegrationPlatform,
    config as Record<string, unknown>,
  )
  if (!configValidation.valid) {
    return NextResponse.json(
      { error: configValidation.error },
      { status: 400 },
    )
  }

  const admin = supabaseAdmin()
  const { data: integration, error: insertErr } = await admin
    .from('ecommerce_integrations')
    .insert({
      account_id: ctx.accountId,
      platform,
      name: name ?? '',
      config,
      enabled: enabled ?? true,
    })
    .select()
    .single()

  if (insertErr) {
    return NextResponse.json({ error: insertErr.message }, { status: 500 })
  }

  return NextResponse.json({ integration }, { status: 201 })
}

// ============================================================
// Config validation per platform
// ============================================================

function validatePlatformConfig(
  platform: IntegrationPlatform,
  config: Record<string, unknown>,
): { valid: boolean; error?: string } {
  switch (platform) {
    case 'shopify':
      if (!config.shop || typeof config.shop !== 'string') {
        return {
          valid: false,
          error: 'config.shop (string) is required for Shopify',
        }
      }
      if (!config.access_token || typeof config.access_token !== 'string') {
        return {
          valid: false,
          error: 'config.access_token (string) is required for Shopify',
        }
      }
      return { valid: true }

    case 'mercadolibre':
      if (!config.access_token || typeof config.access_token !== 'string') {
        return {
          valid: false,
          error: 'config.access_token (string) is required for MercadoLibre',
        }
      }
      return { valid: true }

    case 'woocommerce':
      if (!config.url || typeof config.url !== 'string') {
        return {
          valid: false,
          error: 'config.url (string) is required for WooCommerce',
        }
      }
      if (!config.consumer_key || typeof config.consumer_key !== 'string') {
        return {
          valid: false,
          error: 'config.consumer_key (string) is required for WooCommerce',
        }
      }
      if (!config.consumer_secret || typeof config.consumer_secret !== 'string') {
        return {
          valid: false,
          error: 'config.consumer_secret (string) is required for WooCommerce',
        }
      }
      return { valid: true }

    default:
      return { valid: false, error: `Unknown platform: ${platform}` }
  }
}
