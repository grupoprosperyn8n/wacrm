-- Slack Integration: notificaciones a Slack desde wacrm

CREATE TABLE IF NOT EXISTS slack_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  webhook_url TEXT NOT NULL,
  channel_name TEXT,
  notify_new_lead BOOLEAN DEFAULT true,
  notify_new_deal BOOLEAN DEFAULT true,
  notify_conversation_assigned BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT false,
  last_test_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(account_id)
);

ALTER TABLE slack_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "slack_integrations_select"
  ON slack_integrations FOR SELECT
  USING (account_id IN (SELECT account_id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "slack_integrations_insert"
  ON slack_integrations FOR INSERT
  WITH CHECK (account_id IN (SELECT account_id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "slack_integrations_update"
  ON slack_integrations FOR UPDATE
  USING (account_id IN (SELECT account_id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "slack_integrations_delete"
  ON slack_integrations FOR DELETE
  USING (account_id IN (SELECT account_id FROM profiles WHERE user_id = auth.uid()));
