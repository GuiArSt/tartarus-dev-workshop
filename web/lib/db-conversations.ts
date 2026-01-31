/**
 * Conversation Storage for Kronus Chat
 * Only accessible via webapp - MCP cannot access this
 * Used for audit/safety - saving agent interactions
 */

import { getDatabase } from "./db";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  toolInvocations?: Array<{
    toolCallId: string;
    toolName: string;
    args: Record<string, unknown>;
    result?: string;
  }>;
  createdAt?: string;
}

export interface Conversation {
  id: number;
  title: string;
  messages: ChatMessage[];
  summary?: string | null;
  summary_updated_at?: string | null;
  created_at: string;
  updated_at: string;
}

// Initialize conversations table (call on app startup)
export function initConversationsTable(): void {
  const db = getDatabase();

  db.exec(`
    CREATE TABLE IF NOT EXISTS chat_conversations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      messages TEXT NOT NULL,
      summary TEXT,
      summary_updated_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Migration: Add summary columns if they don't exist
  try {
    db.prepare("SELECT summary FROM chat_conversations LIMIT 1").get();
  } catch (error: any) {
    if (error.message?.includes("no such column")) {
      db.exec(`
        ALTER TABLE chat_conversations ADD COLUMN summary TEXT;
        ALTER TABLE chat_conversations ADD COLUMN summary_updated_at TEXT;
      `);
    }
  }
}

// Save a new conversation
export function saveConversation(title: string, messages: ChatMessage[]): number {
  const db = getDatabase();
  initConversationsTable();

  const result = db
    .prepare(
      `
    INSERT INTO chat_conversations (title, messages, updated_at)
    VALUES (?, ?, CURRENT_TIMESTAMP)
  `
    )
    .run(title, JSON.stringify(messages));

  return result.lastInsertRowid as number;
}

// Update an existing conversation
export function updateConversation(id: number, title: string, messages: ChatMessage[]): void {
  const db = getDatabase();
  initConversationsTable();

  db.prepare(
    `
    UPDATE chat_conversations
    SET title = ?, messages = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `
  ).run(title, JSON.stringify(messages), id);
}

// Update only the title without touching updated_at (for summary generation)
export function updateConversationTitle(id: number, title: string): void {
  const db = getDatabase();
  initConversationsTable();

  db.prepare(
    `
    UPDATE chat_conversations
    SET title = ?
    WHERE id = ?
  `
  ).run(title, id);
}

// Get a conversation by ID
export function getConversation(id: number): Conversation | null {
  const db = getDatabase();
  initConversationsTable();

  const row = db.prepare("SELECT * FROM chat_conversations WHERE id = ?").get(id) as any;

  if (!row) return null;

  return {
    ...row,
    messages: JSON.parse(row.messages),
  };
}

// List all conversations (most recent first)
export function listConversations(
  limit = 50,
  offset = 0
): { conversations: Omit<Conversation, "messages">[]; total: number } {
  const db = getDatabase();
  initConversationsTable();

  const total = (db.prepare("SELECT COUNT(*) as count FROM chat_conversations").get() as any).count;

  const rows = db
    .prepare(
      `
    SELECT id, title, summary, summary_updated_at, created_at, updated_at
    FROM chat_conversations
    ORDER BY updated_at DESC
    LIMIT ? OFFSET ?
  `
    )
    .all(limit, offset) as any[];

  return {
    conversations: rows,
    total,
  };
}

// Delete a conversation
export function deleteConversation(id: number): boolean {
  const db = getDatabase();
  initConversationsTable();

  const result = db.prepare("DELETE FROM chat_conversations WHERE id = ?").run(id);
  return result.changes > 0;
}

// Search conversations by title or content
export function searchConversations(query: string, limit = 20): Omit<Conversation, "messages">[] {
  const db = getDatabase();
  initConversationsTable();

  const rows = db
    .prepare(
      `
    SELECT id, title, summary, summary_updated_at, created_at, updated_at
    FROM chat_conversations
    WHERE title LIKE ? OR messages LIKE ?
    ORDER BY updated_at DESC
    LIMIT ?
  `
    )
    .all(`%${query}%`, `%${query}%`, limit) as any[];

  return rows;
}

// Update conversation summary
export function updateConversationSummary(id: number, summary: string): boolean {
  const db = getDatabase();
  initConversationsTable();

  const result = db
    .prepare(
      `
    UPDATE chat_conversations
    SET summary = ?, summary_updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `
    )
    .run(summary, id);

  return result.changes > 0;
}

// Get conversations without summaries (for backfill)
export function getConversationsWithoutSummary(limit = 5): Conversation[] {
  const db = getDatabase();
  initConversationsTable();

  const rows = db
    .prepare(
      `
    SELECT *
    FROM chat_conversations
    WHERE summary IS NULL
    ORDER BY updated_at DESC
    LIMIT ?
  `
    )
    .all(limit) as any[];

  return rows.map((row) => ({
    ...row,
    messages: JSON.parse(row.messages),
  }));
}

// Check if conversation has changes since last summary
export function conversationHasChanges(id: number): boolean {
  const db = getDatabase();
  initConversationsTable();

  const row = db
    .prepare(
      `
    SELECT
      updated_at,
      summary_updated_at
    FROM chat_conversations
    WHERE id = ?
  `
    )
    .get(id) as any;

  if (!row) return false;

  // No summary yet = has changes
  if (!row.summary_updated_at) return true;

  // Compare dates - if updated_at > summary_updated_at, there are changes
  return new Date(row.updated_at) > new Date(row.summary_updated_at);
}
