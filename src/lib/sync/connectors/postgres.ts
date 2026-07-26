// Postgres/Supabase direct connector - bidirectional sync with external databases
import { BaseConnector, type ConnectorConfig, type EntityType, type SyncResult } from '../types'

interface PgConfig {
  connection_string: string
  table_name: string
  schema: string
}

export class PostgresConnector extends BaseConnector {
  private getConfig(c: Record<string, unknown>): PgConfig {
    return {
      connection_string: String(c.connection_string || ''),
      table_name: String(c.table_name || ''),
      schema: String(c.schema || 'public'),
    }
  }

  async testConnection(config: Record<string, unknown>): Promise<{ success: boolean; message: string }> {
    const cfg = this.getConfig(config)
    if (!cfg.connection_string) return { success: false, message: 'Connection string requerida' }
    // Connection test is done via the API endpoint that proxies queries
    return { success: true, message: 'Configuracion valida (la conexion se prueba al sincronizar)' }
  }

  async push(connector: ConnectorConfig, entityType: EntityType, data: Record<string, unknown>[]): Promise<SyncResult> {
    const result: SyncResult = { success: true, recordsProcessed: 0, recordsSucceeded: 0, recordsFailed: 0, errors: [] }
    // Push is handled by the sync API which uses pg-promise or the Supabase management API
    // The connector sends data to our internal sync endpoint which does the actual DB write
    try {
      const res = await fetch('/api/sync/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          connectorId: connector.id,
          entityType,
          records: data.map(r => this.transformToExternal(r, connector.fieldMappings)),
        }),
      })
      if (res.ok) { const d = await res.json(); result.recordsSucceeded = d.updated || 0 }
      else { result.success = false; result.errors.push(`Sync error: ${res.status}`) }
    } catch (e) { result.success = false; result.errors.push(String(e)) }
    result.recordsProcessed = data.length
    return result
  }

  async pull(connector: ConnectorConfig, entityType: EntityType): Promise<{ data: Record<string, unknown>[]; result: SyncResult }> {
    const result: SyncResult = { success: true, recordsProcessed: 0, recordsSucceeded: 0, recordsFailed: 0, errors: [] }
    try {
      const res = await fetch(`/api/sync/pull?connectorId=${connector.id}&entityType=${entityType}&limit=100`)
      if (!res.ok) { result.success = false; return { data: [], result } }
      const d = await res.json()
      const data = (d.records || []).map((r: any) => this.transformToWacrm(r, connector.fieldMappings))
      result.recordsProcessed = data.length; result.recordsSucceeded = data.length
      return { data, result }
    } catch (e) { result.success = false; result.errors.push(String(e)); return { data: [], result } }
  }
}
