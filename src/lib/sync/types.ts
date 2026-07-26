import type { SupabaseClient } from '@supabase/supabase-js'

export type ConnectorType = 'airtable' | 'googlesheets' | 'fastapi' | 'supabase' | 'postgres' | 'n8n' | 'csv' | 'excel'

export type EntityType = 'contact' | 'product' | 'task' | 'booking' | 'deal' | 'member' | 'message' | 'conversation'

export type SyncDirection = 'push' | 'pull' | 'bidirectional'

export type SyncFrequency = 'realtime' | 'hourly' | 'daily' | 'manual'

export interface SyncIntegration {
  id: string
  account_id: string
  connector_type: ConnectorType
  name: string
  config: Record<string, unknown>
  field_mappings: FieldMapping[]
  entity_types: EntityType[]
  enabled: boolean
  sync_frequency: SyncFrequency
  last_synced_at: string | null
  sync_status: 'idle' | 'syncing' | 'error' | 'paused'
  sync_error: string | null
}

export interface FieldMapping {
  wacrm_field: string
  external_field: string
  transform?: string // optional transform function
  direction?: 'push' | 'pull' | 'both'
}

export interface SyncResult {
  success: boolean
  recordsProcessed: number
  recordsSucceeded: number
  recordsFailed: number
  errors: string[]
}

export interface ConnectorConfig {
  /** Unique id for this connector instance */
  id: string
  accountId: string
  config: Record<string, unknown>
  fieldMappings: FieldMapping[]
  entityTypes: EntityType[]
}

export interface ConnectorInterface {
  /** Test connection to external system */
  testConnection(config: Record<string, unknown>): Promise<{ success: boolean; message: string }>
  
  /** Push data TO external system */
  push(connector: ConnectorConfig, entityType: EntityType, data: Record<string, unknown>[]): Promise<SyncResult>
  
  /** Pull data FROM external system */
  pull(connector: ConnectorConfig, entityType: EntityType): Promise<{ data: Record<string, unknown>[]; result: SyncResult }>
  
  /** Transform wacrm data using field mappings */
  transformToExternal(data: Record<string, unknown>, mappings: FieldMapping[]): Record<string, unknown>
  
  /** Transform external data to wacrm format */
  transformToWacrm(data: Record<string, unknown>, mappings: FieldMapping[]): Record<string, unknown>
}

/** Base connector with common transform logic */
export abstract class BaseConnector implements ConnectorInterface {
  abstract testConnection(config: Record<string, unknown>): Promise<{ success: boolean; message: string }>
  abstract push(connector: ConnectorConfig, entityType: EntityType, data: Record<string, unknown>[]): Promise<SyncResult>
  abstract pull(connector: ConnectorConfig, entityType: EntityType): Promise<{ data: Record<string, unknown>[]; result: SyncResult }>

  transformToExternal(data: Record<string, unknown>, mappings: FieldMapping[]): Record<string, unknown> {
    const result: Record<string, unknown> = {}
    for (const m of mappings) {
      if (m.direction === 'pull') continue
      result[m.external_field] = data[m.wacrm_field]
    }
    return result
  }

  transformToWacrm(data: Record<string, unknown>, mappings: FieldMapping[]): Record<string, unknown> {
    const result: Record<string, unknown> = {}
    for (const m of mappings) {
      if (m.direction === 'push') continue
      result[m.wacrm_field] = data[m.external_field]
    }
    return result
  }
}
