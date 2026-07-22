-- Add channel column to messages table (moved from conversations level)
-- Previously, queries tried to filter messages by channel but the column didn't exist.
-- The channel is backfilled from the conversation's channel.

ALTER TABLE messages ADD COLUMN IF NOT EXISTS channel text;

-- Backfill from conversations
UPDATE messages m
SET channel = c.channel
FROM conversations c
WHERE m.conversation_id = c.id
  AND m.channel IS NULL
  AND c.channel IS NOT NULL;
