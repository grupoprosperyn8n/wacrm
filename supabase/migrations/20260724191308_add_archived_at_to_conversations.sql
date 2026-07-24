-- Add archived_at column to conversations table
-- This replaces using status='closed' for archiving, so new messages
-- don't accidentally "unarchive" conversations.

ALTER TABLE conversations 
ADD COLUMN archived_at TIMESTAMPTZ DEFAULT NULL;

-- Create an index for efficient filtering of non-archived conversations
CREATE INDEX idx_conversations_archived_at 
ON conversations (archived_at) 
WHERE archived_at IS NULL;
