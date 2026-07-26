// Sync engine - orchestrates bidirectional data sync with external systems
import { createClient } from '@supabase/supabase-js'
import { AirtableConnector } from './connectors/airtable'
import { PostgresConnector } from './connectors/postgres'
import { FastApiConnector } from './connectors/fastapi'
import { N8nConnector } from './connectors/n8n'
import { GoogleSheetsConnector } from './connectors/sheets'
import { supabaseAdmin } from '@/lib/automations/admin-client'
import type { SyncIntegration, ConnectorType, EntityType, SyncResult, ConnectorInterface, ConnectorConfig } from './types'

export function getConnector(type: ConnectorType): ConnectorInterface {
  switch (type) {
    case 'airtable': return new AirtableConnector()
    case 'postgres':
    case 'supabase': return new PostgresConnector()
    case 'fastapi': return new FastApiConnector()
    case 'n8n': return new N8nConnector()
    case 'googlesheets': return new GoogleSheetsConnector()
    case 'csv':
    case 'excel': return new GoogleSheetsConnector() // Reuse sheets logic for CSV/Excel via API
    default: throw new Error(`Unknown connector type: ${type}`)
  }
}

export async function getConnectorConfig(integrationId: string): Promise<ConnectorConfig | null> {
  const db = supabaseAdmin()
  const { data } = await db.from('sync_integrations').select('*').eq('id', integrationId).single()
  if (!data) return null
  return {
    id: data.id,
    accountId: data.account_id,
    config: data.config,
    fieldMappings: data.field_mappings || [],
    entityTypes: data.entity_types || [],
  }
}

export async function testConnection(integrationId: string): Promise<{ success: boolean; message: string }> {
  const cfg = await getConnectorConfig(integrationId)
  if (!cfg) return { success: false, message: 'Integracion no encontrada' }
  const connector = getConnector(cfg.config.connector_type as ConnectorType)
  return connector.testConnection(cfg.config)
}

export async function runSync(integrationId: string, direction: 'push' | 'pull' | 'bidirectional'): Promise<SyncResult> {
  const cfg = await getConnectorConfig(integrationId)
  if (!cfg) return { success: false, recordsProcessed: 0, recordsSucceeded: 0, recordsFailed: 0, errors: ['Integracion no encontrada'] }

  const db = supabaseAdmin()
  const connector = getConnector((await db.from('sync_integrations').select('connector_type').eq('id', integrationId).single()).data?.connector_type as ConnectorType)
  const overall: SyncResult = { success: true, recordsProcessed: 0, recordsSucceeded: 0, recordsFailed: 0, errors: [] }

  // Update status to syncing
  await db.from('sync_integrations').update({ sync_status: 'syncing' }).eq('id', integrationId)
  const logId = (await db.from('sync_log').insert({
    integration_id: integrationId, account_id: cfg.accountId, direction, status: 'running',
  }).select('id').single()).data?.id

  try {
    for (const entityType of cfg.entityTypes) {
      if (direction === 'push' || direction === 'bidirectional') {
        // Push wacrm data TO external system
        const data = await fetchWacrmEntities(db, cfg.accountId, entityType)
        if (data.length > 0) {
          const result = await connector.push(cfg, entityType, data)
          overall.recordsProcessed += result.recordsProcessed
          overall.recordsSucceeded += result.recordsSucceeded
          overall.recordsFailed += result.recordsFailed
          if (!result.success) overall.errors.push(...result.errors)

          // Update entity map
          for (const record of data) {
            const extId = record._external_id || String(record.id)
            try {
              await db.from('sync_entity_map').insert({
                integration_id: integrationId, account_id: cfg.accountId,
                entity_type: entityType, wacrm_id: record.id as string, external_id: extId,
                last_synced_at: new Date().toISOString(),
              })
            } catch {
              // Entity mapping already exists - update timestamp
              await db.from('sync_entity_map').update({
                external_id: extId, last_synced_at: new Date().toISOString(),
              }).eq('integration_id', integrationId).eq('entity_type', entityType).eq('wacrm_id', record.id as string)
            }
          }
        }
      }

      if (direction === 'pull' || direction === 'bidirectional') {
        // Pull data FROM external system into wacrm
        const { data, result } = await connector.pull(cfg, entityType)
        overall.recordsProcessed += result.recordsProcessed
        overall.recordsSucceeded += result.recordsSucceeded
        overall.recordsFailed += result.recordsFailed
        if (!result.success) overall.errors.push(...result.errors)

        if (data.length > 0) {
          await saveWacrmEntities(db, cfg.accountId, entityType, data)
        }
      }
    }

    overall.success = overall.recordsFailed === 0
    const status = overall.success ? 'completed' : (overall.recordsSucceeded > 0 ? 'partial' : 'failed')
    await db.from('sync_integrations').update({ sync_status: 'idle', last_synced_at: new Date().toISOString(), sync_error: overall.errors.length > 0 ? overall.errors.join('; ') : null }).eq('id', integrationId)
    if (logId) await db.from('sync_log').update({ status, records_processed: overall.recordsProcessed, records_succeeded: overall.recordsSucceeded, records_failed: overall.recordsFailed, error_message: overall.errors.join('; '), completed_at: new Date().toISOString() }).eq('id', logId)
  } catch (e) {
    overall.success = false; overall.errors.push(String(e))
    await db.from('sync_integrations').update({ sync_status: 'error', sync_error: String(e) }).eq('id', integrationId)
    if (logId) await db.from('sync_log').update({ status: 'failed', error_message: String(e), completed_at: new Date().toISOString() }).eq('id', logId)
  }

  return overall
}

async function fetchWacrmEntities(db: any, accountId: string, entityType: EntityType): Promise<Record<string, unknown>[]> {
  const tableMap: Record<EntityType, string> = {
    contact: 'contacts', product: 'ecommerce_products', task: 'tasks',
    booking: 'bookings', deal: 'deals', member: 'profiles',
    message: 'messages', conversation: 'conversations',
  }
  const table = tableMap[entityType]
  if (!table) return []
  const { data } = await db.from(table).select('*').eq('account_id', accountId).limit(100)
  return data || []
}

async function saveWacrmEntities(db: any, accountId: string, entityType: EntityType, data: Record<string, unknown>[]): Promise<void> {
  const tableMap: Record<EntityType, string> = {
    contact: 'contacts', product: 'ecommerce_products', task: 'tasks',
    booking: 'bookings', deal: 'deals', member: 'profiles',
    message: 'messages', conversation: 'conversations',
  }
  const table = tableMap[entityType]
  if (!table) return

  for (const record of data) {
    const { _external_id, ...clean } = record
    await db.from(table).upsert({ ...clean, account_id: accountId, updated_at: new Date().toISOString() })
      .onConflict(['id'])
  }
}
