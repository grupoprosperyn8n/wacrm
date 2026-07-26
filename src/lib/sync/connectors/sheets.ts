// Google Sheets connector - bidirectional sync with Google Sheets
import { BaseConnector, type ConnectorConfig, type EntityType, type SyncResult, type DiscoverResult } from '../types'

interface SheetsConfig {
  spreadsheet_id: string   // Google Sheets ID
  sheet_name: string        // Sheet tab name (default: Sheet1)
  credentials_json: string  // Google service account credentials JSON
}

export class GoogleSheetsConnector extends BaseConnector {
  private getConfig(c: Record<string, unknown>): SheetsConfig {
    return {
      spreadsheet_id: String(c.spreadsheet_id || ''),
      sheet_name: String(c.sheet_name || 'Sheet1'),
      credentials_json: String(c.credentials_json || '{}'),
    }
  }

  private getAccessToken(credsJson: string): string {
    // In production this would use a proper Google Auth client
    // For now, we expect the user to provide a pre-generated access token
    try { const p = JSON.parse(credsJson); return p.access_token || '' } catch { return credsJson }
  }

  private range(sheetName: string, cols: number, rows: number) {
    const colLetter = String.fromCharCode(64 + Math.min(cols, 26))
    return `${sheetName}!A1:${colLetter}${rows + 1}`
  }

  async testConnection(config: Record<string, unknown>): Promise<{ success: boolean; message: string }> {
    const cfg = this.getConfig(config)
    if (!cfg.spreadsheet_id) return { success: false, message: 'Spreadsheet ID requerido' }
    try {
      const token = this.getAccessToken(cfg.credentials_json)
      const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${cfg.spreadsheet_id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) return { success: true, message: `Conectado a ${(await res.json()).properties.title}` }
      return { success: false, message: `Error HTTP ${res.status}` }
    } catch (e) { return { success: false, message: String(e) } }
  }

  async discover(config: Record<string, unknown>, _resourceType?: string): Promise<DiscoverResult> {
    const cfg = this.getConfig(config)
    if (!cfg.spreadsheet_id) return { success: false, resources: [], message: 'Spreadsheet ID requerido' }
    try {
      const token = this.getAccessToken(cfg.credentials_json)
      const res = await fetch('https://sheets.googleapis.com/v4/spreadsheets/' + cfg.spreadsheet_id + '?includeGridData=false', {
        headers: { Authorization: 'Bearer ' + token },
      })
      if (!res.ok) return { success: false, resources: [], message: 'Error ' + res.status }
      const d = await res.json()
      const sheets = (d.sheets || []).map((s: any) => ({
        id: s.properties.sheetId.toString(),
        name: s.properties.title,
        type: 'sheet' as const,
      }))
      return { success: true, resources: sheets, message: d.properties.title + ': ' + sheets.length + ' hoja(s)' }
    } catch (e) { return { success: false, resources: [], message: String(e) } }
  }

  async push(connector: ConnectorConfig, entityType: EntityType, data: Record<string, unknown>[]): Promise<SyncResult> {
    const cfg = this.getConfig(connector.config)
    const result: SyncResult = { success: true, recordsProcessed: 0, recordsSucceeded: 0, recordsFailed: 0, errors: [] }
    const token = this.getAccessToken(cfg.credentials_json)
    const headers = connector.fieldMappings.map(m => m.external_field)
    const rows = data.map(r => headers.map(h => String(this.transformToExternal(r, connector.fieldMappings)[h] ?? '')))

    try {
      const body = { values: [headers, ...rows], majorDimension: 'ROWS' }
      const res = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${cfg.spreadsheet_id}/values/${this.range(cfg.sheet_name, headers.length, rows.length)}?valueInputOption=USER_ENTERED`,
        { method: 'PUT', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) },
      )
      if (res.ok) { result.recordsSucceeded = data.length }
      else { result.success = false; result.errors.push(`Sheets error: ${res.status}`) }
    } catch (e) { result.success = false; result.errors.push(String(e)) }
    result.recordsProcessed = data.length
    return result
  }

  async pull(connector: ConnectorConfig, _entityType: EntityType): Promise<{ data: Record<string, unknown>[]; result: SyncResult }> {
    const cfg = this.getConfig(connector.config)
    const result: SyncResult = { success: true, recordsProcessed: 0, recordsSucceeded: 0, recordsFailed: 0, errors: [] }
    const token = this.getAccessToken(cfg.credentials_json)

    try {
      const range = `${cfg.sheet_name}!A:Z`
      const res = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${cfg.spreadsheet_id}/values/${range}`,
        { headers: { Authorization: `Bearer ${token}` } },
      )
      if (!res.ok) { result.success = false; return { data: [], result } }
      const d = await res.json()
      const values: string[][] = d.values || []
      if (values.length < 2) return { data: [], result }

      const headers = values[0]
      const data = values.slice(1).map(row => {
        const obj: Record<string, unknown> = {}
        headers.forEach((h, i) => { obj[h] = row[i] || '' })
        return this.transformToWacrm(obj, connector.fieldMappings)
      })
      result.recordsProcessed = data.length; result.recordsSucceeded = data.length
      return { data, result }
    } catch (e) { result.success = false; result.errors.push(String(e)); return { data: [], result } }
  }
}
