import { z } from "zod";

/**
 * Zod schemas for validation
 */

// Input schema: What the agent sends to the MCP
export const AgentInputSchema = z.object({
  commit_hash: z.string().min(7).describe("Git commit SHA (minimum 7 chars)"),
  repository: z.string().min(1).describe("Repository/project name"),
  branch: z.string().min(1).describe("Git branch name"),
  author: z.string().min(1).describe("Git commit author"),
  date: z.string().describe("Commit date (ISO 8601 format)"),
  raw_agent_report: z.string().min(10).describe("Agent's full context dump"),
});

// File change schema for tracking what files were modified
export const FileChangeSchema = z.object({
  path: z.string().describe("Full file path"),
  action: z
    .enum(["created", "modified", "deleted", "renamed"])
    .describe("Type of change"),
  diff_summary: z
    .string()
    .optional()
    .describe("Brief summary of the change (not full diff)"),
  old_path: z
    .string()
    .optional()
    .describe("For renames: the previous file path"),
});

// AI output schema: What Kronus generates from the report
export const AIOutputSchema = z.object({
  why: z.string().min(10).describe("Why are we doing this change"),
  what_changed: z.string().min(10).describe("What exactly has been changed"),
  decisions: z.string().min(10).describe("Decisions made and reasoning"),
  technologies: z.string().min(3).describe("Technologies/frameworks discussed"),
  kronus_wisdom: z
    .string()
    .nullable()
    .optional()
    .describe("Poem, lesson, or wisdom from Kronus"),
  files_changed: z
    .array(FileChangeSchema)
    .nullable()
    .optional()
    .describe(
      "STRONGLY REQUESTED: List of files that were created, modified, deleted, or renamed. Extract from the agent report.",
    ),
  summary: z
    .string()
    .min(10)
    .describe(
      "MANDATORY: Dense 3-sentence summary for indexing. Sentence 1: What changed and why. Sentence 2: Key technical details. Sentence 3: Impact or status.",
    ),
});

// Project summary schema: Overview of the entire repository
export const ProjectSummaryInputSchema = z.object({
  repository: z.string().min(1).describe("Repository/project name"),
  git_url: z
    .string()
    .url()
    .optional()
    .describe("Git repository URL (optional - for linking to source)"),
  summary: z.string().min(10).describe("High-level project summary"),
  purpose: z.string().min(10).describe("Why this project exists"),
  architecture: z
    .string()
    .min(10)
    .describe("Overall architecture and structure"),
  key_decisions: z.string().min(10).describe("Major architectural decisions"),
  technologies: z.string().min(3).describe("Core technologies used"),
  status: z.string().min(3).describe("Current project status"),
  linear_project_id: z
    .string()
    .optional()
    .describe(
      "Optional Linear project ID to link this repository to a Linear project",
    ),
  linear_issue_id: z
    .string()
    .optional()
    .describe(
      "Optional Linear issue ID to link this repository to a Linear issue",
    ),
});

/**
 * TypeScript types derived from Zod schemas
 */

export type AgentInput = z.infer<typeof AgentInputSchema>;
export type AIOutput = z.infer<typeof AIOutputSchema>;
export type ProjectSummaryInput = z.infer<typeof ProjectSummaryInputSchema>;

/**
 * Database types
 */

/**
 * File change tracking for journal entries
 */
export interface FileChange {
  path: string; // Full file path (required)
  action: "created" | "modified" | "deleted" | "renamed";
  diff_summary?: string; // Brief summary of change (not full diff)
  old_path?: string; // For renames
}

export interface JournalEntry {
  id: number;
  commit_hash: string;
  repository: string;
  branch: string;
  author: string;
  code_author?: string | null;
  team_members?: string;
  date: string;
  why: string;
  what_changed: string;
  decisions: string;
  technologies: string;
  kronus_wisdom: string | null;
  raw_agent_report: string;
  created_at: string;
  // File change tracking (JSON array stored as TEXT)
  files_changed?: FileChange[] | null;
  // AI-generated 3-sentence summary for indexing
  summary?: string | null;
}

export interface JournalEntryInsert {
  commit_hash: string;
  repository: string;
  branch: string;
  author: string;
  code_author?: string | null;
  team_members?: string;
  date: string;
  why: string;
  what_changed: string;
  decisions: string;
  technologies: string;
  kronus_wisdom: string | null;
  raw_agent_report: string;
  files_changed?: FileChange[] | null;
  summary?: string | null;
}

export interface ProjectSummary {
  id: number;
  repository: string;
  git_url: string | null;
  summary: string | null;
  purpose: string | null;
  architecture: string | null;
  key_decisions: string | null;
  technologies: string | null;
  status: string | null;
  updated_at: string;
  // Journal entry statistics for this repository
  entry_count?: number; // Number of journal entries
  last_entry_date?: string | null; // Date of the last journal entry (ISO format)
  // Optional Linear integration
  linear_project_id?: string | null; // Linear project ID if linked to a Linear project
  linear_issue_id?: string | null; // Linear issue ID if linked to a Linear issue
  // Living Project Summary (Entry 0) - Enhanced fields
  file_structure?: string | null; // Git-style file tree (agent-provided)
  tech_stack?: string | null; // Frameworks, libraries, versions (indicative)
  frontend?: string | null; // FE patterns, components, state management
  backend?: string | null; // BE routes, middleware, auth patterns
  database_info?: string | null; // Schema, ORM patterns, migrations (renamed to avoid SQL keyword)
  services?: string | null; // External APIs, integrations
  custom_tooling?: string | null; // Project-specific utilities
  data_flow?: string | null; // How data is processed
  patterns?: string | null; // Naming conventions, code style
  commands?: string | null; // Dev, deploy, make commands
  extended_notes?: string | null; // Gotchas, TODOs, historical context
  // Sync tracking
  last_synced_entry?: string | null; // Last journal entry hash used for update
  entries_synced?: number | null; // Count of entries analyzed
}

export interface ProjectSummaryInsert {
  repository: string;
  git_url?: string | null;
  summary?: string | null;
  purpose?: string | null;
  architecture?: string | null;
  key_decisions?: string | null;
  technologies?: string | null;
  status?: string | null;
  linear_project_id?: string | null;
  linear_issue_id?: string | null;
  // Living Project Summary (Entry 0) - Enhanced fields
  file_structure?: string | null;
  tech_stack?: string | null;
  frontend?: string | null;
  backend?: string | null;
  database_info?: string | null;
  services?: string | null;
  custom_tooling?: string | null;
  data_flow?: string | null;
  patterns?: string | null;
  commands?: string | null;
  extended_notes?: string | null;
  last_synced_entry?: string | null;
  entries_synced?: number | null;
}

/**
 * Attachment types for storing files (images, diagrams, etc.)
 */

export interface Attachment {
  id: number;
  commit_hash: string;
  filename: string;
  mime_type: string;
  description: string | null;
  data: Buffer;
  file_size: number;
  uploaded_at: string;
}

export interface AttachmentInsert {
  commit_hash: string;
  filename: string;
  mime_type: string;
  description: string | null;
  data: Buffer;
  file_size: number;
}

/**
 * Zod schema for attachment upload
 */
export const AttachmentInputSchema = z.object({
  commit_hash: z.string().min(7).describe("Git commit SHA (minimum 7 chars)"),
  filename: z
    .string()
    .min(1)
    .describe("Filename with extension (e.g., diagram.png, architecture.mmd)"),
  mime_type: z
    .string()
    .min(3)
    .describe(
      "MIME type (e.g., image/png, image/svg+xml, text/plain for Mermaid)",
    ),
  description: z
    .string()
    .optional()
    .describe(
      'Optional description of what the attachment shows (e.g., "System architecture diagram", "Before/after comparison")',
    ),
  data_base64: z.string().min(1).describe("Base64-encoded file data"),
});

export type AttachmentInput = z.infer<typeof AttachmentInputSchema>;

/**
 * Media Library - Unified access to entry_attachments + media_assets
 */
export const MediaLibraryInputSchema = z.object({
  repository: z
    .string()
    .optional()
    .describe("Filter by repository name (searches commit_hash links)"),
  commit_hash: z
    .string()
    .min(7)
    .optional()
    .describe("Filter by specific commit hash"),
  destination: z
    .enum(["journal", "repository", "media", "portfolio", "all"])
    .optional()
    .default("all")
    .describe("Filter by asset destination/category"),
  mime_type_prefix: z
    .string()
    .optional()
    .describe('Filter by MIME type prefix (e.g., "image/", "application/pdf")'),
  tags: z
    .array(z.string())
    .optional()
    .describe("Filter by tags (media_assets only)"),
  limit: z
    .number()
    .optional()
    .default(50)
    .describe("Max items to return (default: 50, max: 100)"),
  offset: z.number().optional().default(0).describe("Pagination offset"),
  include_metadata: z
    .boolean()
    .optional()
    .default(true)
    .describe("Include full metadata (alt, prompt, model, dimensions)"),
});

export type MediaLibraryInput = z.infer<typeof MediaLibraryInputSchema>;

export interface UnifiedMediaItem {
  source: "entry_attachments" | "media_assets";
  source_id: number;
  filename: string;
  mime_type: string;
  file_size: number;
  description: string | null;
  commit_hash: string | null;
  repository: string | null;
  document_id: number | null;
  destination: string | null;
  // Extended metadata (from media_assets)
  alt: string | null;
  prompt: string | null;
  model: string | null;
  tags: string | null; // JSON array
  width: number | null;
  height: number | null;
  drive_url: string | null;
  supabase_url: string | null;
  created_at: string;
}

export interface MediaLibraryResponse {
  total: number;
  showing: string;
  has_more: boolean;
  sources: {
    entry_attachments: number;
    media_assets: number;
  };
  base_url: string | null;
  download_enabled: boolean;
  items: Array<{
    id: string; // "attachment:123" or "media:456"
    source: "entry_attachments" | "media_assets";
    source_id: number;
    filename: string;
    mime_type: string;
    file_size: number;
    description: string | null;
    download_url: string | null;
    commit_hash: string | null;
    repository: string | null;
    document_id: number | null;
    destination: string | null;
    metadata?: {
      alt?: string;
      prompt?: string;
      model?: string;
      tags?: string[];
      width?: number;
      height?: number;
      drive_url?: string;
      supabase_url?: string;
    };
    created_at: string;
  }>;
}

// ============================================================================
// Entry 0 v2 — Distilled Memory with Shallow/Deep Views
// ============================================================================

/**
 * A single history entry tracking when a section changed.
 * Stored within each section's JSON.
 */
export interface HistoryEntry {
  date: string; // ISO timestamp
  commit: string; // commit hash at time of change
  change_summary: string; // brief: what changed and why
  previous_value?: string; // optional: the old content (for critical reversals)
}

/**
 * A section with its current value and evolution history.
 * This is the storage format for each Entry 0 section in sections_json.
 *
 * Shallow view: returns only `current`
 * Deep view: returns `current` + `history`
 */
export interface SectionWithHistory {
  current: string; // the NOW state
  last_updated: string; // ISO timestamp
  last_commit: string; // commit hash when last updated
  history: HistoryEntry[]; // evolution trail (newest first)
}

/**
 * All Entry 0 section names.
 * Technical sections are filled by the coding agent.
 * Narrative sections are filled by Kronus from journal entries.
 */
export const TECHNICAL_SECTIONS = [
  "file_structure",
  "tech_stack",
  "patterns",
  "commands",
  "architecture",
  "frontend",
  "backend",
  "database_info",
  "services",
  "data_flow",
  "custom_tooling",
] as const;

export const NARRATIVE_SECTIONS = [
  "summary",
  "purpose",
  "key_decisions",
  "technologies",
  "status",
  "extended_notes",
] as const;

/** Tier 1 sections — required on creation (wrong code without them) */
export const TIER1_SECTIONS = [
  "file_structure",
  "tech_stack",
  "patterns",
  "commands",
  "architecture",
] as const;

export type TechnicalSection = (typeof TECHNICAL_SECTIONS)[number];
export type NarrativeSection = (typeof NARRATIVE_SECTIONS)[number];
export type AllSection = TechnicalSection | NarrativeSection;

/**
 * The sections_json blob stored in the database.
 * Maps section names to their current value + history.
 */
export type SectionsJson = Partial<Record<AllSection, SectionWithHistory>>;

/**
 * Entry 0 v2 — ProjectSummary with structured sections.
 * Extends the original ProjectSummary with the new JSON sections column.
 */
export interface ProjectSummaryV2 extends ProjectSummary {
  schema_version: number; // 1 = legacy flat columns, 2 = sections_json
  sections_json: SectionsJson | null;
  last_scanned_commit: string | null;
  total_updates: number;
}

/** Current schema version for new entries */
export const CURRENT_SCHEMA_VERSION = 2;

// ─── Tool Input Schemas ──────────────────────────────────

/**
 * Tool 1: journal_create_project_summary
 * Agent fills exhaustive schema. Kronus validates + persists.
 */
export const ProjectSummaryCreateSchemaV2 = z.object({
  repository: z.string().min(1).describe("Repository/project name"),
  git_url: z
    .string()
    .optional()
    .describe("Git remote URL (https or ssh)"),
  current_commit: z
    .string()
    .min(7)
    .describe("Current HEAD commit hash at time of creation"),

  // Tier 1 — required (wrong code without these)
  file_structure: z
    .string()
    .min(1)
    .describe(
      "Annotated directory tree from git. Show key dirs/files with brief " +
        "inline annotations. Use indentation, not ASCII tree chars. " +
        "Example: 'src/modules/journal/ — Entry CRUD, Entry 0 management'",
    ),
  tech_stack: z
    .string()
    .min(1)
    .describe(
      "All frameworks, libraries, and their EXACT versions. " +
        "Group by category: Runtime, Framework, UI, Database, Testing, Build, DevOps. " +
        "Example: 'Runtime: Node.js 22, TypeScript 5.8.3'",
    ),
  patterns: z
    .string()
    .min(1)
    .describe(
      "Code conventions: naming style (camelCase/snake_case/PascalCase), " +
        "import patterns (barrel exports, direct imports), error handling approach, " +
        "file organization, module system, testing patterns.",
    ),
  commands: z
    .string()
    .min(1)
    .describe(
      "ALL dev/build/deploy/test commands. Extract EXACT strings from " +
        "Makefile, package.json scripts, docker-compose, CI configs. " +
        "Example: 'npm run build — esbuild bundle to dist/'",
    ),
  architecture: z
    .string()
    .min(1)
    .describe(
      "System boundaries and module responsibilities. What talks to what. " +
        "Which layer handles which concern. Key interfaces between components.",
    ),

  // Tier 2 — optional (not all projects have all)
  frontend: z
    .string()
    .optional()
    .describe(
      "Frontend patterns: component library, state management, routing, " +
        "styling approach, key components. Empty if no frontend.",
    ),
  backend: z
    .string()
    .optional()
    .describe(
      "Backend patterns: API route structure, middleware stack, auth approach, " +
        "server framework, request handling. Empty if no backend.",
    ),
  database_info: z
    .string()
    .optional()
    .describe(
      "Database: engine + version, ORM/query builder, key tables/models, " +
        "migration approach, schema patterns. Empty if no database.",
    ),
  services: z
    .string()
    .optional()
    .describe(
      "External APIs and integrations: what's integrated, how (SDK/REST/GraphQL), " +
        "which env vars. Empty if none.",
    ),
  data_flow: z
    .string()
    .optional()
    .describe(
      "How data moves: entry points → processing → storage → output. " +
        "Key data transformations and pipelines.",
    ),

  // Tier 3 — optional (usually filled by Tool 3 later)
  custom_tooling: z
    .string()
    .optional()
    .describe(
      "Project-specific utilities, CLI tools, scripts, code generators. " +
        "Empty if none.",
    ),
  purpose: z
    .string()
    .optional()
    .describe("What the project does and why it exists."),
  summary: z
    .string()
    .optional()
    .describe("3-sentence project description."),
});

export type ProjectSummaryCreateInputV2 = z.infer<
  typeof ProjectSummaryCreateSchemaV2
>;

/**
 * Tool 2: journal_update_project_technical
 * Agent sends what changed + git diff context.
 */
export const ProjectTechnicalUpdateSchema = z.object({
  repository: z.string().min(1).describe("Repository/project name"),
  from_commit: z
    .string()
    .min(7)
    .describe(
      "Last known commit hash (from Entry 0's last_scanned_commit)",
    ),
  to_commit: z
    .string()
    .min(7)
    .describe("Current HEAD commit hash"),
  agent_report: z
    .string()
    .min(10)
    .describe(
      "What changed since from_commit and why. Include key decisions, " +
        "new patterns, removed/added dependencies, structural changes.",
    ),
  diff_summary: z
    .string()
    .optional()
    .describe(
      "Output of 'git diff --stat from_commit..to_commit'. " +
        "Helps identify which sections need updating.",
    ),

  // Only sections that changed (missing = no change)
  file_structure: z.string().optional(),
  tech_stack: z.string().optional(),
  patterns: z.string().optional(),
  commands: z.string().optional(),
  architecture: z.string().optional(),
  frontend: z.string().optional(),
  backend: z.string().optional(),
  database_info: z.string().optional(),
  services: z.string().optional(),
  data_flow: z.string().optional(),
  custom_tooling: z.string().optional(),
});

export type ProjectTechnicalUpdateInput = z.infer<
  typeof ProjectTechnicalUpdateSchema
>;

/**
 * Tool 3: journal_update_project_narrative
 * Kronus summarizes journal entries into narrative sections.
 */
export const ProjectNarrativeUpdateSchema = z.object({
  repository: z
    .string()
    .min(1)
    .describe("Repository/project name"),
  raw_report: z
    .string()
    .min(10)
    .describe(
      "Agent observations, context, and narrative about the project. " +
        "The soul/spirit of the project — why decisions were made, " +
        "what the project means, where it's going.",
    ),
  include_recent_entries: z
    .number()
    .optional()
    .default(5)
    .describe(
      "Number of recent journal entries to analyze for context (default: 5)",
    ),

  // Narrative sections only (missing = no change)
  summary: z
    .string()
    .optional()
    .describe("3-sentence project description."),
  purpose: z
    .string()
    .optional()
    .describe("Primary goals and objectives."),
  key_decisions: z
    .string()
    .optional()
    .describe("Important decisions with reasoning."),
  technologies: z
    .string()
    .optional()
    .describe("High-level tech choices and WHY."),
  status: z
    .string()
    .optional()
    .describe("Current project status, WIP areas, known issues."),
  extended_notes: z
    .string()
    .optional()
    .describe("Gotchas, TODOs, historical context."),
});

export type ProjectNarrativeUpdateInput = z.infer<
  typeof ProjectNarrativeUpdateSchema
>;
