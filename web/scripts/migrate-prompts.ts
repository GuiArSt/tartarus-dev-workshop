#!/usr/bin/env npx tsx
/**
 * Migrate Prompts to Chat Format
 *
 * This script migrates all existing prompts to the standardized chat format:
 * - Wraps plain text content in "## System" header
 * - Updates metadata.role based on content structure
 *
 * Run with: npx tsx web/scripts/migrate-prompts.ts
 * Or: npm run migrate:prompts (if added to package.json)
 *
 * Options:
 *   --dry-run   Preview changes without writing to database
 *   --verbose   Show detailed output for each prompt
 */

import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

// Import utilities from our chat-format module
// Since this runs from project root, we need relative paths
const chatFormatPath = path.resolve(__dirname, "../lib/prompts/chat-format.ts");

// For simplicity, inline the core functions here to avoid transpilation issues
// These match the implementations in web/lib/prompts/chat-format.ts

type PromptRole = "system" | "user" | "assistant";
type PromptMetadataRole = PromptRole | "chat";

interface ChatMessage {
  role: PromptRole;
  content: string;
}

const ROLE_HEADER_REGEX = /^##\s+(System|User|Assistant)\s*$/im;

function parsePromptContent(content: string): ChatMessage[] {
  if (!content || typeof content !== "string") {
    return [];
  }

  const messages: ChatMessage[] = [];
  const lines = content.split("\n");

  let currentRole: PromptRole | null = null;
  let currentContent: string[] = [];

  for (const line of lines) {
    const headerMatch = line.match(ROLE_HEADER_REGEX);

    if (headerMatch) {
      if (currentRole && currentContent.length > 0) {
        messages.push({
          role: currentRole,
          content: currentContent.join("\n").trim(),
        });
      }
      currentRole = headerMatch[1].toLowerCase() as PromptRole;
      currentContent = [];
    } else if (currentRole) {
      currentContent.push(line);
    }
  }

  if (currentRole && currentContent.length > 0) {
    messages.push({
      role: currentRole,
      content: currentContent.join("\n").trim(),
    });
  }

  return messages;
}

function isInChatFormat(content: string): boolean {
  if (!content) return false;
  return ROLE_HEADER_REGEX.test(content);
}

function detectPromptRole(content: string): PromptMetadataRole {
  const messages = parsePromptContent(content);
  if (messages.length === 0) return "system";
  if (messages.length === 1) return messages[0].role;
  return "chat";
}

function normalizePromptContent(content: string): string {
  if (!content || typeof content !== "string") {
    return "## System\n\n";
  }
  if (isInChatFormat(content)) {
    return content;
  }
  return `## System\n\n${content.trim()}`;
}

// ============================================================================
// Migration Script
// ============================================================================

interface MigrationOptions {
  dryRun: boolean;
  verbose: boolean;
}

interface PromptRow {
  id: number;
  slug: string;
  title: string;
  content: string;
  metadata: string;
}

interface MigrationResult {
  total: number;
  migrated: number;
  skipped: number;
  errors: number;
  details: Array<{
    id: number;
    slug: string;
    action: "migrated" | "skipped" | "error";
    reason?: string;
  }>;
}

function findDatabasePath(): string {
  // Try common locations
  const possiblePaths = [
    // Local development
    path.resolve(process.cwd(), "data/journal.db"),
    // Docker volume mount
    path.resolve(process.cwd(), "../data/journal.db"),
    // Web directory context
    path.resolve(__dirname, "../../data/journal.db"),
  ];

  for (const dbPath of possiblePaths) {
    if (fs.existsSync(dbPath)) {
      return dbPath;
    }
  }

  // Fallback to first path (will error if not found)
  return possiblePaths[0];
}

function migratePrompts(options: MigrationOptions): MigrationResult {
  const result: MigrationResult = {
    total: 0,
    migrated: 0,
    skipped: 0,
    errors: 0,
    details: [],
  };

  const dbPath = findDatabasePath();
  console.log(`\n📁 Database: ${dbPath}`);

  if (!fs.existsSync(dbPath)) {
    console.error(`❌ Database not found at ${dbPath}`);
    process.exit(1);
  }

  const db = new Database(dbPath);

  try {
    // Get all prompts
    const prompts = db
      .prepare(
        `
      SELECT id, slug, title, content, metadata
      FROM documents
      WHERE type = 'prompt'
      ORDER BY id ASC
    `
      )
      .all() as PromptRow[];

    result.total = prompts.length;
    console.log(`\n📊 Found ${prompts.length} prompts to process\n`);

    if (prompts.length === 0) {
      console.log("No prompts to migrate.");
      return result;
    }

    // Process each prompt
    for (const prompt of prompts) {
      const { id, slug, title, content, metadata: metadataStr } = prompt;

      if (options.verbose) {
        console.log(`\n─────────────────────────────────────`);
        console.log(`Processing: ${title} (${slug})`);
      }

      try {
        // Check if already in chat format
        if (isInChatFormat(content)) {
          result.skipped++;
          result.details.push({
            id,
            slug,
            action: "skipped",
            reason: "Already in chat format",
          });

          if (options.verbose) {
            console.log(`  ⏭️  Skipped: Already in chat format`);
          }
          continue;
        }

        // Normalize content
        const newContent = normalizePromptContent(content);
        const newRole = detectPromptRole(newContent);

        // Parse and update metadata
        let metadata: Record<string, unknown> = {};
        try {
          metadata = JSON.parse(metadataStr || "{}");
        } catch {
          metadata = {};
        }

        // Update role in metadata
        metadata.role = newRole;
        const newMetadata = JSON.stringify(metadata);

        if (options.verbose) {
          console.log(`  📝 Content preview (first 100 chars):`);
          console.log(`     Before: ${content.substring(0, 100)}...`);
          console.log(`     After:  ${newContent.substring(0, 100)}...`);
          console.log(`  🏷️  Role: ${newRole}`);
        }

        // Update database
        if (!options.dryRun) {
          db.prepare(
            `
            UPDATE documents
            SET content = ?, metadata = ?, updated_at = datetime('now')
            WHERE id = ?
          `
          ).run(newContent, newMetadata, id);
        }

        result.migrated++;
        result.details.push({
          id,
          slug,
          action: "migrated",
        });

        if (options.verbose) {
          console.log(
            `  ✅ ${options.dryRun ? "Would migrate" : "Migrated"}`
          );
        } else {
          console.log(
            `✅ ${options.dryRun ? "[DRY RUN] " : ""}Migrated: ${title}`
          );
        }
      } catch (error) {
        result.errors++;
        result.details.push({
          id,
          slug,
          action: "error",
          reason: error instanceof Error ? error.message : "Unknown error",
        });

        console.error(`❌ Error processing ${title}: ${error}`);
      }
    }
  } finally {
    db.close();
  }

  return result;
}

function printSummary(result: MigrationResult, options: MigrationOptions): void {
  console.log(`\n═══════════════════════════════════════`);
  console.log(`📊 Migration Summary ${options.dryRun ? "(DRY RUN)" : ""}`);
  console.log(`═══════════════════════════════════════`);
  console.log(`Total prompts:  ${result.total}`);
  console.log(`Migrated:       ${result.migrated}`);
  console.log(`Skipped:        ${result.skipped}`);
  console.log(`Errors:         ${result.errors}`);
  console.log(`═══════════════════════════════════════\n`);

  if (options.dryRun && result.migrated > 0) {
    console.log("💡 Run without --dry-run to apply changes.\n");
  }
}

// ============================================================================
// Main
// ============================================================================

function main(): void {
  const args = process.argv.slice(2);
  const options: MigrationOptions = {
    dryRun: args.includes("--dry-run"),
    verbose: args.includes("--verbose"),
  };

  console.log(`
╔═══════════════════════════════════════════════════════════╗
║     Prompt Migration Script - Chat Format Standardization  ║
╚═══════════════════════════════════════════════════════════╝
`);

  if (options.dryRun) {
    console.log("🔍 DRY RUN MODE - No changes will be made\n");
  }

  const result = migratePrompts(options);
  printSummary(result, options);
}

main();
