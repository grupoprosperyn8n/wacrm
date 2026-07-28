CREATE TABLE IF NOT EXISTS app_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(account_id, key)
);
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "app_settings_access" ON app_settings FOR ALL USING (account_id IN (SELECT account_id FROM profiles WHERE user_id = auth.uid()));
CREATE POLICY "app_settings_insert" ON app_settings FOR INSERT WITH CHECK (account_id IN (SELECT account_id FROM profiles WHERE user_id = auth.uid()));
