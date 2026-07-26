// Airtable connector - bidirectional sync via Airtable REST API
import { BaseConnector, type ConnectorConfig, type EntityType, type SyncResult } from '../types'

interface AirtableConfig {
  api_key: string; base_id: string; table_name: string
}

export class AirtableConnector extends BaseConnector {
  private getConfig(c: Record<string, unknown>): AirtableConfig {
    return { api_key: String(c.api_key || ''), base_id: String(c.base_id || ''), table_name: String(c.table_name || '') }
  }
  private headers(cfg: AirtableConfig) { return { Authorization: `Bearer ${cfg.api_key}`, 'Content-Type': 'application/json' } }

  async testConnection(config: Record<string, unknown>): Promise<{ success: boolean; message: string }> {
    const cfg = this.getConfig(config)
    if (!cfg.api_key || !cfg.base_id) return { success: false, message: 'API Key y Base ID requeridos' }
    try {
      const res = await fetch(`https://api.airtable.com/v0/${cfg.base_id}`, { headers: this.headers(cfg) })
      if (res.ok) return { success: true, message: 'Conexion exitosa a Airtable' }
      const d = await res.json().catch(() => ({}))
      return { success: false, message: d.error?.message || `Error HTTP ${res.status}` }
    } catch (e) { return { success: false, message: String(e) } }
  }

  async push(connector: ConnectorConfig, _entityType: EntityType, data: Record<string, unknown>[]): Promise<SyncResult> {
    const cfg = this.getConfig(connector.config)
    const result: SyncResult = { success: true, recordsProcessed: 0, recordsSucceeded: 0, recordsFailed: 0, errors: [] }
    for (const record of data) {
      const fields = this.transformToExternal(record, connector.fieldMappings)
      try {
        const res = await fetch(`https://api.airtable.com/v0/${cfg.base_id}/${cfg.table_name}`, {
          method: 'POST', headers: this.headers(cfg), body: JSON.stringify({ fields }),
        })
        if (res.ok) result.recordsSucceeded++
        else { result.recordsFailed++; result.errors.push(`Airtable error: ${res.status}`) }
      } catch (e) { result.recordsFailed++; result.errors.push(String(e)) }
      result.recordsProcessed++
    }
    result.success = result.recordsFailed === 0
    return result
  }

  async pull(connector: ConnectorConfig, _entityType: EntityType): Promise<{ data: Record<string, unknown>[]; result: SyncResult }> {
    const cfg = this.getConfig(connector.config)
    const result: SyncResult = { success: true, recordsProcessed: 0, recordsSucceeded: 0, recordsFailed: 0, errors: [] }
    try {
      const res = await fetch(`https://api.airtable.com/v0/${cfg.base_id}/${cfg.table_name}?maxRecords=100`, { headers: this.headers(cfg) })
      if (!res.ok) { result.success = false; result.errors.push(`Airtable error: ${res.status}`); return { data: [], result } }
      const d = await res.json()
      const data = (d.records || []).map((r: any) => ({
        ...this.transformToWacrm(r.fields || {}, connector.fieldMappings),
        _external_id: r.id, _external_url: `https://airtable.com/${cfg.base_id}/${cfg.table_name}/${r.id}`,
      }))
      result.recordsProcessed = data.length; result.recordsSucceeded = data.length
      return { data, result }
    } catch (e) { result.success = false; result.errors.push(String(e)); return { data: [], result } }
  }
}
