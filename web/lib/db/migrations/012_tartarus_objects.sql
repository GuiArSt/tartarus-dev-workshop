-- Tartarus Object Registry
-- Universal index for all data objects in the system.
-- Every entity (journal entry, document, conversation, Linear issue, etc.)
-- gets a UUID and summary, making it searchable and fetchable via two generic tools.

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
);

CREATE INDEX IF NOT EXISTS idx_tartarus_objects_type ON tartarus_objects(type);
CREATE INDEX IF NOT EXISTS idx_tartarus_objects_title ON tartarus_objects(title);
CREATE INDEX IF NOT EXISTS idx_tartarus_objects_source ON tartarus_objects(source_table, source_id);

-- Object history — append-only snapshots for version tracking
CREATE TABLE IF NOT EXISTS tartarus_object_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  object_uuid TEXT NOT NULL,
  version INTEGER NOT NULL,
  snapshot TEXT NOT NULL,
  changed_by TEXT DEFAULT 'system',
  change_summary TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (object_uuid) REFERENCES tartarus_objects(uuid) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_object_history_uuid ON tartarus_object_history(object_uuid);
CREATE INDEX IF NOT EXISTS idx_object_history_version ON tartarus_object_history(object_uuid, version);
