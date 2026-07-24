import { NextResponse } from 'next/server'
import { requireRole, toErrorResponse } from '@/lib/auth/account'
import { supabaseAdmin } from '@/lib/automations/admin-client'
import type { IntegrationPlatform } from '@/lib/integrations/types'

// ============================================================
// Helpers
// ============================================================

async function loadIntegration(id: string, accountId: string) {
  const admin = supabaseAdmin()
  const { data, error } = await admin
    .from('ecommerce_integrations')
    .select('*')
    .eq('id', id)
    .eq('account_id', accountId)
    .maybeSingle()

  if (error) {
    return { data: null, error: NextResponse.json({ error: error.message }, { status: 500 }) }
  }
  if (!data) {
    return { data: null, error: NextResponse.json({ error: 'Not found' }, { status: 404 }) }
  }
  return { data, error: null }
}

// ============================================================
// GET  /api/integrations/[id]
// shows the config values — store tokens encrypted at rest
// ============================================================
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await requireRole('admin')
    const { id } = await params
    const { data, error } = await loadIntegration(id, ctx.accountId)
    if (error) return error
    return NextResponse.json({ integration: data })
  } catch (err) {
    return toErrorResponse(err)
  }
}

// ============================================================
// PATCH /api/integrations/[id]
// Only allow mutating name, config, enabled.  When config is
// changed, re-validate against the stored platform.
// ============================================================
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await requireRole('admin')
    const { id } = await params

    // Ownership check
    const { data: existing, error } = await loadIntegration(id, ctx.accountId)
    if (error) return error

    const body = await request.json().catch(() => null)
    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const allowed = ['name', 'config', 'enabled'] as const
    const update: Record<string, unknown> = {}
    for (const key of allowed) {
      if (key in body) update[key] = body[key]
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    // Validate new config against the existing platform
    if ('config' in update && update.config) {
      const platform = existing.platform as IntegrationPlatform
      const { valid, error: valErr } = validateConfig(
        platform,
        update.config as Record<string, unknown>,
      )
      if (!valid) {
        return NextResponse.json({ error: valErr }, { status: 400 })
      }
    }

    const admin = supabaseAdmin()
    const { data: updated, error: updErr } = await admin
      .from('ecommerce_integrations')
      .update(update)
      .eq('id', id)
      .eq('account_id', ctx.accountId)
      .select()
      .single()

    if (updErr) {
      return NextResponse.json({ error: updErr.message }, { status: 500 })
    }

    return NextResponse.json({ integration: updated })
  } catch (err) {
    return toErrorResponse(err)
  }
}

// ============================================================
// DELETE /api/integrations/[id]
// ============================================================
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await requireRole('admin')
    const { id } = await params

    // Ownership check
    const { error: loadErr } = await loadIntegration(id, ctx.accountId)
    if (loadErr) return loadErr

    await supabaseAdmin()
      .from('ecommerce_integrations')
      .delete()
      .eq('id', id)
      .eq('account_id', ctx.accountId)

    return NextResponse.json({ ok: true })
  } catch (err) {
    return toErrorResponse(err)
  }
}

// ============================================================
// Config validation per platform (shared with route.ts)
// ============================================================

function validateConfig(
  platform: IntegrationPlatform,
  config: Record<string, unknown>,
): { valid: boolean; error?: string } {
  switch (platform) {
    case 'shopify':
      if (!config.shop || typeof config.shop !== 'string') {
        return { valid: false, error: 'config.shop (string) is required for Shopify' }
      }
      if (!config.access_token || typeof config.access_token !== 'string') {
        return { valid: false, error: 'config.access_token (string) is required for Shopify' }
      }
      return { valid: true }

    case 'mercadolibre':
      if (!config.access_token || typeof config.access_token !== 'string') {
        return { valid: false, error: 'config.access_token (string) is required for MercadoLibre' }
      }
      return { valid: true }

    case 'woocommerce':
      if (!config.url || typeof config.url !== 'string') {
        return { valid: false, error: 'config.url (string) is required for WooCommerce' }
      }
      if (!config.consumer_key || typeof config.consumer_key !== 'string') {
        return { valid: false, error: 'config.consumer_key (string) is required for WooCommerce' }
      }
      if (!config.consumer_secret || typeof config.consumer_secret !== 'string') {
        return { valid: false, error: 'config.consumer_secret (string) is required for WooCommerce' }
      }
      return { valid: true }

    default:
      return { valid: false, error: `Unknown platform: ${platform}` }
  }
}
