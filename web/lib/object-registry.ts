/**
 * Tartarus Object Registry
 *
 * Universal index for all data objects in the system.
 * Every entity gets a UUID, making it searchable via `search` and fetchable via `fetch`.
 *
 * This is additive — existing tables are untouched. The registry sits alongside them
 * as a unified discovery layer.
 */

import { randomUUID } from "node:crypto";
import { getDatabase } from "./db";

// ─── Types ─────────────────────────────────────────────────

export interface ObjectRecord {
  uuid: string;
  type: string;
  source_table: string;
  source_id: string;
  title: string | null;
  summary: string | null;
  tags: string[];
  importance: number;
  estimated_tokens: number;
  created_at: string;
  updated_at: string;
}

interface ObjectRow {
  uuid: string;
  type: string;
  source_table: string;
  source_id: string;
  title: string | null;
  summary: string | null;
  tags: string;
  importance: number;
  estimated_tokens: number;
  created_at: string;
  updated_at: string;
}

export interface RegisterObjectOpts {
  type: string;
  sourceTable: string;
  sourceId: string;
  title?: string;
  summary?: string;
  tags?: string[];
  importance?: number;
  estimatedTokens?: number;
}

// ─── Table Init ────────────────────────────────────────────

let initialized = false;

export function initObjectRegistry(): void {
  if (initialized) return;
  const db = getDatabase();

  db.exec(`
    CREATE TABLE IF NOT EXISTS tartarus_objects (
      uuid TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      source_table TEXT NOT NULL,
      source_id TEXT NOT NULL,
      title TEXT,
      summary TEXT,
      tags TEXT DEFAULT '[]',
      importance INTEGER DEFAULT 0,
      estimated_tokens INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(source_table, source_id)
    )
  `);

  // Indexes (idempotent)
  db.exec(`CREATE INDEX IF NOT EXISTS idx_tartarus_objects_type ON tartarus_objects(type)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_tartarus_objects_title ON tartarus_objects(title)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_tartarus_objects_source ON tartarus_objects(source_table, source_id)`);

  // Object history — append-only snapshots for version tracking
  db.exec(`
    CREATE TABLE IF NOT EXISTS tartarus_object_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      object_uuid TEXT NOT NULL,
      version INTEGER NOT NULL,
      snapshot TEXT NOT NULL,
      changed_by TEXT DEFAULT 'system',
      change_summary TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (object_uuid) REFERENCES tartarus_objects(uuid) ON DELETE CASCADE
    )
  `);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_object_history_uuid ON tartarus_object_history(object_uuid)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_object_history_version ON tartarus_object_history(object_uuid, version)`);

  initialized = true;
}

// ─── Row → Record ──────────────────────────────────────────

function rowToRecord(row: ObjectRow): ObjectRecord {
  return {
    ...row,
    tags: JSON.parse(row.tags || "[]"),
  };
}

// ─── Write Operations ──────────────────────────────────────

/**
 * Register an object in the registry. Returns its UUID.
 * If the object already exists (same source_table + source_id), updates it and returns existing UUID.
 */
export function registerObject(opts: RegisterObjectOpts): string {
  initObjectRegistry();
  const db = getDatabase();

  // Check if already registered
  const existing = db
    .prepare("SELECT uuid FROM tartarus_objects WHERE source_table = ? AND source_id = ?")
    .get(opts.sourceTable, opts.sourceId) as { uuid: string } | undefined;

  if (existing) {
    // Update existing record
    db.prepare(`
      UPDATE tartarus_objects
      SET title = COALESCE(?, title),
          summary = COALESCE(?, summary),
          tags = COALESCE(?, tags),
          importance = COALESCE(?, importance),
          estimated_tokens = COALESCE(?, estimated_tokens),
          updated_at = CURRENT_TIMESTAMP
      WHERE uuid = ?
    `).run(
      opts.title ?? null,
      opts.summary ?? null,
      opts.tags ? JSON.stringify(opts.tags) : null,
      opts.importance ?? null,
      opts.estimatedTokens ?? null,
      existing.uuid,
    );
    return existing.uuid;
  }

  // Create new record
  const uuid = randomUUID();
  db.prepare(`
    INSERT INTO tartarus_objects (uuid, type, source_table, source_id, title, summary, tags, importance, estimated_tokens)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    uuid,
    opts.type,
    opts.sourceTable,
    opts.sourceId,
    opts.title ?? null,
    opts.summary ?? null,
    JSON.stringify(opts.tags ?? []),
    opts.importance ?? 0,
    opts.estimatedTokens ?? 0,
  );

  return uuid;
}

/**
 * Update summary, tags, and importance for an object.
 */
export function updateObjectSummary(
  uuid: string,
  summary: string,
  tags?: string[],
  importance?: number,
): void {
  initObjectRegistry();
  const db = getDatabase();

  db.prepare(`
    UPDATE tartarus_objects
    SET summary = ?,
        tags = COALESCE(?, tags),
        importance = COALESCE(?, importance),
        updated_at = CURRENT_TIMESTAMP
    WHERE uuid = ?
  `).run(
    summary,
    tags ? JSON.stringify(tags) : null,
    importance ?? null,
    uuid,
  );
}

/**
 * Delete an object from the registry.
 */
export function deleteObject(uuid: string): boolean {
  initObjectRegistry();
  const db = getDatabase();
  const result = db.prepare("DELETE FROM tartarus_objects WHERE uuid = ?").run(uuid);
  return result.changes > 0;
}

/**
 * Delete an object by its source reference.
 */
export function deleteObjectBySource(sourceTable: string, sourceId: string): boolean {
  initObjectRegistry();
  const db = getDatabase();
  const result = db
    .prepare("DELETE FROM tartarus_objects WHERE source_table = ? AND source_id = ?")
    .run(sourceTable, sourceId);
  return result.changes > 0;
}

// ─── Snapshot / History ────────────────────────────────────

export interface HistoryEntry {
  id: number;
  object_uuid: string;
  version: number;
  snapshot: Record<string, unknown>;
  changed_by: string;
  change_summary: string | null;
  created_at: string;
}

interface HistoryRow {
  id: number;
  object_uuid: string;
  version: number;
  snapshot: string;
  changed_by: string;
  change_summary: string | null;
  created_at: string;
}

/**
 * Take a snapshot of an object's current state before mutating it.
 * Call this BEFORE updating the object in its source table.
 */
export function snapshotBeforeUpdate(
  uuid: string,
  snapshot: Record<string, unknown>,
  changedBy: string = "system",
  changeSummary?: string,
): number {
  initObjectRegistry();
  const db = getDatabase();

  // Get next version number
  const last = db
    .prepare("SELECT MAX(version) as v FROM tartarus_object_history WHERE object_uuid = ?")
    .get(uuid) as { v: number | null } | undefined;
  const nextVersion = (last?.v ?? 0) + 1;

  const result = db.prepare(`
    INSERT INTO tartarus_object_history (object_uuid, version, snapshot, changed_by, change_summary)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    uuid,
    nextVersion,
    JSON.stringify(snapshot),
    changedBy,
    changeSummary ?? null,
  );

  return result.lastInsertRowid as number;
}

/**
 * Get version history for an object.
 */
export function getObjectHistory(
  uuid: string,
  limit: number = 20,
): HistoryEntry[] {
  initObjectRegistry();
  const db = getDatabase();

  const rows = db
    .prepare(
      "SELECT * FROM tartarus_object_history WHERE object_uuid = ? ORDER BY version DESC LIMIT ?",
    )
    .all(uuid, limit) as HistoryRow[];

  return rows.map((r) => ({
    ...r,
    snapshot: JSON.parse(r.snapshot),
  }));
}

/**
 * Get a specific version snapshot.
 */
export function getObjectVersion(
  uuid: string,
  version: number,
): HistoryEntry | null {
  initObjectRegistry();
  const db = getDatabase();

  const row = db
    .prepare(
      "SELECT * FROM tartarus_object_history WHERE object_uuid = ? AND version = ?",
    )
    .get(uuid, version) as HistoryRow | undefined;

  if (!row) return null;
  return { ...row, snapshot: JSON.parse(row.snapshot) };
}

/**
 * Get the version count for an object.
 */
export function getObjectVersionCount(uuid: string): number {
  initObjectRegistry();
  const db = getDatabase();
  const row = db
    .prepare("SELECT COUNT(*) as count FROM tartarus_object_history WHERE object_uuid = ?")
    .get(uuid) as { count: number };
  return row.count;
}

// ─── Read Operations ───────────────────────────────────────

/**
 * Look up an object by UUID.
 */
export function lookupByUUID(uuid: string): ObjectRecord | null {
  initObjectRegistry();
  const db = getDatabase();
  const row = db
    .prepare("SELECT * FROM tartarus_objects WHERE uuid = ?")
    .get(uuid) as ObjectRow | undefined;
  return row ? rowToRecord(row) : null;
}

/**
 * Look up an object by its source table and ID.
 */
export function lookupBySource(sourceTable: string, sourceId: string): ObjectRecord | null {
  initObjectRegistry();
  const db = getDatabase();
  const row = db
    .prepare("SELECT * FROM tartarus_objects WHERE source_table = ? AND source_id = ?")
    .get(sourceTable, sourceId) as ObjectRow | undefined;
  return row ? rowToRecord(row) : null;
}

/**
 * Search objects by keyword (matches title + summary) with optional type filter.
 */
export function searchObjects(
  query: string,
  type?: string,
  limit: number = 20,
): ObjectRecord[] {
  initObjectRegistry();
  const db = getDatabase();

  const pattern = `%${query}%`;

  let sql = `
    SELECT * FROM tartarus_objects
    WHERE (title LIKE ? OR summary LIKE ? OR tags LIKE ?)
  `;
  const params: (string | number)[] = [pattern, pattern, pattern];

  if (type) {
    sql += " AND type = ?";
    params.push(type);
  }

  sql += " ORDER BY updated_at DESC LIMIT ?";
  params.push(limit);

  const rows = db.prepare(sql).all(...params) as ObjectRow[];
  return rows.map(rowToRecord);
}

/**
 * List objects by type with pagination.
 */
export function listObjectsByType(
  type: string,
  limit: number = 50,
  offset: number = 0,
): { objects: ObjectRecord[]; total: number } {
  initObjectRegistry();
  const db = getDatabase();

  const total = (
    db.prepare("SELECT COUNT(*) as count FROM tartarus_objects WHERE type = ?").get(type) as { count: number }
  ).count;

  const rows = db
    .prepare("SELECT * FROM tartarus_objects WHERE type = ? ORDER BY updated_at DESC LIMIT ? OFFSET ?")
    .all(type, limit, offset) as ObjectRow[];

  return { objects: rows.map(rowToRecord), total };
}

/**
 * Get counts by type — useful for dashboard/stats.
 */
export function getObjectCounts(): Record<string, number> {
  initObjectRegistry();
  const db = getDatabase();
  const rows = db
    .prepare("SELECT type, COUNT(*) as count FROM tartarus_objects GROUP BY type")
    .all() as { type: string; count: number }[];
  return Object.fromEntries(rows.map((r) => [r.type, r.count]));
}
