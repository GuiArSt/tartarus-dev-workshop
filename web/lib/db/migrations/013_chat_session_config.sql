-- Persist Kronus chat UI (model, soul, tools, skills, format) per conversation.
-- Runtime migration also runs in web/lib/db-conversations.ts initConversationsTable().
ALTER TABLE chat_conversations ADD COLUMN session_config TEXT;
