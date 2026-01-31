#!/usr/bin/env npx tsx
/**
 * Migration script: Rename Jobilla repository to jobilla (lowercase)
 *
 * Run with: npx tsx scripts/migrate-jobilla-rename.ts
 */

import Database from "better-sqlite3";
import * as fs from "fs";
import * as path from "path";

// Try multiple possible database paths
const possiblePaths = [
  process.env.DATABASE_PATH,
  path.join(process.cwd(), "data", "tartarus.db"),
  path.join(process.cwd(), "tartarus.db"),
  path.join(process.cwd(), "..", "journal.db"),
  path.join(process.cwd(), "journal.db"),
].filter(Boolean) as string[];

function findDatabase(): string | null {
  for (const dbPath of possiblePaths) {
    if (fs.existsSync(dbPath) && fs.statSync(dbPath).size > 0) {
      return dbPath;
    }
  }
  return null;
}

async function migrate() {
  console.log("🔄 Starting Jobilla rename migration...");

  const dbPath = findDatabase();
  if (!dbPath) {
    console.error("❌ No database found. Tried paths:");
    possiblePaths.forEach((p) => console.error(`   - ${p}`));
    process.exit(1);
  }

  console.log(`📂 Database path: ${dbPath}`);

  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");

  try {
    // Check current state
    const journalCount = db
      .prepare("SELECT COUNT(*) as count FROM journal_entries WHERE repository = 'Jobilla'")
      .get() as { count: number };

    let summaryCount = { count: 0 };
    try {
      summaryCount = db
        .prepare("SELECT COUNT(*) as count FROM project_summaries WHERE repository = 'Jobilla'")
        .get() as { count: number };
    } catch {
      console.log("ℹ️  project_summaries table not found, skipping");
    }

    console.log(`\n📊 Found ${journalCount.count} journal entries with 'Jobilla'`);
    console.log(`📊 Found ${summaryCount.count} project summaries with 'Jobilla'`);

    if (journalCount.count === 0 && summaryCount.count === 0) {
      console.log("\n✅ No records to update. Already migrated or no data.");
      db.close();
      return;
    }

    // Run the migration
    console.log("\n🔄 Renaming 'Jobilla' to 'jobilla'...");

    const journalResult = db
      .prepare("UPDATE journal_entries SET repository = 'jobilla' WHERE repository = 'Jobilla'")
      .run();
    console.log(`   ✅ Updated ${journalResult.changes} journal entries`);

    try {
      const summaryResult = db
        .prepare("UPDATE project_summaries SET repository = 'jobilla' WHERE repository = 'Jobilla'")
        .run();
      console.log(`   ✅ Updated ${summaryResult.changes} project summaries`);
    } catch {
      // Table might not exist
    }

    console.log("\n✅ Migration completed successfully!");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  } finally {
    db.close();
  }
}

migrate();
