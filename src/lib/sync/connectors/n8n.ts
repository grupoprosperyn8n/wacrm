// n8n connector - enhanced bidirectional sync with n8n workflows
// n8n acts as middleware: wacrm pushes events to n8n, n8n can push data back
import { BaseConnector, type ConnectorConfig, type EntityType, type SyncResult } from '../types'

interface N8nConfig {
  webhook_url: string       // n8n webhook URL to receive events
  api_key: string            // Shared secret for auth
  workflows: Record<string, string>  // Entity -> workflow ID mapping
}

export class N8nConnector extends BaseConnector {
  private getConfig(c: Record<string, unknown>): N8nConfig {
    return {
      webhook_url: String(c.webhook_url || '').replace(/\/$/, ''),
      api_key: String(c.api_key || ''),
      workflows: (c.workflows as Record<string, string>) || {},
    }
  }

  async testConnection(config: Record<string, unknown>): Promise<{ success: boolean; message: string }> {
    const cfg = this.getConfig(config)
    if (!cfg.webhook_url) return { success: false, message: 'Webhook URL requerida' }
    try {
      const res = await fetch(`${cfg.webhook_url}/test`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'X-N8N-Token': cfg.api_key },
        body: JSON.stringify({ event: 'test' }),
      })
      return { success: res.ok, message: res.ok ? 'n8n responde correctamente' : `HTTP ${res.status}` }
    } catch (e) { return { success: false, message: String(e) } }
  }

  async push(connector: ConnectorConfig, entityType: EntityType, data: Record<string, unknown>[]): Promise<SyncResult> {
    const cfg = this.getConfig(connector.config)
    const workflowId = cfg.workflows[entityType] || ''
    const result: SyncResult = { success: true, recordsProcessed: 0, recordsSucceeded: 0, recordsFailed: 0, errors: [] }

    for (const record of data) {
      const payload = {
        event: `${entityType}.pushed`,
        entity_type: entityType,
        workflow_id: workflowId,
        data: this.transformToExternal(record, connector.fieldMappings),
        timestamp: new Date().toISOString(),
      }
      try {
        const res = await fetch(cfg.webhook_url, {
          method: 'POST', headers: { 'Content-Type': 'application/json', 'X-N8N-Token': cfg.api_key },
          body: JSON.stringify(payload),
        })
        if (res.ok) result.recordsSucceeded++
        else { result.recordsFailed++; result.errors.push(`n8n error: ${res.status}`) }
      } catch (e) { result.recordsFailed++; result.errors.push(String(e)) }
      result.recordsProcessed++
    }
    result.success = result.recordsFailed === 0
    return result
  }

  async pull(connector: ConnectorConfig, entityType: EntityType): Promise<{ data: Record<string, unknown>[]; result: SyncResult }> {
    const cfg = this.getConfig(connector.config)
    const result: SyncResult = { success: true, recordsProcessed: 0, recordsSucceeded: 0, recordsFailed: 0, errors: [] }
    try {
      const res = await fetch(`${cfg.webhook_url}/pull?entity=${entityType}`, {
        headers: { 'X-N8N-Token': cfg.api_key },
      })
      if (!res.ok) { result.success = false; return { data: [], result } }
      const d = await res.json()
      const items = Array.isArray(d) ? d : (d.data || d.items || [])
      const data = items.map((item: any) => ({
        ...this.transformToWacrm(item, connector.fieldMappings),
        _external_id: item.id,
      }))
      result.recordsProcessed = data.length; result.recordsSucceeded = data.length
      return { data, result }
    } catch (e) { result.success = false; result.errors.push(String(e)); return { data: [], result } }
  }
}
