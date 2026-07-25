CREATE TABLE IF NOT EXISTS ai_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'AI Agent',
  channel TEXT,
  provider TEXT NOT NULL DEFAULT 'openai',
  model TEXT,
  api_key TEXT,
  embeddings_key TEXT,
  instructions TEXT,
  tone TEXT DEFAULT 'friendly',
  max_auto_replies INT DEFAULT 3,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_ai_agents_account ON ai_agents (account_id);
