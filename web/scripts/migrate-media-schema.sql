-- Migration: Enhance media_assets table for multi-storage support
-- Run with: sqlite3 journal.db < scripts/migrate-media-schema.sql

-- Add new columns for storage URLs and metadata
ALTER TABLE media_assets ADD COLUMN alt TEXT;
ALTER TABLE media_assets ADD COLUMN drive_url TEXT;
ALTER TABLE media_assets ADD COLUMN supabase_url TEXT;
ALTER TABLE media_assets ADD COLUMN portfolio_project_id TEXT REFERENCES portfolio_projects(id) ON DELETE SET NULL;
ALTER TABLE media_assets ADD COLUMN width INTEGER;
ALTER TABLE media_assets ADD COLUMN height INTEGER;

-- Make data column nullable (for external-only storage)
-- SQLite doesn't support ALTER COLUMN, so this is just documentation
-- The schema already defines it as nullable in Drizzle

-- Update destination enum to include 'portfolio'
-- SQLite doesn't enforce enums, so no migration needed

SELECT 'Migration complete: media_assets table enhanced for multi-storage support';
