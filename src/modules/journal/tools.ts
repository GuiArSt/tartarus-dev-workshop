import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { toMcpError } from '../../shared/errors.js';
import { logger } from '../../shared/logger.js';
import type { JournalConfig } from '../../shared/types.js';
import { generateJournalEntry } from './ai/generate-entry.js';
import {
  commitHasEntry,
  exportToSQL,
  getEntriesByBranch,
  getEntriesByRepository,
  getEntriesByBranchPaginated,
  getEntriesByRepositoryPaginated,
  getEntryByCommit,
  insertJournalEntry,
  listBranches,
  listRepositories,
  updateJournalEntry,
  updateRepositoryName,
  upsertProjectSummary,
  getProjectSummary,
  listAllProjectSummaries,
  listAllProjectSummariesPaginated,
  insertAttachment,
  getAttachmentsByCommit,
  getAttachmentMetadataByCommit,
  getAttachmentById,
  deleteAttachment,
  getAttachmentStats,
  updateAttachmentDescription,
  getAttachmentCountsForCommits,
} from './db/database.js';
import { AgentInputSchema, ProjectSummaryInputSchema, AttachmentInputSchema } from './types.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Auto-backup to SQL file after any database change
 * Detects if running locally (in Laboratory) or standalone (public)
 * Local: backs up to Laboratory root
 * Public: backs up to project root
 */
function autoBackup() {
  try {
    // Detect if we're in Laboratory (local mode) or standalone (public mode)
    // Check if we're inside a "Laboratory" directory structure
    const projectRoot = path.join(__dirname, '../../..');
    const parentDir = path.dirname(projectRoot);
    const isLocalMode = path.basename(parentDir) === 'Laboratory' && 
                        path.basename(projectRoot) === 'Developer Journal Workspace';
    
    let backupPath: string;
    if (isLocalMode) {
      // Local mode: backup to Laboratory root (shared across projects)
      // dist/modules/journal/ -> dist/modules/ -> dist/ -> project root -> Laboratory root
      backupPath = path.join(parentDir, 'journal_backup.sql');
    } else {
      // Public mode: backup to project root (self-contained)
      // dist/modules/journal/ -> dist/modules/ -> dist/ -> project root
      backupPath = path.join(projectRoot, 'journal_backup.sql');
    }
    
    exportToSQL(backupPath);
  } catch (error) {
    logger.error('Failed to auto-backup journal:', error);
  }
}

/**
 * MCP truncation limits: ~256 lines or ~10 KiB per tool output
 * Many MCP clients enforce these limits, so we ensure outputs stay within safe bounds
 */
const MAX_SAFE_LINES = 200; // Conservative limit (256 - buffer)
const MAX_SAFE_BYTES = 9000; // Conservative limit (10 KiB - buffer)

/**
 * Format entry for display, optionally excluding large fields
 */
function formatEntrySummary(entry: any, includeRawReport: boolean = false): any {
  const summary: any = {
    id: entry.id,
    commit_hash: entry.commit_hash,
    repository: entry.repository,
    branch: entry.branch,
    author: entry.author,
    date: entry.date,
    why: entry.why,
    what_changed: entry.what_changed,
    decisions: entry.decisions,
    technologies: entry.technologies,
    kronus_wisdom: entry.kronus_wisdom,
    created_at: entry.created_at,
  };
  
  if (includeRawReport) {
    summary.raw_agent_report = entry.raw_agent_report;
  } else {
    summary.raw_agent_report_truncated = entry.raw_agent_report
      ? `[${entry.raw_agent_report.length} chars - use include_raw_report=true to see full]`
      : null;
  }
  
  return summary;
}

/**
 * Truncate text output to safe limits
 * Accounts for truncation warning message size to ensure final output stays within limits
 */
function truncateOutput(text: string): string {
  const lines = text.split('\n');
  const bytes = Buffer.byteLength(text, 'utf8');
  
  // If already within limits, return as-is
  if (lines.length <= MAX_SAFE_LINES && bytes <= MAX_SAFE_BYTES) {
    return text;
  }
  
  // Reserve space for truncation warning (approximate: ~150 bytes)
  const WARNING_RESERVE = 200;
  const safeLineLimit = MAX_SAFE_LINES - 2; // Reserve 2 lines for warning
  const safeByteLimit = MAX_SAFE_BYTES - WARNING_RESERVE;
  
  // Truncate by lines first (more predictable)
  let truncated = lines.slice(0, safeLineLimit).join('\n');
  
  // Then check byte size
  if (Buffer.byteLength(truncated, 'utf8') > safeByteLimit) {
    // Truncate by bytes
    const buffer = Buffer.from(truncated, 'utf8');
    truncated = buffer.slice(0, safeByteLimit).toString('utf8');
    // Try to end at a safe point (not mid-character)
    const lastNewline = truncated.lastIndexOf('\n');
    if (lastNewline > safeByteLimit * 0.9) {
      truncated = truncated.slice(0, lastNewline);
    }
  }
  
  const totalLines = lines.length;
  const totalBytes = bytes;
  const shownLines = truncated.split('\n').length;
  const shownBytes = Buffer.byteLength(truncated, 'utf8');
  
  truncated += `\n\n[TRUNCATED: Showing ${shownLines}/${totalLines} lines, ${shownBytes}/${totalBytes} bytes. Use pagination parameters to see more.]`;
  
  return truncated;
}

/**
 * Register Journal tools with the MCP server
 */
export function registerJournalTools(server: McpServer, journalConfig?: JournalConfig) {
  logger.info('Registering Journal tools...');
  
  if (!journalConfig) {
    throw new Error('JournalConfig is required for journal tools');
  }

  // Tool 1: Create Journal Entry
  server.registerTool(
    'journal_create_entry',
    {
      title: 'Create Journal Entry',
      description:
        'Create a journal entry for a commit. Agent provides git metadata and raw report. Kronus (Haiku 4.5) analyzes and generates structured entry.',
      inputSchema: {
        commit_hash: AgentInputSchema.shape.commit_hash,
        repository: AgentInputSchema.shape.repository,
        branch: AgentInputSchema.shape.branch,
        author: AgentInputSchema.shape.author,
        date: AgentInputSchema.shape.date,
        raw_agent_report: AgentInputSchema.shape.raw_agent_report,
      },
    },
    async ({ commit_hash, repository, branch, author, date, raw_agent_report }) => {
      try {
        // Check if entry already exists
        if (commitHasEntry(commit_hash)) {
          return {
            content: [
              {
                type: 'text' as const,
                text: `⚠️ Journal entry already exists for commit ${commit_hash}`,
              },
            ],
          };
        }

        // Generate AI analysis
        const aiOutput = await generateJournalEntry({
          commit_hash,
          repository,
          branch,
          author,
          date,
          raw_agent_report,
        }, journalConfig);

        // Insert into database
        const entryId = insertJournalEntry({
          commit_hash,
          repository,
          branch,
          author,
          date,
          why: aiOutput.why,
          what_changed: aiOutput.what_changed,
          decisions: aiOutput.decisions,
          technologies: aiOutput.technologies,
          kronus_wisdom: aiOutput.kronus_wisdom ?? null,
          raw_agent_report,
        });

        // Auto-backup to SQL
        autoBackup();

        const summary = {
          success: true,
          entry_id: entryId,
          commit_hash,
          repository,
          branch,
          why: aiOutput.why,
          what_changed: aiOutput.what_changed,
          decisions: aiOutput.decisions,
          technologies: aiOutput.technologies,
          kronus_wisdom: aiOutput.kronus_wisdom || null,
        };

        const text = `✅ Journal entry created for ${repository}/${branch} (${commit_hash})\n\n${JSON.stringify(summary, null, 2)}`;
        
        return {
          content: [
            {
              type: 'text' as const,
              text: truncateOutput(text),
            },
          ],
        };
      } catch (error) {
        throw toMcpError(error);
      }
    }
  );

  // Tool 2: Get Entry by Commit
  server.registerTool(
    'journal_get_entry',
    {
      title: 'Get Journal Entry by Commit',
      description: 'Retrieve a journal entry by its commit hash. By default excludes raw_agent_report to comply with MCP truncation limits (~256 lines / 10 KiB). Use include_raw_report=true to include the full report.',
      inputSchema: {
        commit_hash: AgentInputSchema.shape.commit_hash,
        include_raw_report: z.boolean().optional().default(false).describe('Include full raw_agent_report field (can be very large, default: false)'),
      },
    },
    async ({ commit_hash, include_raw_report }) => {
      try {
        const entry = getEntryByCommit(commit_hash);

        if (!entry) {
          return {
            content: [
              {
                type: 'text' as const,
                text: `No journal entry found for commit ${commit_hash}`,
              },
            ],
          };
        }

        const summary = formatEntrySummary(entry, include_raw_report);
        const output = JSON.stringify(summary, null, 2);
        
        return {
          content: [
            {
              type: 'text' as const,
              text: truncateOutput(output),
            },
          ],
        };
      } catch (error) {
        throw toMcpError(error);
      }
    }
  );

  // Tool 3: List Entries by Repository
  server.registerTool(
    'journal_list_by_repository',
    {
      title: 'List Journal Entries by Repository',
      description: 'List journal entries for a repository with pagination. Returns 20 entries by default (max 50). Each entry includes attachment_count showing how many files (images, diagrams, etc.) are attached. Large fields (raw_agent_report) excluded by default to comply with MCP truncation limits (~256 lines / 10 KiB). Use journal_list_attachments to see attachment details for a specific commit.',
      inputSchema: {
        repository: AgentInputSchema.shape.repository,
        limit: z.number().optional().default(20).describe('Maximum number of entries to return (default: 20, max: 50)'),
        offset: z.number().optional().default(0).describe('Number of entries to skip for pagination (default: 0)'),
        include_raw_report: z.boolean().optional().default(false).describe('Include raw_agent_report in each entry (significantly increases output size, default: false)'),
      },
    },
    async ({ repository, limit, offset, include_raw_report }) => {
      try {
        const safeLimit = Math.min(limit || 20, 50); // Cap at 50
        const { entries, total } = getEntriesByRepositoryPaginated(repository, safeLimit, offset || 0);
        
        // Get attachment counts for all entries in this batch
        const commitHashes = entries.map(e => e.commit_hash);
        const attachmentCounts = getAttachmentCountsForCommits(commitHashes);
        
        const summaries = entries.map(e => {
          const summary = formatEntrySummary(e, include_raw_report);
          const attachmentCount = attachmentCounts.get(e.commit_hash) || 0;
          return {
            ...summary,
            attachment_count: attachmentCount,
            has_attachments: attachmentCount > 0,
          };
        });
        
        const output = {
          repository,
          total_entries: total,
          showing: `${offset || 0} to ${(offset || 0) + summaries.length}`,
          has_more: (offset || 0) + summaries.length < total,
          entries: summaries,
        };
        
        const text = `Found ${total} total entries for ${repository}:\n\n${JSON.stringify(output, null, 2)}`;
        
        return {
          content: [
            {
              type: 'text' as const,
              text: truncateOutput(text),
            },
          ],
        };
      } catch (error) {
        throw toMcpError(error);
      }
    }
  );

  // Tool 4: List Entries by Branch
  server.registerTool(
    'journal_list_by_branch',
    {
      title: 'List Journal Entries by Branch',
      description: 'List journal entries for a repository and branch with pagination. Returns 20 entries by default (max 50). Each entry includes attachment_count showing how many files (images, diagrams, etc.) are attached. Large fields (raw_agent_report) excluded by default to comply with MCP truncation limits (~256 lines / 10 KiB). Use journal_list_attachments to see attachment details for a specific commit.',
      inputSchema: {
        repository: AgentInputSchema.shape.repository,
        branch: AgentInputSchema.shape.branch,
        limit: z.number().optional().default(20).describe('Maximum number of entries to return (default: 20, max: 50)'),
        offset: z.number().optional().default(0).describe('Number of entries to skip for pagination (default: 0)'),
        include_raw_report: z.boolean().optional().default(false).describe('Include raw_agent_report in each entry (significantly increases output size, default: false)'),
      },
    },
    async ({ repository, branch, limit, offset, include_raw_report }) => {
      try {
        const safeLimit = Math.min(limit || 20, 50); // Cap at 50
        const { entries, total } = getEntriesByBranchPaginated(repository, branch, safeLimit, offset || 0);
        
        // Get attachment counts for all entries in this batch
        const commitHashes = entries.map(e => e.commit_hash);
        const attachmentCounts = getAttachmentCountsForCommits(commitHashes);
        
        const summaries = entries.map(e => {
          const summary = formatEntrySummary(e, include_raw_report);
          const attachmentCount = attachmentCounts.get(e.commit_hash) || 0;
          return {
            ...summary,
            attachment_count: attachmentCount,
            has_attachments: attachmentCount > 0,
          };
        });
        
        const output = {
          repository,
          branch,
          total_entries: total,
          showing: `${offset || 0} to ${(offset || 0) + summaries.length}`,
          has_more: (offset || 0) + summaries.length < total,
          entries: summaries,
        };
        
        const text = `Found ${total} total entries for ${repository}/${branch}:\n\n${JSON.stringify(output, null, 2)}`;
        
        return {
          content: [
            {
              type: 'text' as const,
              text: truncateOutput(text),
            },
          ],
        };
      } catch (error) {
        throw toMcpError(error);
      }
    }
  );

  // Tool 5: List Repositories
  server.registerTool(
    'journal_list_repositories',
    {
      title: 'List All Repositories',
      description: 'List all repositories that have journal entries. Returns a simple list of repository names. Output is truncation-safe and complies with MCP limits.',
      inputSchema: {},
    },
    async () => {
      try {
        const repositories = listRepositories();
        const text = `📚 ${repositories.length} repositories:\n${repositories.join('\n')}`;
        
        return {
          content: [
            {
              type: 'text' as const,
              text: truncateOutput(text),
            },
          ],
        };
      } catch (error) {
        throw toMcpError(error);
      }
    }
  );

  // Tool 6: List Branches
  server.registerTool(
    'journal_list_branches',
    {
      title: 'List Branches for Repository',
      description: 'List all branches in a repository that have journal entries. Returns a simple list of branch names. Output is truncation-safe and complies with MCP limits.',
      inputSchema: {
        repository: AgentInputSchema.shape.repository,
      },
    },
    async ({ repository }) => {
      try {
        const branches = listBranches(repository);
        const text = `🌿 ${branches.length} branches in ${repository}:\n${branches.join('\n')}`;
        
        return {
          content: [
            {
              type: 'text' as const,
              text: truncateOutput(text),
            },
          ],
        };
      } catch (error) {
        throw toMcpError(error);
      }
    }
  );

  // Tool 7: Edit Entry
  server.registerTool(
    'journal_edit_entry',
    {
      title: 'Edit Journal Entry',
      description: 'Update fields in an existing journal entry by commit hash.',
      inputSchema: {
        commit_hash: AgentInputSchema.shape.commit_hash,
        why: z.string().optional().describe('Updated why field'),
        what_changed: z.string().optional().describe('Updated what_changed field'),
        decisions: z.string().optional().describe('Updated decisions field'),
        technologies: z.string().optional().describe('Updated technologies field'),
        kronus_wisdom: z.string().nullable().optional().describe('Updated kronus_wisdom field'),
      },
    },
    async ({ commit_hash, why, what_changed, decisions, technologies, kronus_wisdom }) => {
      try {
        const updates: any = {};
        if (why !== undefined) updates.why = why;
        if (what_changed !== undefined) updates.what_changed = what_changed;
        if (decisions !== undefined) updates.decisions = decisions;
        if (technologies !== undefined) updates.technologies = technologies;
        if (kronus_wisdom !== undefined) updates.kronus_wisdom = kronus_wisdom;

        updateJournalEntry(commit_hash, updates);

        // Auto-backup to SQL
        autoBackup();

        const entry = getEntryByCommit(commit_hash);
        if (!entry) {
          throw new Error(`Entry not found for commit ${commit_hash}`);
        }

        const summary = formatEntrySummary(entry, false); // Exclude raw report by default
        const text = `✅ Updated journal entry for commit ${commit_hash}\n\n${JSON.stringify(summary, null, 2)}`;
        
        return {
          content: [
            {
              type: 'text' as const,
              text: truncateOutput(text),
            },
          ],
        };
      } catch (error) {
        throw toMcpError(error);
      }
    }
  );

  // Tool 8: Upsert Project Summary
  server.registerTool(
    'journal_upsert_project_summary',
    {
      title: 'Create or Update Project Summary',
      description:
        'Create or update the high-level summary for a repository. This is the "entry 0" that describes the entire project.',
      inputSchema: {
        repository: ProjectSummaryInputSchema.shape.repository,
        git_url: ProjectSummaryInputSchema.shape.git_url,
        summary: ProjectSummaryInputSchema.shape.summary,
        purpose: ProjectSummaryInputSchema.shape.purpose,
        architecture: ProjectSummaryInputSchema.shape.architecture,
        key_decisions: ProjectSummaryInputSchema.shape.key_decisions,
        technologies: ProjectSummaryInputSchema.shape.technologies,
        status: ProjectSummaryInputSchema.shape.status,
      },
    },
    async ({ repository, git_url, summary, purpose, architecture, key_decisions, technologies, status }) => {
      try {
        upsertProjectSummary({
          repository,
          git_url,
          summary,
          purpose,
          architecture,
          key_decisions,
          technologies,
          status,
        });

        // Auto-backup to SQL
        autoBackup();

        const projectSummary = getProjectSummary(repository);

        return {
          content: [
            {
              type: 'text' as const,
              text: `✅ Project summary created/updated for ${repository}\n\n${JSON.stringify(projectSummary, null, 2)}`,
            },
          ],
        };
      } catch (error) {
        throw toMcpError(error);
      }
    }
  );

  // Tool 9: Get Project Summary
  server.registerTool(
    'journal_get_project_summary',
    {
      title: 'Get Project Summary',
      description: 'Retrieve the high-level summary for a repository.',
      inputSchema: {
        repository: ProjectSummaryInputSchema.shape.repository,
      },
    },
    async ({ repository }) => {
      try {
        const projectSummary = getProjectSummary(repository);

        if (!projectSummary) {
          return {
            content: [
              {
                type: 'text' as const,
                text: `No project summary found for ${repository}`,
              },
            ],
          };
        }

        return {
          content: [
            {
              type: 'text' as const,
              text: `📋 Project Summary for ${repository}:\n\n${JSON.stringify(projectSummary, null, 2)}`,
            },
          ],
        };
      } catch (error) {
        throw toMcpError(error);
      }
    }
  );

  // Tool 10: List All Project Summaries
  server.registerTool(
    'journal_list_project_summaries',
    {
      title: 'List All Project Summaries',
      description: 'List project summaries across all repositories with pagination. Returns 30 summaries by default (max 50). Output complies with MCP truncation limits (~256 lines / 10 KiB). Use limit/offset for pagination.',
      inputSchema: {
        limit: z.number().optional().default(30).describe('Maximum number of summaries to return (default: 30, max: 50)'),
        offset: z.number().optional().default(0).describe('Number of summaries to skip for pagination (default: 0)'),
      },
    },
    async ({ limit, offset }) => {
      try {
        const safeLimit = Math.min(limit || 30, 50); // Cap at 50
        const { summaries, total } = listAllProjectSummariesPaginated(safeLimit, offset || 0);
        
        const output = {
          total_summaries: total,
          showing: `${offset || 0} to ${(offset || 0) + summaries.length}`,
          has_more: (offset || 0) + summaries.length < total,
          summaries,
        };
        
        const text = `📚 ${total} total project summaries:\n\n${JSON.stringify(output, null, 2)}`;
        
        return {
          content: [
            {
              type: 'text' as const,
              text: truncateOutput(text),
            },
          ],
        };
      } catch (error) {
        throw toMcpError(error);
      }
    }
  );

  // Tool 11: Attach File to Entry
  server.registerTool(
    'journal_attach_file',
    {
      title: 'Attach File to Journal Entry',
      description: 'Upload and attach a file (image, diagram, PDF, etc.) to a journal entry. Supports PNG, JPG, SVG, PDF, Mermaid diagrams (.mmd), and more. Include a description to explain what the attachment shows (e.g., "System architecture diagram", "Before/after comparison").',
      inputSchema: {
        commit_hash: AttachmentInputSchema.shape.commit_hash,
        filename: AttachmentInputSchema.shape.filename,
        mime_type: AttachmentInputSchema.shape.mime_type,
        description: AttachmentInputSchema.shape.description,
        data_base64: AttachmentInputSchema.shape.data_base64,
      },
    },
    async ({ commit_hash, filename, mime_type, description, data_base64 }) => {
      try {
        // Decode base64 to Buffer
        const data = Buffer.from(data_base64, 'base64');
        const file_size = data.length;

        // Insert attachment
        const attachmentId = insertAttachment({
          commit_hash,
          filename,
          mime_type,
          description: description || null,
          data,
          file_size,
        });

        // Auto-backup to SQL
        autoBackup();

        // Get stats
        const stats = getAttachmentStats(commit_hash);

        return {
          content: [
            {
              type: 'text' as const,
              text: `✅ Attached file to commit ${commit_hash}

**File:** ${filename}
**Type:** ${mime_type}
**Size:** ${(file_size / 1024).toFixed(2)} KB
**Description:** ${description || '(no description)'}
**Attachment ID:** ${attachmentId}

**Total attachments for this commit:** ${stats.count} files (${(stats.total_size / 1024).toFixed(2)} KB total)`,
            },
          ],
        };
      } catch (error) {
        throw toMcpError(error);
      }
    }
  );

  // Tool 12: List Attachments for Journal Entry
  server.registerTool(
    'journal_list_attachments',
    {
      title: 'List Attachments for Journal Entry',
      description: 'Get attachment metadata (filename, description, size, type) for a journal entry by commit hash. Binary file data is excluded by default to comply with MCP truncation limits (~256 lines / 10 KiB). Use journal_get_attachment with include_data=true to retrieve file contents.',
      inputSchema: {
        commit_hash: AttachmentInputSchema.shape.commit_hash,
      },
    },
    async ({ commit_hash }) => {
      try {
        // Use metadata-only function (no binary data)
        const attachments = getAttachmentMetadataByCommit(commit_hash);

        if (attachments.length === 0) {
          return {
            content: [
              {
                type: 'text' as const,
                text: `No attachments found for commit ${commit_hash}`,
              },
            ],
          };
        }

        const stats = getAttachmentStats(commit_hash);
        
        const output = {
          commit_hash,
          attachment_count: attachments.length,
          total_size_bytes: stats.total_size,
          total_size_kb: (stats.total_size / 1024).toFixed(2),
          attachments,
        };

        const text = `📎 ${attachments.length} attachment(s) for commit ${commit_hash}\n\n${JSON.stringify(output, null, 2)}`;
        
        return {
          content: [
            {
              type: 'text' as const,
              text: truncateOutput(text),
            },
          ],
        };
      } catch (error) {
        throw toMcpError(error);
      }
    }
  );

  // Tool 13: Get Attachment by ID
  server.registerTool(
    'journal_get_attachment',
    {
      title: 'Get Attachment by ID',
      description: 'Retrieve attachment metadata and optionally file data by attachment ID. Returns metadata only by default (filename, description, size, type). Set include_data=true to get base64-encoded file data (may be truncated for large files to comply with MCP limits). Use this tool to fetch images, diagrams, PDFs, or Mermaid files attached to journal entries.',
      inputSchema: {
        attachment_id: z.number().positive().describe('Attachment ID to retrieve'),
        include_data: z.boolean().optional().default(false).describe('Include base64-encoded file data (can be very large, default: false)'),
        max_data_preview_chars: z.number().optional().default(500).describe('If include_data=true, maximum characters of base64 data to include (default: 500)'),
      },
    },
    async ({ attachment_id, include_data, max_data_preview_chars }) => {
      try {
        const attachment = getAttachmentById(attachment_id);

        if (!attachment) {
          return {
            content: [
              {
                type: 'text' as const,
                text: `No attachment found with ID ${attachment_id}`,
              },
            ],
          };
        }

        const output: any = {
          id: attachment.id,
          filename: attachment.filename,
          mime_type: attachment.mime_type,
          description: attachment.description || null,
          file_size_bytes: attachment.file_size,
          file_size_kb: (attachment.file_size / 1024).toFixed(2),
          commit_hash: attachment.commit_hash,
          uploaded_at: attachment.uploaded_at,
        };

        if (include_data) {
          const data_base64 = attachment.data.toString('base64');
          const previewLength = Math.min(max_data_preview_chars || 500, data_base64.length);
          output.data_base64_preview = data_base64.substring(0, previewLength);
          output.data_base64_full_length = data_base64.length;
          output.note = previewLength < data_base64.length 
            ? `Data truncated for preview (${previewLength}/${data_base64.length} chars). Full data available in database.`
            : 'Full data included';
        } else {
          output.note = 'Binary data excluded. Set include_data=true to retrieve base64-encoded file data.';
        }

        const text = `📄 Attachment ${attachment_id}\n\n${JSON.stringify(output, null, 2)}`;
        
        return {
          content: [
            {
              type: 'text' as const,
              text: truncateOutput(text),
            },
          ],
        };
      } catch (error) {
        throw toMcpError(error);
      }
    }
  );

  // Tool 14: Delete Attachment
  server.registerTool(
    'journal_delete_attachment',
    {
      title: 'Delete Attachment',
      description: 'Remove an attachment from a journal entry by its ID.',
      inputSchema: {
        attachment_id: z.number().positive().describe('Attachment ID to delete'),
      },
    },
    async ({ attachment_id }) => {
      try {
        // Get attachment info before deleting
        const attachment = getAttachmentById(attachment_id);

        if (!attachment) {
          return {
            content: [
              {
                type: 'text' as const,
                text: `No attachment found with ID ${attachment_id}`,
              },
            ],
          };
        }

        const { filename, commit_hash } = attachment;

        deleteAttachment(attachment_id);

        // Auto-backup to SQL
        autoBackup();

        return {
          content: [
            {
              type: 'text' as const,
              text: `✅ Deleted attachment ${attachment_id}

**File:** ${filename}
**Commit:** ${commit_hash}`,
            },
          ],
        };
      } catch (error) {
        throw toMcpError(error);
      }
    }
  );

  // Tool 16: Update Repository Name
  server.registerTool(
    'journal_update_repository_name',
    {
      title: 'Update Repository Name',
      description: 'Update the repository name for all entries matching the old name. Useful for fixing misnamed repositories or consolidating repositories.',
      inputSchema: {
        old_repository: z.string().min(1).describe('Current repository name to change'),
        new_repository: z.string().min(1).describe('New repository name'),
      },
    },
    async ({ old_repository, new_repository }) => {
      try {
        const count = updateRepositoryName(old_repository, new_repository);
        
        // Auto-backup to SQL
        autoBackup();
        
        return {
          content: [
            {
              type: 'text' as const,
              text: `✅ Updated ${count} entries from repository "${old_repository}" to "${new_repository}"`,
            },
          ],
        };
      } catch (error) {
        throw toMcpError(error);
      }
    }
  );

  logger.success('Journal tools registered (16 tools)');
}
