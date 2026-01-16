-- Migration: Add summary columns for Kronus indexing
-- Summary: AI-generated 3-sentence summaries for efficient retrieval

-- Documents
ALTER TABLE documents ADD COLUMN summary TEXT;

-- Linear Projects
ALTER TABLE linear_projects ADD COLUMN summary TEXT;

-- Linear Issues
ALTER TABLE linear_issues ADD COLUMN summary TEXT;

-- Media Assets (if exists)
-- Note: media_assets table may already exist from previous migrations
-- ALTER TABLE media_assets ADD COLUMN summary TEXT;
