// FastAPI connector - bidirectional sync via REST API
// Connects to any FastAPI/Flask/Express endpoint that implements the sync protocol
import { BaseConnector, type ConnectorConfig, type EntityType, type SyncResult } from '../types'

interface FastApiConfig {
  url: string        // Base URL of the external API (e.g. https://api.misistema.com)
  api_key: string     // API key for authentication
  endpoints: Record<string, string>  // Entity -> endpoint path mapping
}

export class FastApiConnector extends BaseConnector {
  private getConfig(c: Record<string, unknown>): FastApiConfig {
    return {
      url: String(c.url || '').replace(/\/$/, ''),
      api_key: String(c.api_key || ''),
      endpoints: (c.endpoints as Record<string, string>) || {},
    }
  }

  private headers(cfg: FastApiConfig) {
    return { 'Content-Type': 'application/json', 'X-API-Key': cfg.api_key, 'User-Agent': 'WacrmSync/1.0' }
  }

  async testConnection(config: Record<string, unknown>): Promise<{ success: boolean; message: string }> {
    const cfg = this.getConfig(config)
    if (!cfg.url) return { success: false, message: 'URL requerida' }
    try {
      const res = await fetch(`${cfg.url}/health`, { headers: this.headers(cfg) })
      if (res.ok) return { success: true, message: 'Conexion exitosa' }
      // Try root as fallback
      const res2 = await fetch(cfg.url, { method: 'HEAD', headers: this.headers(cfg) })
      return { success: res2.ok, message: res2.ok ? 'Conectado' : `HTTP ${res2.status}` }
    } catch (e) { return { success: false, message: String(e) } }
  }

  async push(connector: ConnectorConfig, entityType: EntityType, data: Record<string, unknown>[]): Promise<SyncResult> {
    const cfg = this.getConfig(connector.config)
    const endpoint = cfg.endpoints[entityType] || `/api/${entityType}s`
    const result: SyncResult = { success: true, recordsProcessed: 0, recordsSucceeded: 0, recordsFailed: 0, errors: [] }

    for (const record of data) {
      const payload = this.transformToExternal(record, connector.fieldMappings)
      try {
        const res = await fetch(`${cfg.url}${endpoint}`, {
          method: 'POST', headers: this.headers(cfg),
          body: JSON.stringify(payload),
        })
        if (res.ok) result.recordsSucceeded++
        else { result.recordsFailed++; result.errors.push(`FastAPI error: ${res.status}`) }
      } catch (e) { result.recordsFailed++; result.errors.push(String(e)) }
      result.recordsProcessed++
    }
    result.success = result.recordsFailed === 0
    return result
  }

  async pull(connector: ConnectorConfig, entityType: EntityType): Promise<{ data: Record<string, unknown>[]; result: SyncResult }> {
    const cfg = this.getConfig(connector.config)
    const endpoint = cfg.endpoints[entityType] || `/api/${entityType}s`
    const result: SyncResult = { success: true, recordsProcessed: 0, recordsSucceeded: 0, recordsFailed: 0, errors: [] }

    try {
      const res = await fetch(`${cfg.url}${endpoint}?limit=100`, { headers: this.headers(cfg) })
      if (!res.ok) { result.success = false; return { data: [], result } }
      const d = await res.json()
      const items = Array.isArray(d) ? d : (d.data || d.items || d.records || [])
      const data = items.map((item: any) => ({
        ...this.transformToWacrm(item, connector.fieldMappings),
        _external_id: item.id || item._id,
      }))
      result.recordsProcessed = data.length; result.recordsSucceeded = data.length
      return { data, result }
    } catch (e) { result.success = false; result.errors.push(String(e)); return { data: [], result } }
  }
}
