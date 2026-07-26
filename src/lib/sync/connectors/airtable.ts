// Airtable connector - auto-detects bases & tables, supports multi-base and single-base tokens
import { BaseConnector, type ConnectorConfig, type EntityType, type SyncResult, type DiscoverResult } from '../types'

const AIRTABLE_API = 'https://api.airtable.com/v0'

export class AirtableConnector extends BaseConnector {
  private headers(apiKey: string) { return { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' } }

  async testConnection(config: Record<string, unknown>): Promise<{ success: boolean; message: string }> {
    const key = String(config.api_key || '')
    if (!key) return { success: false, message: 'API Key requerida' }
    try {
      const res = await fetch(AIRTABLE_API + '/meta/bases', { headers: this.headers(key) })
      if (res.ok) {
        const d = await res.json()
        const count = d.bases?.length || 0
        return { success: true, message: `Conectado - ${count} base(s) disponible(s)` }
      }
      const d = await res.json().catch(() => ({}))
      return { success: false, message: d.error?.message || `Error HTTP ${res.status}` }
    } catch (e) { return { success: false, message: String(e) } }
  }

  async discover(config: Record<string, unknown>, resourceType?: string): Promise<DiscoverResult> {
    const key = String(config.api_key || '')
    if (!key) return { success: false, resources: [], message: 'API Key requerida' }

    try {
      if (resourceType === 'tables' || resourceType === 'fields') {
        const baseId = String(config.base_id || '')
        if (!baseId) return { success: false, resources: [], message: 'Base ID requerido' }
        const res = await fetch(AIRTABLE_API + '/meta/bases/' + baseId + '/tables', { headers: this.headers(key) })
        if (!res.ok) return { success: false, resources: [], message: `Error ${res.status}` }
        const d = await res.json()
        const resources = (d.tables || []).map((t: any) => ({
          id: t.id,
          name: t.name,
          type: 'table' as const,
          fields: (t.fields || []).map((f: any) => ({ name: f.name, type: f.type })),
        }))
        return { success: true, resources }
      }

      const res = await fetch(AIRTABLE_API + '/meta/bases', { headers: this.headers(key) })
      if (!res.ok) return { success: false, resources: [], message: `Error ${res.status}` }
      const d = await res.json()
      const resources = (d.bases || []).map((b: any) => ({ id: b.id, name: b.name, type: 'base' as const }))
      return { success: true, resources, message: resources.length === 1 ? `Base unica: ${resources[0].name}` : undefined }
    } catch (e) { return { success: false, resources: [], message: String(e) } }
  }

  async push(connector: ConnectorConfig, _entityType: EntityType, data: Record<string, unknown>[]): Promise<SyncResult> {
    const key = String(connector.config.api_key || ''); const baseId = String(connector.config.base_id || ''); const tableName = String(connector.config.table_name || '')
    const result: SyncResult = { success: true, recordsProcessed: 0, recordsSucceeded: 0, recordsFailed: 0, errors: [] }
    for (const record of data) {
      const fields = this.transformToExternal(record, connector.fieldMappings)
      try {
        const res = await fetch(AIRTABLE_API + '/' + baseId + '/' + encodeURIComponent(tableName), {
          method: 'POST', headers: this.headers(key), body: JSON.stringify({ fields }),
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
    const key = String(connector.config.api_key || ''); const baseId = String(connector.config.base_id || ''); const tableName = String(connector.config.table_name || '')
    const result: SyncResult = { success: true, recordsProcessed: 0, recordsSucceeded: 0, recordsFailed: 0, errors: [] }
    try {
      const res = await fetch(AIRTABLE_API + '/' + baseId + '/' + encodeURIComponent(tableName) + '?maxRecords=100', { headers: this.headers(key) })
      if (!res.ok) { result.success = false; result.errors.push(`Airtable error: ${res.status}`); return { data: [], result } }
      const d = await res.json()
      const data = (d.records || []).map((r: any) => ({
        ...this.transformToWacrm(r.fields || {}, connector.fieldMappings), _external_id: r.id,
      }))
      result.recordsProcessed = data.length; result.recordsSucceeded = data.length
      return { data, result }
    } catch (e) { result.success = false; result.errors.push(String(e)); return { data: [], result } }
  }
}
