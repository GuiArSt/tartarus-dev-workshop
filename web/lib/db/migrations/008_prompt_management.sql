-- Migration: Prompt Management System
-- Date: 2026-01-25
-- Description: Creates tables for prompts, prompt projects, versions, and trace links

-- ============================================================================
-- PROMPT PROJECTS
-- Groups of related prompts (e.g., 'kronus-oracle', 'tartarus-system')
-- ============================================================================
CREATE TABLE IF NOT EXISTS prompt_projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'archived', 'draft')),
  tags TEXT DEFAULT '[]',
  metadata TEXT DEFAULT '{}',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- PROMPTS
-- First-class prompt entities with versioning
-- ============================================================================
CREATE TABLE IF NOT EXISTS prompts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  project_id TEXT REFERENCES prompt_projects(id) ON DELETE SET NULL,
  -- Core content
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'system' CHECK(role IN ('system', 'user', 'assistant', 'chat')),
  -- Prompt metadata
  purpose TEXT,
  input_schema TEXT,
  output_schema TEXT,
  config TEXT,
  -- Versioning
  version INTEGER NOT NULL DEFAULT 1,
  is_latest INTEGER NOT NULL DEFAULT 1,
  parent_version_id INTEGER REFERENCES prompts(id) ON DELETE SET NULL,
  -- Status
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'draft', 'deprecated', 'archived')),
  -- Classification
  tags TEXT DEFAULT '[]',
  language TEXT DEFAULT 'en',
  -- AI summary for Kronus indexing
  summary TEXT,
  -- Legacy document link (for migration)
  legacy_document_id INTEGER,
  -- Timestamps
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for prompts
CREATE INDEX IF NOT EXISTS idx_prompts_project_id ON prompts(project_id);
CREATE INDEX IF NOT EXISTS idx_prompts_slug ON prompts(slug);
CREATE INDEX IF NOT EXISTS idx_prompts_role ON prompts(role);
CREATE INDEX IF NOT EXISTS idx_prompts_status ON prompts(status);
CREATE INDEX IF NOT EXISTS idx_prompts_is_latest ON prompts(is_latest);
CREATE INDEX IF NOT EXISTS idx_prompts_parent_version ON prompts(parent_version_id);

-- ============================================================================
-- PROMPT-JOURNAL ENTRY LINKS
-- Connect prompts to journal entries
-- ============================================================================
CREATE TABLE IF NOT EXISTS prompt_entry_links (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  prompt_id INTEGER NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
  commit_hash TEXT NOT NULL,
  link_type TEXT NOT NULL DEFAULT 'reference' CHECK(link_type IN ('reference', 'used_by', 'created_for')),
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(prompt_id, commit_hash, link_type)
);

CREATE INDEX IF NOT EXISTS idx_prompt_entry_links_prompt ON prompt_entry_links(prompt_id);
CREATE INDEX IF NOT EXISTS idx_prompt_entry_links_entry ON prompt_entry_links(commit_hash);

-- ============================================================================
-- PROMPT-TRACE LINKS
-- Connect prompts to AI traces for observability
-- ============================================================================
CREATE TABLE IF NOT EXISTS prompt_trace_links (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  prompt_id INTEGER NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
  trace_id TEXT NOT NULL,
  prompt_version INTEGER NOT NULL,
  -- Performance metrics (copied from trace for quick access)
  input_tokens INTEGER,
  output_tokens INTEGER,
  latency_ms INTEGER,
  cost_usd REAL,
  status TEXT,
  -- Timestamps
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_prompt_trace_links_prompt ON prompt_trace_links(prompt_id);
CREATE INDEX IF NOT EXISTS idx_prompt_trace_links_trace ON prompt_trace_links(trace_id);
CREATE INDEX IF NOT EXISTS idx_prompt_trace_links_created ON prompt_trace_links(created_at DESC);
