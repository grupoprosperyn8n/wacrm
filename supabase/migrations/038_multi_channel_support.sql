-- ============================================================
-- Migration 038: Multi-channel support
--
-- Adds channel discriminator to conversations and a channels
-- table so each account can configure multiple inbound/outbound
-- messaging providers (WhatsApp, Telegram, Facebook, Instagram,
-- web chat).
--
-- Safe to run multiple times — uses IF NOT EXISTS / DROP IF EXISTS.
-- ============================================================

-- ============================================================
-- CHANNEL TYPE ENUM
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'channel_type') THEN
    CREATE TYPE public.channel_type AS ENUM (
      'whatsapp',
      'telegram',
      'facebook',
      'instagram',
      'web'
    );
  END IF;
END $$;

-- ============================================================
-- CONVERSATIONS — add channel discriminator
-- ============================================================
ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS channel public.channel_type NOT NULL DEFAULT 'whatsapp';

CREATE INDEX IF NOT EXISTS idx_conversations_channel
  ON conversations(channel);

-- ============================================================
-- CHANNELS — per-account channel configuration
--
-- One row per configured channel per account. Stores the
-- provider-specific credentials/config in the `config` JSONB
-- column (e.g. bot token for Telegram, page token for Facebook,
-- webhook secret for web chat).
-- ============================================================
CREATE TABLE IF NOT EXISTS public.channels (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  type       public.channel_type NOT NULL,
  config     JSONB NOT NULL DEFAULT '{}',
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_channels_account
  ON channels(account_id);

CREATE INDEX IF NOT EXISTS idx_channels_type
  ON channels(type);

-- One active channel of a given type per account (enforced by
-- partial unique index so you can't have two active Webhook
-- channels under the same account).
CREATE UNIQUE INDEX IF NOT EXISTS idx_channels_one_active_per_type
  ON channels(account_id, type)
  WHERE is_active = TRUE;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE channels ENABLE ROW LEVEL SECURITY;

-- Channels are account-scoped; reuse the is_account_member helper
-- from 017_account_sharing
DROP POLICY IF EXISTS channels_select ON channels;
DROP POLICY IF EXISTS channels_insert ON channels;
DROP POLICY IF EXISTS channels_update ON channels;
DROP POLICY IF EXISTS channels_delete ON channels;

CREATE POLICY channels_select ON channels
  FOR SELECT USING (is_account_member(account_id));

CREATE POLICY channels_insert ON channels
  FOR INSERT WITH CHECK (is_account_member(account_id, 'admin'));

CREATE POLICY channels_update ON channels
  FOR UPDATE USING (is_account_member(account_id, 'admin'));

CREATE POLICY channels_delete ON channels
  FOR DELETE USING (is_account_member(account_id, 'admin'));

-- ============================================================
-- TRIGGERS
-- ============================================================
DROP TRIGGER IF EXISTS set_updated_at ON channels;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON channels
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- REPLICATION (for real-time subscriptions in the inbox)
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND tablename = 'channels'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE channels;
  END IF;
END $$;
