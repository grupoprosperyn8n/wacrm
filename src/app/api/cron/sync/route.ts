import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/automations/admin-client'
import { runSync } from '@/lib/sync/engine'

// GET /api/cron/sync - triggered by cron job
export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const mode = url.searchParams.get('mode') || 'hourly'
    const authKey = url.searchParams.get('key')
    const CRON_KEY = process.env.CRON_SECRET_KEY || 'wacrm-sync-cron'

    if (authKey !== CRON_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const db = supabaseAdmin()
    const { data: integrations } = await db
      .from('sync_integrations')
      .select('*')
      .eq('enabled', true)
      .eq('sync_frequency', mode)

    if (!integrations?.length) {
      return NextResponse.json({ ok: true, message: 'No integrations to sync' })
    }

    const results = []
    for (const integration of integrations) {
      try {
        const result = await runSync(integration.id, 'bidirectional')
        results.push({ id: integration.id, connector: integration.connector_type, status: result.success ? 'completed' : 'partial', records: result.recordsSucceeded + '/' + result.recordsProcessed })
      } catch (e) {
        results.push({ id: integration.id, connector: integration.connector_type, status: 'error', error: String(e) })
      }
    }

    return NextResponse.json({ ok: true, mode, processed: results.length, results })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
