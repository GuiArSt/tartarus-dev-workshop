/**
 * Observability - Lightweight self-hosted tracing for AI calls (MCP Server)
 *
 * Tracks:
 * - AI model calls (input/output tokens, latency, cost)
 * - Trace hierarchy (parent-child spans)
 * - Errors and retries
 * - Kronus chat conversations
 *
 * Storage: SQLite tables (ai_traces, kronus_chats)
 */

import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { logger } from './logger.js';

let db: Database.Database | null = null;

// ============================================================================
// Database Setup
// ============================================================================

function getDbPath(): string {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  // Walk up to find project root
  let currentDir = __dirname;
  for (let i = 0; i < 10; i++) {
    if (
      fs.existsSync(path.join(currentDir, 'package.json')) ||
      fs.existsSync(path.join(currentDir, 'Soul.xml'))
    ) {
      break;
    }
    const parent = path.dirname(currentDir);
    if (parent === currentDir) break;
    currentDir = parent;
  }

  return path.join(currentDir, 'data', 'observability.db');
}

function ensureDb(): Database.Database {
  if (db) return db;

  const dbPath = getDbPath();
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('busy_timeout = 5000');

  // Create tables
  db.exec(`
    -- AI Traces table
    CREATE TABLE IF NOT EXISTS ai_traces (
      id TEXT PRIMARY KEY,
      trace_id TEXT NOT NULL,
      parent_span_id TEXT,
      name TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'span',
      model TEXT,
      input TEXT,
      output TEXT,
      input_tokens INTEGER,
      output_tokens INTEGER,
      total_tokens INTEGER,
      latency_ms INTEGER,
      cost_usd REAL,
      status TEXT NOT NULL DEFAULT 'running',
      error_message TEXT,
      metadata TEXT,
      started_at TEXT NOT NULL,
      ended_at TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_ai_traces_trace_id ON ai_traces(trace_id);
    CREATE INDEX IF NOT EXISTS idx_ai_traces_started_at ON ai_traces(started_at DESC);
    CREATE INDEX IF NOT EXISTS idx_ai_traces_name ON ai_traces(name);

    -- Kronus Chat table (stores kronus_ask conversations)
    CREATE TABLE IF NOT EXISTS kronus_chats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      trace_id TEXT NOT NULL,
      question TEXT NOT NULL,
      answer TEXT NOT NULL,
      repository TEXT,
      depth TEXT NOT NULL DEFAULT 'quick',
      sources TEXT,
      tool_calls TEXT,
      input_tokens INTEGER,
      output_tokens INTEGER,
      latency_ms INTEGER,
      cost_usd REAL,
      status TEXT NOT NULL DEFAULT 'success',
      error_message TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_kronus_chats_trace_id ON kronus_chats(trace_id);
    CREATE INDEX IF NOT EXISTS idx_kronus_chats_created_at ON kronus_chats(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_kronus_chats_repository ON kronus_chats(repository);
  `);

  logger.info(`Observability DB initialized at: ${dbPath}`);
  return db;
}

// ============================================================================
// Types
// ============================================================================

export interface TraceSpan {
  id: string;
  trace_id: string;
  parent_span_id: string | null;
  name: string;
  type: 'generation' | 'span' | 'event';
  model?: string;
  input?: unknown;
  output?: unknown;
  input_tokens?: number;
  output_tokens?: number;
  total_tokens?: number;
  latency_ms?: number;
  cost_usd?: number;
  status: 'running' | 'success' | 'error';
  error_message?: string;
  metadata?: Record<string, unknown>;
  started_at: string;
  ended_at?: string;
}

export interface KronusChat {
  id?: number;
  trace_id: string;
  question: string;
  answer: string;
  repository?: string;
  depth: 'quick' | 'deep';
  sources?: unknown[];
  tool_calls?: unknown[];
  input_tokens?: number;
  output_tokens?: number;
  latency_ms?: number;
  cost_usd?: number;
  status: 'success' | 'error';
  error_message?: string;
  created_at?: string;
}

export interface TraceContext {
  traceId: string;
  spanId: string;
}

// ============================================================================
// Cost calculation (per 1M tokens)
// ============================================================================

const MODEL_COSTS: Record<string, { input: number; output: number }> = {
  'claude-sonnet-4-5-20250929': { input: 3.0, output: 15.0 },
  'claude-haiku-4-5-20250514': { input: 0.8, output: 4.0 },
  'claude-opus-4-5-20251101': { input: 15.0, output: 75.0 },
  // AI SDK model aliases
  'claude-haiku-4-5': { input: 0.8, output: 4.0 },
  'claude-sonnet-4-5': { input: 3.0, output: 15.0 },
  'claude-opus-4-5': { input: 15.0, output: 75.0 },
};

export function calculateCost(
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const costs = MODEL_COSTS[model];
  if (!costs) return 0;
  return (inputTokens * costs.input + outputTokens * costs.output) / 1_000_000;
}

// ============================================================================
// ID Generation
// ============================================================================

function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

// ============================================================================
// Trace Context Management
// ============================================================================

let currentContext: TraceContext | null = null;
const contextStack: Map<string, TraceContext | null> = new Map();

/**
 * Start a new trace (top-level operation)
 */
export function startTrace(name: string, metadata?: Record<string, unknown>): TraceContext {
  const database = ensureDb();
  const traceId = generateId();
  const spanId = generateId();

  database
    .prepare(
      `
    INSERT INTO ai_traces (id, trace_id, parent_span_id, name, type, status, metadata, started_at)
    VALUES (?, ?, NULL, ?, 'span', 'running', ?, datetime('now'))
  `
    )
    .run(spanId, traceId, name, metadata ? JSON.stringify(metadata) : null);

  currentContext = { traceId, spanId };
  logger.debug(`[Trace] START ${name} trace=${traceId}`);

  return currentContext;
}

/**
 * Start a child span under the current context
 */
export function startSpan(
  name: string,
  options: {
    type?: 'generation' | 'span' | 'event';
    model?: string;
    input?: unknown;
    metadata?: Record<string, unknown>;
  } = {}
): string {
  const database = ensureDb();
  const spanId = generateId();
  const traceId = currentContext?.traceId ?? generateId();
  const parentSpanId = currentContext?.spanId ?? null;

  database
    .prepare(
      `
    INSERT INTO ai_traces (id, trace_id, parent_span_id, name, type, model, input, status, metadata, started_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'running', ?, datetime('now'))
  `
    )
    .run(
      spanId,
      traceId,
      parentSpanId,
      name,
      options.type ?? 'span',
      options.model ?? null,
      options.input ? JSON.stringify(options.input) : null,
      options.metadata ? JSON.stringify(options.metadata) : null
    );

  // Store previous context for restoration
  contextStack.set(spanId, currentContext);
  currentContext = { traceId, spanId };

  logger.debug(`[Span] START ${name} span=${spanId} model=${options.model || 'none'}`);

  return spanId;
}

/**
 * End a span with results
 */
export function endSpan(
  spanId: string,
  options: {
    output?: unknown;
    inputTokens?: number;
    outputTokens?: number;
    error?: Error | string;
  } = {}
): void {
  const database = ensureDb();
  const spanData = database.prepare('SELECT started_at, model, name FROM ai_traces WHERE id = ?').get(spanId) as
    | { started_at: string; model: string | null; name: string }
    | undefined;

  if (!spanData) {
    logger.warn(`[Observability] Span ${spanId} not found`);
    return;
  }

  const latencyMs = Date.now() - new Date(spanData.started_at).getTime();
  const totalTokens = (options.inputTokens ?? 0) + (options.outputTokens ?? 0);

  const cost = spanData.model ? calculateCost(spanData.model, options.inputTokens ?? 0, options.outputTokens ?? 0) : 0;

  database
    .prepare(
      `
    UPDATE ai_traces SET
      output = ?,
      input_tokens = ?,
      output_tokens = ?,
      total_tokens = ?,
      latency_ms = ?,
      cost_usd = ?,
      status = ?,
      error_message = ?,
      ended_at = datetime('now')
    WHERE id = ?
  `
    )
    .run(
      options.output ? JSON.stringify(options.output) : null,
      options.inputTokens ?? null,
      options.outputTokens ?? null,
      totalTokens || null,
      latencyMs,
      cost || null,
      options.error ? 'error' : 'success',
      options.error ? (typeof options.error === 'string' ? options.error : options.error.message) : null,
      spanId
    );

  const status = options.error ? 'ERROR' : 'OK';
  logger.debug(
    `[Span] END ${spanData.name} span=${spanId} ${status} latency=${latencyMs}ms tokens=${options.inputTokens ?? 0}/${options.outputTokens ?? 0}`
  );

  // Restore parent context
  const previousContext = contextStack.get(spanId);
  currentContext = previousContext ?? null;
  contextStack.delete(spanId);
}

/**
 * End the current trace
 */
export function endTrace(options: { error?: Error | string } = {}): void {
  if (!currentContext) return;

  const database = ensureDb();
  const traceId = currentContext.traceId;

  // Find root span
  const rootSpan = database
    .prepare('SELECT id, started_at, name FROM ai_traces WHERE trace_id = ? AND parent_span_id IS NULL')
    .get(traceId) as { id: string; started_at: string; name: string } | undefined;

  if (rootSpan) {
    const latencyMs = Date.now() - new Date(rootSpan.started_at).getTime();

    // Calculate total cost for trace
    const totals = database
      .prepare(
        `
        SELECT SUM(cost_usd) as total_cost, SUM(input_tokens) as total_input, SUM(output_tokens) as total_output
        FROM ai_traces WHERE trace_id = ? AND type = 'generation'
      `
      )
      .get(traceId) as { total_cost: number | null; total_input: number | null; total_output: number | null };

    database
      .prepare(
        `
      UPDATE ai_traces SET
        input_tokens = ?, output_tokens = ?, total_tokens = ?,
        latency_ms = ?, cost_usd = ?, status = ?, error_message = ?, ended_at = datetime('now')
      WHERE id = ?
    `
      )
      .run(
        totals.total_input,
        totals.total_output,
        (totals.total_input ?? 0) + (totals.total_output ?? 0),
        latencyMs,
        totals.total_cost,
        options.error ? 'error' : 'success',
        options.error ? (typeof options.error === 'string' ? options.error : options.error.message) : null,
        rootSpan.id
      );

    const status = options.error ? 'ERROR' : 'OK';
    logger.debug(`[Trace] END ${rootSpan.name} ${status} latency=${latencyMs}ms cost=$${totals.total_cost?.toFixed(4) ?? '0'}`);
  }

  currentContext = null;
}

/**
 * Get current trace ID
 */
export function getCurrentTraceId(): string | null {
  return currentContext?.traceId ?? null;
}

// ============================================================================
// Kronus Chat Storage
// ============================================================================

/**
 * Store a Kronus chat conversation
 */
export function storeKronusChat(chat: Omit<KronusChat, 'id' | 'created_at'>): number {
  const database = ensureDb();

  const result = database
    .prepare(
      `
    INSERT INTO kronus_chats (
      trace_id, question, answer, repository, depth, sources, tool_calls,
      input_tokens, output_tokens, latency_ms, cost_usd, status, error_message
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `
    )
    .run(
      chat.trace_id,
      chat.question,
      chat.answer,
      chat.repository ?? null,
      chat.depth,
      chat.sources ? JSON.stringify(chat.sources) : null,
      chat.tool_calls ? JSON.stringify(chat.tool_calls) : null,
      chat.input_tokens ?? null,
      chat.output_tokens ?? null,
      chat.latency_ms ?? null,
      chat.cost_usd ?? null,
      chat.status,
      chat.error_message ?? null
    );

  logger.info(`[KronusChat] Stored chat trace=${chat.trace_id} depth=${chat.depth}`);
  return result.lastInsertRowid as number;
}

/**
 * Get recent Kronus chats
 */
export function getRecentKronusChats(limit = 50): KronusChat[] {
  const database = ensureDb();
  const rows = database.prepare('SELECT * FROM kronus_chats ORDER BY created_at DESC LIMIT ?').all(limit) as any[];

  return rows.map((row) => ({
    ...row,
    sources: row.sources ? JSON.parse(row.sources) : undefined,
    tool_calls: row.tool_calls ? JSON.parse(row.tool_calls) : undefined,
  }));
}

/**
 * Get Kronus chats by repository
 */
export function getKronusChatsByRepository(repository: string, limit = 50): KronusChat[] {
  const database = ensureDb();
  const rows = database
    .prepare('SELECT * FROM kronus_chats WHERE repository = ? ORDER BY created_at DESC LIMIT ?')
    .all(repository, limit) as any[];

  return rows.map((row) => ({
    ...row,
    sources: row.sources ? JSON.parse(row.sources) : undefined,
    tool_calls: row.tool_calls ? JSON.parse(row.tool_calls) : undefined,
  }));
}

// ============================================================================
// Query functions
// ============================================================================

export function getRecentTraces(limit = 50): TraceSpan[] {
  const database = ensureDb();
  return database
    .prepare('SELECT * FROM ai_traces WHERE parent_span_id IS NULL ORDER BY started_at DESC LIMIT ?')
    .all(limit) as TraceSpan[];
}

export function getTraceSpans(traceId: string): TraceSpan[] {
  const database = ensureDb();
  return database.prepare('SELECT * FROM ai_traces WHERE trace_id = ? ORDER BY started_at ASC').all(traceId) as TraceSpan[];
}

export function getTraceStats(days = 7): {
  total_traces: number;
  total_tokens: number;
  total_cost: number;
  avg_latency_ms: number;
  error_rate: number;
  kronus_chats: number;
} {
  const database = ensureDb();

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  const stats = database
    .prepare(
      `
      SELECT
        COUNT(DISTINCT trace_id) as total_traces,
        SUM(CASE WHEN type = 'generation' THEN total_tokens ELSE 0 END) as total_tokens,
        SUM(CASE WHEN type = 'generation' THEN cost_usd ELSE 0 END) as total_cost,
        AVG(CASE WHEN parent_span_id IS NULL THEN latency_ms END) as avg_latency_ms,
        AVG(CASE WHEN status = 'error' THEN 1.0 ELSE 0.0 END) as error_rate
      FROM ai_traces WHERE started_at >= ?
    `
    )
    .get(cutoff.toISOString()) as {
    total_traces: number;
    total_tokens: number;
    total_cost: number;
    avg_latency_ms: number;
    error_rate: number;
  };

  const kronusStats = database
    .prepare('SELECT COUNT(*) as count FROM kronus_chats WHERE created_at >= ?')
    .get(cutoff.toISOString()) as { count: number };

  return {
    ...stats,
    kronus_chats: kronusStats.count,
  };
}

// ============================================================================
// Close database
// ============================================================================

export function closeObservabilityDb(): void {
  if (db) {
    db.close();
    db = null;
    logger.info('Observability DB closed');
  }
}
