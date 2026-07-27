-- Webforms: capture leads from external websites
CREATE TABLE IF NOT EXISTS webforms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Nuevo formulario',
  slug TEXT UNIQUE NOT NULL,
  fields JSONB NOT NULL DEFAULT '[]',
  config JSONB DEFAULT '{"submit_label": "Enviar", "success_message": "Gracias por contactarnos"}',
  allowed_origins TEXT[] DEFAULT '{}',
  create_lead BOOLEAN DEFAULT true,
  lead_pipeline_id UUID,
  lead_stage_id UUID,
  enabled BOOLEAN DEFAULT true,
  submission_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Form submissions
CREATE TABLE IF NOT EXISTS webform_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webform_id UUID NOT NULL REFERENCES webforms(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{}',
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
  page_url TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_webforms_account ON webforms (account_id);
CREATE INDEX idx_webforms_slug ON webforms (slug);
CREATE INDEX idx_webform_submissions_account ON webform_submissions (account_id);
CREATE INDEX idx_webform_submissions_webform ON webform_submissions (webform_id);

ALTER TABLE webforms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "webforms_account_access" ON webforms FOR ALL USING (account_id IN (SELECT account_id FROM profiles WHERE user_id = auth.uid()));
CREATE POLICY "webforms_insert" ON webforms FOR INSERT WITH CHECK (account_id IN (SELECT account_id FROM profiles WHERE user_id = auth.uid()));
ALTER TABLE webform_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "webform_submissions_account_access" ON webform_submissions FOR ALL USING (account_id IN (SELECT account_id FROM profiles WHERE user_id = auth.uid()));
CREATE POLICY "webform_submissions_insert" ON webform_submissions FOR INSERT WITH CHECK (account_id IN (SELECT account_id FROM profiles WHERE user_id = auth.uid()));
