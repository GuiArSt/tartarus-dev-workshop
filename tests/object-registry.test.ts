#!/usr/bin/env npx tsx
/**
 * Object Registry Test Suite
 *
 * Tests the tartarus_objects registry and history system.
 * Uses a temporary in-memory database to avoid touching production data.
 *
 * Run: npx tsx tests/object-registry.test.ts
 */

import Database from "better-sqlite3";
import { randomUUID } from "node:crypto";
import assert from "node:assert/strict";

// ─── Test DB Setup ─────────────────────────────────────────

const db = new Database(":memory:");
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// Create registry tables (mirror of object-registry.ts init)
db.exec(`
  CREATE TABLE tartarus_objects (
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
  );
  CREATE INDEX idx_objects_type ON tartarus_objects(type);
  CREATE INDEX idx_objects_source ON tartarus_objects(source_table, source_id);

  CREATE TABLE tartarus_object_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    object_uuid TEXT NOT NULL,
    version INTEGER NOT NULL,
    snapshot TEXT NOT NULL,
    changed_by TEXT DEFAULT 'system',
    change_summary TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (object_uuid) REFERENCES tartarus_objects(uuid) ON DELETE CASCADE
  );
  CREATE INDEX idx_history_uuid ON tartarus_object_history(object_uuid);
`);

// ─── Helper functions (mirroring object-registry.ts logic) ──

function registerObject(opts: {
  type: string;
  sourceTable: string;
  sourceId: string;
  title?: string;
  summary?: string;
  tags?: string[];
}): string {
  const existing = db
    .prepare("SELECT uuid FROM tartarus_objects WHERE source_table = ? AND source_id = ?")
    .get(opts.sourceTable, opts.sourceId) as { uuid: string } | undefined;

  if (existing) {
    db.prepare(`
      UPDATE tartarus_objects
      SET title = COALESCE(?, title), summary = COALESCE(?, summary),
          tags = COALESCE(?, tags), updated_at = CURRENT_TIMESTAMP
      WHERE uuid = ?
    `).run(opts.title ?? null, opts.summary ?? null, opts.tags ? JSON.stringify(opts.tags) : null, existing.uuid);
    return existing.uuid;
  }

  const uuid = randomUUID();
  db.prepare(`
    INSERT INTO tartarus_objects (uuid, type, source_table, source_id, title, summary, tags)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(uuid, opts.type, opts.sourceTable, opts.sourceId, opts.title ?? null, opts.summary ?? null, JSON.stringify(opts.tags ?? []));
  return uuid;
}

function lookupByUUID(uuid: string) {
  return db.prepare("SELECT * FROM tartarus_objects WHERE uuid = ?").get(uuid) as any;
}

function lookupBySource(table: string, id: string) {
  return db.prepare("SELECT * FROM tartarus_objects WHERE source_table = ? AND source_id = ?").get(table, id) as any;
}

function searchObjects(query: string, type?: string, limit = 20) {
  const pattern = `%${query}%`;
  let sql = "SELECT * FROM tartarus_objects WHERE (title LIKE ? OR summary LIKE ? OR tags LIKE ?)";
  const params: any[] = [pattern, pattern, pattern];
  if (type) { sql += " AND type = ?"; params.push(type); }
  sql += " ORDER BY updated_at DESC LIMIT ?";
  params.push(limit);
  return db.prepare(sql).all(...params) as any[];
}

function snapshotBeforeUpdate(uuid: string, snapshot: Record<string, unknown>, changedBy = "system", changeSummary?: string) {
  const last = db.prepare("SELECT MAX(version) as v FROM tartarus_object_history WHERE object_uuid = ?").get(uuid) as any;
  const version = (last?.v ?? 0) + 1;
  db.prepare("INSERT INTO tartarus_object_history (object_uuid, version, snapshot, changed_by, change_summary) VALUES (?, ?, ?, ?, ?)")
    .run(uuid, version, JSON.stringify(snapshot), changedBy, changeSummary ?? null);
  return version;
}

function getHistory(uuid: string) {
  return db.prepare("SELECT * FROM tartarus_object_history WHERE object_uuid = ? ORDER BY version DESC").all(uuid) as any[];
}

// ─── Tests ─────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err: any) {
    failed++;
    console.log(`  ✗ ${name}`);
    console.log(`    ${err.message}`);
  }
}

console.log("\n═══ Object Registry Tests ═══\n");

// --- Register ---

test("registerObject creates a new object with UUID", () => {
  const uuid = registerObject({ type: "document", sourceTable: "documents", sourceId: "my-doc", title: "My Document" });
  assert.ok(uuid, "UUID should be returned");
  assert.match(uuid, /^[0-9a-f-]{36}$/i, "UUID should be valid v4 format");
});

test("registerObject returns same UUID for duplicate source", () => {
  const uuid1 = registerObject({ type: "document", sourceTable: "documents", sourceId: "my-doc", title: "My Document" });
  const uuid2 = registerObject({ type: "document", sourceTable: "documents", sourceId: "my-doc", title: "Updated Title" });
  assert.equal(uuid1, uuid2, "Same source should return same UUID");
});

test("registerObject updates title on re-register", () => {
  registerObject({ type: "document", sourceTable: "documents", sourceId: "my-doc", title: "Updated Title" });
  const obj = lookupBySource("documents", "my-doc");
  assert.equal(obj.title, "Updated Title");
});

test("registerObject preserves existing fields on partial update", () => {
  registerObject({ type: "skill", sourceTable: "skills", sourceId: "ts", title: "TypeScript", summary: "A typed language" });
  registerObject({ type: "skill", sourceTable: "skills", sourceId: "ts", title: "TypeScript 5" });
  const obj = lookupBySource("skills", "ts");
  assert.equal(obj.title, "TypeScript 5", "Title should update");
  assert.equal(obj.summary, "A typed language", "Summary should be preserved (COALESCE)");
});

test("registerObject stores tags as JSON", () => {
  registerObject({ type: "document", sourceTable: "documents", sourceId: "tagged-doc", title: "Tagged", tags: ["auth", "api"] });
  const obj = lookupBySource("documents", "tagged-doc");
  const tags = JSON.parse(obj.tags);
  assert.deepEqual(tags, ["auth", "api"]);
});

// --- Lookup ---

test("lookupByUUID finds registered object", () => {
  const uuid = registerObject({ type: "conversation", sourceTable: "chat_conversations", sourceId: "1", title: "Chat 1" });
  const obj = lookupByUUID(uuid);
  assert.ok(obj, "Should find by UUID");
  assert.equal(obj.type, "conversation");
  assert.equal(obj.title, "Chat 1");
});

test("lookupByUUID returns null for unknown UUID", () => {
  const obj = lookupByUUID("nonexistent-uuid");
  assert.equal(obj, undefined);
});

test("lookupBySource finds registered object", () => {
  const obj = lookupBySource("chat_conversations", "1");
  assert.ok(obj, "Should find by source");
  assert.equal(obj.type, "conversation");
});

// --- Search ---

test("searchObjects finds by title", () => {
  registerObject({ type: "journal_entry", sourceTable: "journal_entries", sourceId: "abc1234", title: "Fixed authentication bug" });
  const results = searchObjects("authentication");
  assert.ok(results.length > 0, "Should find by title keyword");
});

test("searchObjects finds by summary", () => {
  registerObject({ type: "journal_entry", sourceTable: "journal_entries", sourceId: "def5678", title: "Refactor", summary: "Improved database query performance" });
  const results = searchObjects("database");
  assert.ok(results.length > 0, "Should find by summary keyword");
});

test("searchObjects filters by type", () => {
  const allResults = searchObjects("TypeScript");
  const skillResults = searchObjects("TypeScript", "skill");
  assert.ok(allResults.length >= skillResults.length, "Filtered should be subset");
  for (const r of skillResults) {
    assert.equal(r.type, "skill");
  }
});

test("searchObjects respects limit", () => {
  for (let i = 0; i < 5; i++) {
    registerObject({ type: "document", sourceTable: "documents", sourceId: `limit-test-${i}`, title: `Limit Test ${i}` });
  }
  const results = searchObjects("Limit Test", undefined, 3);
  assert.ok(results.length <= 3, "Should respect limit");
});

test("searchObjects finds by tags", () => {
  registerObject({ type: "document", sourceTable: "documents", sourceId: "tag-search", title: "Some Doc", tags: ["kubernetes", "deploy"] });
  const results = searchObjects("kubernetes");
  assert.ok(results.length > 0, "Should find by tag content");
});

// --- Snapshot / History ---

test("snapshotBeforeUpdate creates version 1", () => {
  const uuid = registerObject({ type: "document", sourceTable: "documents", sourceId: "versioned", title: "v1" });
  const version = snapshotBeforeUpdate(uuid, { title: "v1", content: "original" }, "user");
  assert.equal(version, 1);
});

test("snapshotBeforeUpdate increments version", () => {
  const uuid = lookupBySource("documents", "versioned").uuid;
  const v2 = snapshotBeforeUpdate(uuid, { title: "v2", content: "updated" }, "kronus", "Title changed");
  assert.equal(v2, 2);
  const v3 = snapshotBeforeUpdate(uuid, { title: "v3", content: "final" }, "user");
  assert.equal(v3, 3);
});

test("getHistory returns versions in reverse order", () => {
  const uuid = lookupBySource("documents", "versioned").uuid;
  const history = getHistory(uuid);
  assert.equal(history.length, 3);
  assert.equal(history[0].version, 3, "Newest first");
  assert.equal(history[2].version, 1, "Oldest last");
});

test("history snapshot contains correct data", () => {
  const uuid = lookupBySource("documents", "versioned").uuid;
  const history = getHistory(uuid);
  const v1 = history.find((h: any) => h.version === 1);
  const snapshot = JSON.parse(v1.snapshot);
  assert.equal(snapshot.title, "v1");
  assert.equal(snapshot.content, "original");
});

test("history tracks changed_by", () => {
  const uuid = lookupBySource("documents", "versioned").uuid;
  const history = getHistory(uuid);
  assert.equal(history.find((h: any) => h.version === 1).changed_by, "user");
  assert.equal(history.find((h: any) => h.version === 2).changed_by, "kronus");
});

test("history tracks change_summary", () => {
  const uuid = lookupBySource("documents", "versioned").uuid;
  const history = getHistory(uuid);
  assert.equal(history.find((h: any) => h.version === 2).change_summary, "Title changed");
  assert.equal(history.find((h: any) => h.version === 1).change_summary, null);
});

// --- Delete ---

test("delete removes object", () => {
  const uuid = registerObject({ type: "document", sourceTable: "documents", sourceId: "to-delete", title: "Doomed" });
  const result = db.prepare("DELETE FROM tartarus_objects WHERE uuid = ?").run(uuid);
  assert.equal(result.changes, 1);
  assert.equal(lookupByUUID(uuid), undefined);
});

test("delete cascades to history", () => {
  const uuid = registerObject({ type: "document", sourceTable: "documents", sourceId: "cascade-test", title: "Will cascade" });
  snapshotBeforeUpdate(uuid, { title: "snapshot" }, "test");
  db.prepare("DELETE FROM tartarus_objects WHERE uuid = ?").run(uuid);
  const history = getHistory(uuid);
  assert.equal(history.length, 0, "History should be deleted on cascade");
});

// --- UNIQUE constraint ---

test("UNIQUE(source_table, source_id) prevents duplicates", () => {
  registerObject({ type: "skill", sourceTable: "skills", sourceId: "unique-test", title: "First" });
  // Direct INSERT should fail
  assert.throws(() => {
    db.prepare("INSERT INTO tartarus_objects (uuid, type, source_table, source_id, title) VALUES (?, ?, ?, ?, ?)")
      .run(randomUUID(), "skill", "skills", "unique-test", "Second");
  }, /UNIQUE constraint/);
});

// --- Type counts ---

test("can count objects by type", () => {
  const rows = db.prepare("SELECT type, COUNT(*) as count FROM tartarus_objects GROUP BY type").all() as any[];
  assert.ok(rows.length > 0, "Should have type counts");
  const docCount = rows.find((r: any) => r.type === "document");
  assert.ok(docCount, "Should have document count");
});

// ─── Results ───────────────────────────────────────────────

console.log(`\n═══ Results: ${passed} passed, ${failed} failed ═══\n`);
db.close();
process.exit(failed > 0 ? 1 : 0);
