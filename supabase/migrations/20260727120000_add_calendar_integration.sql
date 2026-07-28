-- Google Calendar Sync: sincronizar bookings con Google Calendar

CREATE TABLE IF NOT EXISTS calendar_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  google_email TEXT,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  calendar_id TEXT DEFAULT 'primary',
  sync_enabled BOOLEAN DEFAULT false,
  sync_description TEXT DEFAULT 'Reserva de {contact_name} - {service}',
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(account_id)
);

ALTER TABLE calendar_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "calendar_integrations_select"
  ON calendar_integrations FOR SELECT
  USING (account_id IN (SELECT account_id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "calendar_integrations_insert"
  ON calendar_integrations FOR INSERT
  WITH CHECK (account_id IN (SELECT account_id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "calendar_integrations_update"
  ON calendar_integrations FOR UPDATE
  USING (account_id IN (SELECT account_id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "calendar_integrations_delete"
  ON calendar_integrations FOR DELETE
  USING (account_id IN (SELECT account_id FROM profiles WHERE user_id = auth.uid()));
