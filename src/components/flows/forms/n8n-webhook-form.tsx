'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function N8nWebhookForm({ config, onChange }: { config: Record<string, any>; onChange: (key: string, value: any) => void }) {
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label>URL del webhook de n8n</Label>
        <Input value={config.url || ''} onChange={e => onChange('url', e.target.value)} placeholder="https://tun8n.app.n8n.cloud/webhook/..." />
      </div>
      <div className="space-y-1">
        <Label>Metodo HTTP</Label>
        <select value={config.method || 'POST'} onChange={e => onChange('method', e.target.value)}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm">
          <option value="POST">POST</option><option value="GET">GET</option>
        </select>
      </div>
      <div className="space-y-1">
        <Label>Token (opcional)</Label>
        <Input type="password" value={config.token || ''} onChange={e => onChange('token', e.target.value)} placeholder="Bearer token" />
      </div>
    </div>
  )
}
