-- Outgoing webhooks for CRM events
CREATE TABLE IF NOT EXISTS webhook_outgoing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id),
  url TEXT NOT NULL,
  event TEXT NOT NULL,
  secret TEXT,
  enabled BOOLEAN DEFAULT true,
  last_triggered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_webhook_outgoing_account ON webhook_outgoing (account_id);
