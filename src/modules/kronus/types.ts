import { z } from 'zod';

/**
 * Kronus Agent Types
 *
 * Types and schemas for the Kronus knowledge oracle agent
 */

/**
 * Input schema for kronus_ask tool
 */
export const KronusAskInputSchema = z.object({
  question: z.string().min(1).describe('Question about projects, work, or repository data'),
  repository: z.string().optional().describe('Focus on specific repository (optional)'),
  depth: z.enum(['quick', 'deep']).default('quick').describe('quick=summaries only, deep=full content access'),
});

export type KronusAskInput = z.infer<typeof KronusAskInputSchema>;

/**
 * Response from Kronus agent
 */
export interface KronusResponse {
  answer: string;
  sources: KronusSource[];
  depth_used: 'quick' | 'deep';
}

/**
 * Source reference in Kronus response
 */
export interface KronusSource {
  type: 'journal_entry' | 'project_summary' | 'document' | 'linear_issue' | 'linear_project' | 'attachment';
  identifier: string; // commit_hash, slug, ENG-XXX, etc.
  title?: string;
  relevance?: string; // Why this source was used
}

/**
 * Summaries index structure for quick mode
 */
export interface SummariesIndex {
  // Core journal data
  projectSummaries: ProjectSummaryIndex[];
  journalEntries: JournalEntryIndex[];

  // Linear integration
  linearIssues: LinearIssueIndex[];
  linearProjects: LinearProjectIndex[];

  // Repository content
  documents: DocumentIndex[];

  // Media & attachments
  attachments: AttachmentIndex[];
}

export interface ProjectSummaryIndex {
  repository: string;
  summary: string | null;
  status: string | null;
  technologies: string | null;
  updated_at: string;
  entry_count?: number;
}

export interface JournalEntryIndex {
  commit_hash: string;
  repository: string;
  branch: string;
  date: string;
  summary: string | null;
  why?: string; // Include why for context
}

export interface LinearIssueIndex {
  identifier: string;
  title: string;
  summary: string | null;
  stateName: string | null;
  priority: number | null;
  projectName: string | null;
}

export interface LinearProjectIndex {
  id: string;
  name: string;
  summary: string | null;
  state: string | null;
  progress: number | null;
}

export interface DocumentIndex {
  slug: string;
  type: string;
  title: string;
  summary: string | null;
  language: string | null;
}

export interface AttachmentIndex {
  id: number;
  commit_hash: string;
  filename: string;
  mime_type: string;
  description: string | null;
}
