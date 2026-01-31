/**
 * Migration Script: Documents to Prompts System
 *
 * Migrates existing documents with type="prompt" to the new prompts table.
 * Creates an "Uncategorized" project for orphan prompts.
 *
 * Usage: JOURNAL_DB_PATH=../data/journal.db npx tsx web/scripts/migrate-prompts-to-system.ts
 *    or: cd to project root and run: npx tsx web/scripts/migrate-prompts-to-system.ts
 */

// Set database path explicitly if not set
if (!process.env.JOURNAL_DB_PATH) {
  const path = require("path");
  process.env.JOURNAL_DB_PATH = path.resolve(__dirname, "../../data/journal.db");
}

import { getDrizzleDb, documents, prompts, promptProjects } from "../lib/db/drizzle";
import { eq } from "drizzle-orm";
import { normalizePromptContent, detectPromptRole } from "../lib/prompts/chat-format";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

function parseMetadata(metadata: string | null): Record<string, unknown> {
  if (!metadata) return {};
  try {
    return JSON.parse(metadata) as Record<string, unknown>;
  } catch {
    return {};
  }
}

async function main() {
  console.log("Starting migration: Documents (type=prompt) -> Prompts System\n");

  const db = getDrizzleDb();

  // 1. Create default "Uncategorized" project
  console.log("Creating default 'uncategorized' project...");
  try {
    await db.insert(promptProjects).values({
      id: "uncategorized",
      name: "Uncategorized",
      description: "Prompts migrated from documents without a specific project",
      status: "active",
      tags: "[]",
      metadata: "{}",
    });
    console.log("  Created 'uncategorized' project");
  } catch (error: any) {
    if (error.message?.includes("UNIQUE constraint")) {
      console.log("  'uncategorized' project already exists, skipping");
    } else {
      throw error;
    }
  }

  // 2. Get all documents with type="prompt"
  console.log("\nFetching documents with type='prompt'...");
  const promptDocs = await db
    .select()
    .from(documents)
    .where(eq(documents.type, "prompt"));

  console.log(`  Found ${promptDocs.length} prompt documents\n`);

  if (promptDocs.length === 0) {
    console.log("No prompt documents to migrate. Done!");
    return;
  }

  // 3. Migrate each prompt document
  let migrated = 0;
  let skipped = 0;
  let errors = 0;

  for (const doc of promptDocs) {
    const metadata = parseMetadata(doc.metadata);
    const slug = doc.slug;

    // Check if already migrated
    const existing = await db
      .select({ id: prompts.id })
      .from(prompts)
      .where(eq(prompts.legacyDocumentId, doc.id))
      .limit(1);

    if (existing.length > 0) {
      console.log(`  [SKIP] "${doc.title}" (already migrated)`);
      skipped++;
      continue;
    }

    // Also check by slug
    const existingBySlug = await db
      .select({ id: prompts.id })
      .from(prompts)
      .where(eq(prompts.slug, slug))
      .limit(1);

    if (existingBySlug.length > 0) {
      console.log(`  [SKIP] "${doc.title}" (slug '${slug}' exists)`);
      skipped++;
      continue;
    }

    try {
      // Normalize content and detect role
      const normalizedContent = normalizePromptContent(doc.content);
      const role = (metadata.role as string) || detectPromptRole(normalizedContent);

      // Extract prompt-specific metadata
      const purpose = (metadata.purpose as string) || null;
      const inputSchema = (metadata.inputSchema as string) || null;
      const outputSchema = (metadata.outputSchema as string) || null;
      const config = metadata.config ? JSON.stringify(metadata.config) : null;
      const tags = Array.isArray(metadata.tags) ? metadata.tags : [];

      await db.insert(prompts).values({
        slug,
        projectId: "uncategorized",
        name: doc.title,
        content: normalizedContent,
        role: role as "system" | "user" | "assistant" | "chat",
        purpose,
        inputSchema,
        outputSchema,
        config,
        status: "active",
        tags: JSON.stringify(tags),
        language: doc.language || "en",
        summary: doc.summary,
        legacyDocumentId: doc.id,
        version: 1,
        isLatest: true,
      });

      console.log(`  [OK] "${doc.title}" -> prompts.${slug}`);
      migrated++;
    } catch (error: any) {
      console.error(`  [ERROR] "${doc.title}": ${error.message}`);
      errors++;
    }
  }

  // Summary
  console.log("\n" + "=".repeat(50));
  console.log("Migration Complete!");
  console.log("=".repeat(50));
  console.log(`  Migrated: ${migrated}`);
  console.log(`  Skipped:  ${skipped}`);
  console.log(`  Errors:   ${errors}`);
  console.log(`  Total:    ${promptDocs.length}`);
}

main().catch(console.error);
