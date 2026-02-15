-- Linear Project Updates - status posts on projects
-- Cached locally from Linear API, preserves history
CREATE TABLE IF NOT EXISTS linear_project_updates (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  project_name TEXT,
  body TEXT NOT NULL,
  health TEXT, -- "onTrack" | "atRisk" | "offTrack"
  user_id TEXT,
  user_name TEXT,
  synced_at TEXT DEFAULT CURRENT_TIMESTAMP,
  is_deleted INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_project_updates_project_id ON linear_project_updates(project_id);
