-- Sync integrations: bidirectional data sync with external systems
-- Each integration stores connection config + field mapping + sync status

CREATE TABLE IF NOT EXISTS sync_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  connector_type TEXT NOT NULL CHECK (connector_type IN (
    'airtable', 'googlesheets', 'fastapi', 'supabase', 'postgres', 'n8n', 'csv', 'excel'
  )),
  name TEXT NOT NULL DEFAULT '',
  config JSONB NOT NULL DEFAULT '{}',
  field_mappings JSONB DEFAULT '[]',
  entity_types TEXT[] DEFAULT '{}',
  enabled BOOLEAN DEFAULT true,
  sync_frequency TEXT DEFAULT 'realtime' CHECK (sync_frequency IN ('realtime', 'hourly', 'daily', 'manual')),
  last_synced_at TIMESTAMPTZ,
  sync_status TEXT DEFAULT 'idle' CHECK (sync_status IN ('idle', 'syncing', 'error', 'paused')),
  sync_error TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_sync_integrations_account ON sync_integrations (account_id);

-- Sync log: history of sync operations
CREATE TABLE IF NOT EXISTS sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID REFERENCES sync_integrations(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  direction TEXT NOT NULL CHECK (direction IN ('push', 'pull', 'bidirectional')),
  entity_type TEXT NOT NULL,
  records_processed INT DEFAULT 0,
  records_succeeded INT DEFAULT 0,
  records_failed INT DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('running', 'completed', 'failed', 'partial')),
  error_message TEXT,
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);
CREATE INDEX idx_sync_log_integration ON sync_log (integration_id);
CREATE INDEX idx_sync_log_account ON sync_log (account_id);

-- Store external IDs mapping (e.g. wacrm contact UUID -> Airtable record ID)
CREATE TABLE IF NOT EXISTS sync_entity_map (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID NOT NULL REFERENCES sync_integrations(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  wacrm_id UUID NOT NULL,
  external_id TEXT NOT NULL,
  external_url TEXT,
  last_synced_at TIMESTAMPTZ DEFAULT now(),
  sync_hash TEXT,
  UNIQUE(integration_id, entity_type, wacrm_id),
  UNIQUE(integration_id, entity_type, external_id)
);
CREATE INDEX idx_sync_entity_map_integration ON sync_entity_map (integration_id);
CREATE INDEX idx_sync_entity_map_wacrm ON sync_entity_map (wacrm_id);
CREATE INDEX idx_sync_entity_map_external ON sync_entity_map (external_id);
