'use client'
import { SyncPanel } from '@/components/settings/sync-panel'

export default function SyncPage() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Sincronizacion</h1>
          <p className="text-sm text-muted-foreground mt-1">Conecta wacrm con sistemas externos: Airtable, Google Sheets, APIs, Postgres, n8n</p>
        </div>
      </div>
      <SyncPanel />
    </div>
  )
}
