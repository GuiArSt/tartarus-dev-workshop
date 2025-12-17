import { z } from 'zod';

/**
 * Zod schemas for validation
 */

// Input schema: What the agent sends to the MCP
export const AgentInputSchema = z.object({
  commit_hash: z.string().min(7).describe('Git commit SHA (minimum 7 chars)'),
  repository: z.string().min(1).describe('Repository/project name'),
  branch: z.string().min(1).describe('Git branch name'),
  author: z.string().min(1).describe('Git commit author'),
  date: z.string().describe('Commit date (ISO 8601 format)'),
  raw_agent_report: z.string().min(10).describe('Agent\'s full context dump'),
});

// AI output schema: What Kronus generates from the report
export const AIOutputSchema = z.object({
  why: z.string().min(10).describe('Why are we doing this change'),
  what_changed: z.string().min(10).describe('What exactly has been changed'),
  decisions: z.string().min(10).describe('Decisions made and reasoning'),
  technologies: z.string().min(3).describe('Technologies/frameworks discussed'),
  kronus_wisdom: z.string().nullable().optional().describe('Poem, lesson, or wisdom from Kronus'),
});

// Project summary schema: Overview of the entire repository
export const ProjectSummaryInputSchema = z.object({
  repository: z.string().min(1).describe('Repository/project name'),
  git_url: z.string().url().describe('Git repository URL (required for verification)'),
  summary: z.string().min(10).describe('High-level project summary'),
  purpose: z.string().min(10).describe('Why this project exists'),
  architecture: z.string().min(10).describe('Overall architecture and structure'),
  key_decisions: z.string().min(10).describe('Major architectural decisions'),
  technologies: z.string().min(3).describe('Core technologies used'),
  status: z.string().min(3).describe('Current project status'),
  linear_project_id: z.string().optional().describe('Optional Linear project ID to link this repository to a Linear project'),
  linear_issue_id: z.string().optional().describe('Optional Linear issue ID to link this repository to a Linear issue'),
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

export interface JournalEntry {
  id: number;
  commit_hash: string;
  repository: string;
  branch: string;
  author: string;
  date: string;
  why: string;
  what_changed: string;
  decisions: string;
  technologies: string;
  kronus_wisdom: string | null;
  raw_agent_report: string;
  created_at: string;
}

export interface JournalEntryInsert {
  commit_hash: string;
  repository: string;
  branch: string;
  author: string;
  date: string;
  why: string;
  what_changed: string;
  decisions: string;
  technologies: string;
  kronus_wisdom: string | null;
  raw_agent_report: string;
}

export interface ProjectSummary {
  id: number;
  repository: string;
  git_url: string;
  summary: string;
  purpose: string;
  architecture: string;
  key_decisions: string;
  technologies: string;
  status: string;
  updated_at: string;
  // Journal entry statistics for this repository
  entry_count?: number; // Number of journal entries
  last_entry_date?: string | null; // Date of the last journal entry (ISO format)
  // Optional Linear integration
  linear_project_id?: string | null; // Linear project ID if linked to a Linear project
  linear_issue_id?: string | null; // Linear issue ID if linked to a Linear issue
}

export interface ProjectSummaryInsert {
  repository: string;
  git_url: string;
  summary: string;
  purpose: string;
  architecture: string;
  key_decisions: string;
  technologies: string;
  status: string;
  linear_project_id?: string | null;
  linear_issue_id?: string | null;
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
  commit_hash: z.string().min(7).describe('Git commit SHA (minimum 7 chars)'),
  filename: z.string().min(1).describe('Filename with extension (e.g., diagram.png, architecture.mmd)'),
  mime_type: z.string().min(3).describe('MIME type (e.g., image/png, image/svg+xml, text/plain for Mermaid)'),
  description: z.string().optional().describe('Optional description of what the attachment shows (e.g., "System architecture diagram", "Before/after comparison")'),
  data_base64: z.string().min(1).describe('Base64-encoded file data'),
});

export type AttachmentInput = z.infer<typeof AttachmentInputSchema>;
