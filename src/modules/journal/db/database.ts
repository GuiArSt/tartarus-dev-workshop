/**
 * Journal Database Module
 *
 * Security Note: SQL Injection Protection
 * ======================================
 * All queries use parameterized statements with better-sqlite3's prepared statements.
 * - Named parameters (@param) for complex queries
 * - Positional parameters (?) for simple queries
 * - NO string concatenation or template literals in SQL
 *
 * This protects against SQL injection attacks by separating SQL logic from data values.
 * The database driver handles proper escaping automatically.
 *
 * Examples:
 * ✅ SAFE:   db.prepare('SELECT * FROM entries WHERE id = ?').get(userId)
 * ✅ SAFE:   db.prepare('INSERT INTO entries (...) VALUES (@field)').run({field: value})
 * ❌ UNSAFE: db.exec(`SELECT * FROM entries WHERE id = ${userId}`)
 */

import Database from 'better-sqlite3';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { logger } from '../../../shared/logger.js';
import type { JournalEntry, JournalEntryInsert, ProjectSummary, ProjectSummaryInsert, Attachment, AttachmentInsert } from '../types.js';

let db: Database.Database | null = null;

const ensureDirectoryExists = (filePath: string) => {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

const createSchema = (handle: Database.Database) => {
  handle.exec(`
    CREATE TABLE IF NOT EXISTS journal_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      commit_hash TEXT UNIQUE NOT NULL,
      repository TEXT NOT NULL,
      branch TEXT NOT NULL,
      author TEXT NOT NULL,
      date TEXT NOT NULL,
      why TEXT NOT NULL,
      what_changed TEXT NOT NULL,
      decisions TEXT NOT NULL,
      technologies TEXT NOT NULL,
      kronus_wisdom TEXT,
      raw_agent_report TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  handle.exec(`
    CREATE TABLE IF NOT EXISTS project_summaries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      repository TEXT UNIQUE NOT NULL,
      git_url TEXT NOT NULL,
      summary TEXT NOT NULL,
      purpose TEXT NOT NULL,
      architecture TEXT NOT NULL,
      key_decisions TEXT NOT NULL,
      technologies TEXT NOT NULL,
      status TEXT NOT NULL,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  handle.exec(`
    CREATE TABLE IF NOT EXISTS entry_attachments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      commit_hash TEXT NOT NULL,
      filename TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      description TEXT,
      data BLOB NOT NULL,
      file_size INTEGER NOT NULL,
      uploaded_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (commit_hash) REFERENCES journal_entries(commit_hash) ON DELETE CASCADE
    );
  `);
  
  // Migrate existing tables: add description column if it doesn't exist
  try {
    handle.exec(`ALTER TABLE entry_attachments ADD COLUMN description TEXT;`);
  } catch (error: any) {
    // Column already exists, ignore error
    if (!error.message?.includes('duplicate column')) {
      logger.warn('Could not add description column (may already exist):', error.message);
    }
  }

  handle.exec(`CREATE INDEX IF NOT EXISTS idx_repository ON journal_entries(repository);`);
  handle.exec(`CREATE INDEX IF NOT EXISTS idx_branch ON journal_entries(repository, branch);`);
  handle.exec(`CREATE INDEX IF NOT EXISTS idx_commit ON journal_entries(commit_hash);`);
  handle.exec(`CREATE INDEX IF NOT EXISTS idx_project_repo ON project_summaries(repository);`);
  handle.exec(`CREATE INDEX IF NOT EXISTS idx_attachments_commit ON entry_attachments(commit_hash);`);
};

export const initDatabase = (dbPath?: string): Database.Database => {
  if (db) {
    return db;
  }

  // Default to project root (journal.db) if no path specified
  // Calculate project root from this file's location (dist/modules/journal/db/)
  // dist/modules/journal/db/ -> dist/modules/journal/ -> dist/modules/ -> dist/ -> project root
  const getProjectRoot = () => {
    try {
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      return path.join(__dirname, '../../..');
    } catch {
      // Fallback to process.cwd() if import.meta.url not available
      return process.cwd();
    }
  };

  const finalPath = dbPath
    ? path.resolve(dbPath.replace(/^~/, os.homedir()))
    : path.join(getProjectRoot(), 'journal.db');

  ensureDirectoryExists(finalPath);

  // Retry logic for DB lock
  let retries = 5;
  let lastError: Error | null = null;

  while (retries > 0) {
    try {
      db = new Database(finalPath);
      db.pragma('journal_mode = WAL');
      db.pragma('foreign_keys = ON');
      db.pragma('busy_timeout = 5000'); // Wait 5 seconds for locks
      createSchema(db);
      logger.success(`Journal database ready at ${finalPath}`);
      return db;
    } catch (error) {
      lastError = error as Error;
      db = null;
      retries--;
      if (retries > 0) {
        logger.warn(`Database locked, retrying... (${retries} attempts left)`);
        // Wait 500ms before retry
        const now = Date.now();
        while (Date.now() - now < 500) {
          // Busy wait
        }
      }
    }
  }

  throw new Error(`Failed to initialize database after retries: ${lastError?.message}`);
};

const mapRow = (row: any): JournalEntry => ({
  id: row.id,
  commit_hash: row.commit_hash,
  repository: row.repository,
  branch: row.branch,
  author: row.author,
  date: row.date,
  why: row.why,
  what_changed: row.what_changed,
  decisions: row.decisions,
  technologies: row.technologies,
  kronus_wisdom: row.kronus_wisdom ?? null,
  raw_agent_report: row.raw_agent_report,
  created_at: row.created_at,
});

export const insertJournalEntry = (entry: JournalEntryInsert): number => {
  if (!db) {
    throw new Error('Database not initialized');
  }

  const params = {
    commit_hash: entry.commit_hash,
    repository: entry.repository,
    branch: entry.branch,
    author: entry.author,
    date: entry.date,
    why: entry.why,
    what_changed: entry.what_changed,
    decisions: entry.decisions,
    technologies: entry.technologies,
    kronus_wisdom: entry.kronus_wisdom ?? null,
    raw_agent_report: entry.raw_agent_report,
  };

  const insertStmt = db.prepare(`
    INSERT INTO journal_entries (
      commit_hash, repository, branch, author, date, why, what_changed,
      decisions, technologies, kronus_wisdom, raw_agent_report
    ) VALUES (
      @commit_hash, @repository, @branch, @author, @date, @why, @what_changed,
      @decisions, @technologies, @kronus_wisdom, @raw_agent_report
    );
  `);

  try {
    const result = insertStmt.run(params);
    logger.success(
      `Created journal entry for ${entry.repository}/${entry.branch} (${entry.commit_hash})`
    );
    return Number(result.lastInsertRowid);
  } catch (error) {
    if (
      error instanceof Error &&
      'code' in error &&
      error.code == 'SQLITE_CONSTRAINT'
    ) {
      throw new Error(
        `Entry already exists for commit ${entry.commit_hash}. Each commit can only have one journal entry.`
      );
    }
    throw error;
  }
};

export const getEntriesByRepository = (repository: string): JournalEntry[] => {
  if (!db) {
    throw new Error('Database not initialized');
  }
  const rows = db
    .prepare(
      `
    SELECT * FROM journal_entries
    WHERE repository = ?
    ORDER BY created_at DESC
  `
    )
    .all(repository);
  return rows.map(mapRow);
};

export const getEntriesByRepositoryPaginated = (
  repository: string,
  limit: number = 50,
  offset: number = 0
): { entries: JournalEntry[]; total: number } => {
  if (!db) {
    throw new Error('Database not initialized');
  }
  const rows = db
    .prepare(
      `
    SELECT * FROM journal_entries
    WHERE repository = ?
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `
    )
    .all(repository, limit, offset);
  
  const totalRow = db
    .prepare('SELECT COUNT(*) as count FROM journal_entries WHERE repository = ?')
    .get(repository) as { count: number };
  
  return {
    entries: rows.map(mapRow),
    total: totalRow.count,
  };
};

export const getEntriesByBranch = (
  repository: string,
  branch: string
): JournalEntry[] => {
  if (!db) {
    throw new Error('Database not initialized');
  }
  const rows = db
    .prepare(
      `
    SELECT * FROM journal_entries
    WHERE repository = ? AND branch = ?
    ORDER BY created_at DESC
  `
    )
    .all(repository, branch);
  return rows.map(mapRow);
};

export const getEntriesByBranchPaginated = (
  repository: string,
  branch: string,
  limit: number = 50,
  offset: number = 0
): { entries: JournalEntry[]; total: number } => {
  if (!db) {
    throw new Error('Database not initialized');
  }
  const rows = db
    .prepare(
      `
    SELECT * FROM journal_entries
    WHERE repository = ? AND branch = ?
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `
    )
    .all(repository, branch, limit, offset);
  
  const totalRow = db
    .prepare('SELECT COUNT(*) as count FROM journal_entries WHERE repository = ? AND branch = ?')
    .get(repository, branch) as { count: number };
  
  return {
    entries: rows.map(mapRow),
    total: totalRow.count,
  };
};

export const getEntryByCommit = (commitHash: string): JournalEntry | null => {
  if (!db) {
    throw new Error('Database not initialized');
  }
  const row = db
    .prepare(
      `
    SELECT * FROM journal_entries
    WHERE commit_hash = ?
    LIMIT 1
  `
    )
    .get(commitHash);
  return row ? mapRow(row) : null;
};

export const listRepositories = (): string[] => {
  if (!db) {
    throw new Error('Database not initialized');
  }
  const rows = db
    .prepare(
      `
    SELECT DISTINCT repository FROM journal_entries
    ORDER BY repository ASC
  `
    )
    .all();
  return rows.map((row: any) => row.repository as string);
};

export const listBranches = (repository: string): string[] => {
  if (!db) {
    throw new Error('Database not initialized');
  }
  const rows = db
    .prepare(
      `
    SELECT DISTINCT branch FROM journal_entries
    WHERE repository = ?
    ORDER BY branch ASC
  `
    )
    .all(repository);
  return rows.map((row: any) => row.branch as string);
};

export const closeDatabase = () => {
  if (db) {
    db.close();
    db = null;
    logger.info('Journal database closed');
  }
};

/**
 * Helper function to check if entry exists for a commit
 */
export const commitHasEntry = (commitHash: string): boolean => {
  if (!db) {
    throw new Error('Database not initialized');
  }
  const row = db
    .prepare('SELECT 1 FROM journal_entries WHERE commit_hash = ? LIMIT 1')
    .get(commitHash);
  return row !== undefined;
};

/**
 * Update an existing journal entry
 */
export const updateJournalEntry = (
  commitHash: string,
  updates: Partial<Omit<JournalEntryInsert, 'commit_hash'>>
): void => {
  if (!db) {
    throw new Error('Database not initialized');
  }

  const fields: string[] = [];
  const params: Record<string, any> = { commit_hash: commitHash };

  if (updates.why !== undefined) {
    fields.push('why = @why');
    params.why = updates.why;
  }
  if (updates.what_changed !== undefined) {
    fields.push('what_changed = @what_changed');
    params.what_changed = updates.what_changed;
  }
  if (updates.decisions !== undefined) {
    fields.push('decisions = @decisions');
    params.decisions = updates.decisions;
  }
  if (updates.technologies !== undefined) {
    fields.push('technologies = @technologies');
    params.technologies = updates.technologies;
  }
  if (updates.kronus_wisdom !== undefined) {
    fields.push('kronus_wisdom = @kronus_wisdom');
    params.kronus_wisdom = updates.kronus_wisdom;
  }

  if (fields.length === 0) {
    throw new Error('No fields to update');
  }

  const updateStmt = db.prepare(`
    UPDATE journal_entries
    SET ${fields.join(', ')}
    WHERE commit_hash = @commit_hash
  `);

  const result = updateStmt.run(params);

  if (result.changes === 0) {
    throw new Error(`No entry found for commit ${commitHash}`);
  }

  logger.success(`Updated journal entry for commit ${commitHash}`);
};

/**
 * Update repository name for entries (useful for fixing misnamed repositories)
 */
export const updateRepositoryName = (oldRepository: string, newRepository: string): number => {
  if (!db) {
    throw new Error('Database not initialized');
  }

  const updateStmt = db.prepare(`
    UPDATE journal_entries
    SET repository = @new_repository
    WHERE repository = @old_repository
  `);

  const result = updateStmt.run({ old_repository: oldRepository, new_repository: newRepository });

  logger.success(`Updated ${result.changes} entries from repository "${oldRepository}" to "${newRepository}"`);
  return result.changes;
};

/**
 * Project Summary CRUD operations
 */
const mapProjectSummaryRow = (row: any): ProjectSummary => ({
  id: row.id,
  repository: row.repository,
  git_url: row.git_url,
  summary: row.summary,
  purpose: row.purpose,
  architecture: row.architecture,
  key_decisions: row.key_decisions,
  technologies: row.technologies,
  status: row.status,
  updated_at: row.updated_at,
});

export const upsertProjectSummary = (summary: ProjectSummaryInsert): number => {
  if (!db) {
    throw new Error('Database not initialized');
  }

  const params = {
    repository: summary.repository,
    git_url: summary.git_url,
    summary: summary.summary,
    purpose: summary.purpose,
    architecture: summary.architecture,
    key_decisions: summary.key_decisions,
    technologies: summary.technologies,
    status: summary.status,
  };

  const upsertStmt = db.prepare(`
    INSERT INTO project_summaries (
      repository, git_url, summary, purpose, architecture, key_decisions, technologies, status
    ) VALUES (
      @repository, @git_url, @summary, @purpose, @architecture, @key_decisions, @technologies, @status
    )
    ON CONFLICT(repository) DO UPDATE SET
      git_url = @git_url,
      summary = @summary,
      purpose = @purpose,
      architecture = @architecture,
      key_decisions = @key_decisions,
      technologies = @technologies,
      status = @status,
      updated_at = CURRENT_TIMESTAMP
  `);

  const result = upsertStmt.run(params);
  logger.success(`Upserted project summary for ${summary.repository}`);
  return Number(result.lastInsertRowid);
};

export const getProjectSummary = (repository: string): ProjectSummary | null => {
  if (!db) {
    throw new Error('Database not initialized');
  }
  const row = db
    .prepare('SELECT * FROM project_summaries WHERE repository = ? LIMIT 1')
    .get(repository);
  return row ? mapProjectSummaryRow(row) : null;
};

export const listAllProjectSummaries = (): ProjectSummary[] => {
  if (!db) {
    throw new Error('Database not initialized');
  }
  const rows = db
    .prepare('SELECT * FROM project_summaries ORDER BY repository ASC')
    .all();
  return rows.map(mapProjectSummaryRow);
};

export const listAllProjectSummariesPaginated = (
  limit: number = 50,
  offset: number = 0
): { summaries: ProjectSummary[]; total: number } => {
  if (!db) {
    throw new Error('Database not initialized');
  }
  const rows = db
    .prepare('SELECT * FROM project_summaries ORDER BY repository ASC LIMIT ? OFFSET ?')
    .all(limit, offset);
  
  const totalRow = db
    .prepare('SELECT COUNT(*) as count FROM project_summaries')
    .get() as { count: number };
  
  return {
    summaries: rows.map(mapProjectSummaryRow),
    total: totalRow.count,
  };
};

/**
 * Attachment CRUD operations
 */

const mapAttachmentRow = (row: any): Attachment => ({
  id: row.id,
  commit_hash: row.commit_hash,
  filename: row.filename,
  mime_type: row.mime_type,
  description: row.description ?? null,
  data: row.data,
  file_size: row.file_size,
  uploaded_at: row.uploaded_at,
});

/**
 * Insert a new attachment for a journal entry
 */
export const insertAttachment = (attachment: AttachmentInsert): number => {
  if (!db) {
    throw new Error('Database not initialized');
  }

  // Verify that the commit hash exists
  if (!commitHasEntry(attachment.commit_hash)) {
    throw new Error(`No journal entry found for commit ${attachment.commit_hash}. Create an entry first.`);
  }

  const params = {
    commit_hash: attachment.commit_hash,
    filename: attachment.filename,
    mime_type: attachment.mime_type,
    description: attachment.description ?? null,
    data: attachment.data,
    file_size: attachment.file_size,
  };

  const insertStmt = db.prepare(`
    INSERT INTO entry_attachments (
      commit_hash, filename, mime_type, description, data, file_size
    ) VALUES (
      @commit_hash, @filename, @mime_type, @description, @data, @file_size
    );
  `);

  const result = insertStmt.run(params);
  logger.success(
    `Attached file "${attachment.filename}" (${attachment.file_size} bytes) to commit ${attachment.commit_hash}`
  );
  return Number(result.lastInsertRowid);
};

/**
 * Get all attachments for a specific commit
 */
export const getAttachmentsByCommit = (commitHash: string): Attachment[] => {
  if (!db) {
    throw new Error('Database not initialized');
  }
  const rows = db
    .prepare(
      `
    SELECT * FROM entry_attachments
    WHERE commit_hash = ?
    ORDER BY uploaded_at ASC
  `
    )
    .all(commitHash);
  return rows.map(mapAttachmentRow);
};

/**
 * Get attachment metadata only (without binary data) for a commit
 */
export const getAttachmentMetadataByCommit = (commitHash: string): Array<{
  id: number;
  commit_hash: string;
  filename: string;
  mime_type: string;
  description: string | null;
  file_size: number;
  uploaded_at: string;
}> => {
  if (!db) {
    throw new Error('Database not initialized');
  }
  const rows = db
    .prepare(
      `
    SELECT id, commit_hash, filename, mime_type, description, file_size, uploaded_at
    FROM entry_attachments
    WHERE commit_hash = ?
    ORDER BY uploaded_at ASC
  `
    )
    .all(commitHash);
  return rows as Array<{
    id: number;
    commit_hash: string;
    filename: string;
    mime_type: string;
    description: string | null;
    file_size: number;
    uploaded_at: string;
  }>;
};

/**
 * Get a specific attachment by ID
 */
export const getAttachmentById = (id: number): Attachment | null => {
  if (!db) {
    throw new Error('Database not initialized');
  }
  const row = db
    .prepare(
      `
    SELECT * FROM entry_attachments
    WHERE id = ?
    LIMIT 1
  `
    )
    .get(id);
  return row ? mapAttachmentRow(row) : null;
};

/**
 * Delete an attachment by ID
 */
export const deleteAttachment = (id: number): void => {
  if (!db) {
    throw new Error('Database not initialized');
  }

  const deleteStmt = db.prepare(`
    DELETE FROM entry_attachments
    WHERE id = ?
  `);

  const result = deleteStmt.run(id);

  if (result.changes === 0) {
    throw new Error(`No attachment found with ID ${id}`);
  }

  logger.success(`Deleted attachment ${id}`);
};

/**
 * Get attachment count and total size for a commit
 */
export const getAttachmentStats = (commitHash: string): { count: number; total_size: number } => {
  if (!db) {
    throw new Error('Database not initialized');
  }
  const row = db
    .prepare(
      `
    SELECT COUNT(*) as count, COALESCE(SUM(file_size), 0) as total_size
    FROM entry_attachments
    WHERE commit_hash = ?
  `
    )
    .get(commitHash) as any;
  return {
    count: row.count,
    total_size: row.total_size,
  };
};

/**
 * Get attachment counts for multiple commits (for batch operations)
 */
export const getAttachmentCountsForCommits = (commitHashes: string[]): Map<string, number> => {
  if (!db) {
    throw new Error('Database not initialized');
  }
  if (commitHashes.length === 0) {
    return new Map();
  }
  
  // Create placeholders for IN clause
  const placeholders = commitHashes.map(() => '?').join(',');
  const rows = db
    .prepare(
      `
    SELECT commit_hash, COUNT(*) as count
    FROM entry_attachments
    WHERE commit_hash IN (${placeholders})
    GROUP BY commit_hash
  `
    )
    .all(...commitHashes) as Array<{ commit_hash: string; count: number }>;
  
  const result = new Map<string, number>();
  // Initialize all commits with 0
  commitHashes.forEach(hash => result.set(hash, 0));
  // Update with actual counts
  rows.forEach(row => result.set(row.commit_hash, row.count));
  
  return result;
};

/**
 * Update an attachment's description
 */
export const updateAttachmentDescription = (attachmentId: number, description: string | null): void => {
  if (!db) {
    throw new Error('Database not initialized');
  }

  const updateStmt = db.prepare(`
    UPDATE entry_attachments
    SET description = @description
    WHERE id = @id
  `);

  const result = updateStmt.run({ id: attachmentId, description });

  if (result.changes === 0) {
    throw new Error(`No attachment found with ID ${attachmentId}`);
  }

  logger.success(`Updated description for attachment ${attachmentId}`);
};

/**
 * Export all entries and project summaries as SQL INSERT statements
 */
export const exportToSQL = (outputPath: string): void => {
  if (!db) {
    throw new Error('Database not initialized');
  }

  const entries = db.prepare('SELECT * FROM journal_entries ORDER BY created_at ASC').all() as JournalEntry[];
  const summaries = db.prepare('SELECT * FROM project_summaries ORDER BY repository ASC').all() as ProjectSummary[];

  // Get attachment metadata (not binary data) for the backup
  const attachmentMetadata = db.prepare(`
    SELECT id, commit_hash, filename, mime_type, description, file_size, uploaded_at
    FROM entry_attachments ORDER BY uploaded_at ASC
  `).all() as Array<{id: number; commit_hash: string; filename: string; mime_type: string; description: string | null; file_size: number; uploaded_at: string}>;

  let sql = `-- Journal Entries and Project Summaries SQL Backup
-- Generated: ${new Date().toISOString()}
-- Total entries: ${entries.length}
-- Total project summaries: ${summaries.length}
-- Total attachments: ${attachmentMetadata.length}

-- Project Summaries
`;

  for (const summary of summaries) {
    const values = [
      summary.repository,
      summary.git_url,
      summary.summary,
      summary.purpose,
      summary.architecture,
      summary.key_decisions,
      summary.technologies,
      summary.status,
      summary.updated_at,
    ].map(v => {
      if (v === null) return 'NULL';
      if (typeof v === 'string') {
        return `'${v.replace(/'/g, "''")}'`;
      }
      return String(v);
    });

    sql += `INSERT INTO project_summaries (repository, git_url, summary, purpose, architecture, key_decisions, technologies, status, updated_at) VALUES (${values.join(', ')});\n`;
  }

  sql += '\n-- Journal Entries\n';

  for (const entry of entries) {
    const values = [
      entry.commit_hash,
      entry.repository,
      entry.branch,
      entry.author,
      entry.date,
      entry.why,
      entry.what_changed,
      entry.decisions,
      entry.technologies,
      entry.kronus_wisdom,
      entry.raw_agent_report,
      entry.created_at,
    ].map(v => {
      if (v === null) return 'NULL';
      if (typeof v === 'string') {
        return `'${v.replace(/'/g, "''")}'`;
      }
      return String(v);
    });

    sql += `INSERT INTO journal_entries (commit_hash, repository, branch, author, date, why, what_changed, decisions, technologies, kronus_wisdom, raw_agent_report, created_at) VALUES (${values.join(', ')});\n`;
  }

  // Add attachment metadata (note: binary data is NOT included in SQL backup)
  sql += '\n-- Attachment Metadata (Binary data stored in database only)\n';
  for (const att of attachmentMetadata) {
    const desc = att.description ? ` - ${att.description}` : '';
    sql += `-- Attachment: ${att.filename} (${att.file_size} bytes, ${att.mime_type})${desc} for commit ${att.commit_hash}\n`;
  }

  fs.writeFileSync(outputPath, sql, 'utf-8');
  logger.success(`Exported ${entries.length} entries, ${summaries.length} project summaries, and ${attachmentMetadata.length} attachment references to ${outputPath}`);
};
