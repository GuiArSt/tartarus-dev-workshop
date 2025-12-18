import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const db = getDatabase();
    const { searchParams } = new URL(request.url);
    const repository = searchParams.get("repository");
    const branch = searchParams.get("branch");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    let entries: any[];
    let total: number;

    if (repository && branch) {
      // Get entries by branch
      entries = db
        .prepare(
          `SELECT * FROM journal_entries 
           WHERE repository = ? AND branch = ? 
           ORDER BY created_at DESC 
           LIMIT ? OFFSET ?`
        )
        .all(repository, branch, limit, offset);

      const totalRow = db
        .prepare(
          "SELECT COUNT(*) as count FROM journal_entries WHERE repository = ? AND branch = ?"
        )
        .get(repository, branch) as { count: number };
      total = totalRow.count;
    } else if (repository) {
      // Get entries by repository
      entries = db
        .prepare(
          `SELECT * FROM journal_entries 
           WHERE repository = ? 
           ORDER BY created_at DESC 
           LIMIT ? OFFSET ?`
        )
        .all(repository, limit, offset);

      const totalRow = db
        .prepare("SELECT COUNT(*) as count FROM journal_entries WHERE repository = ?")
        .get(repository) as { count: number };
      total = totalRow.count;
    } else {
      // Get all entries
      entries = db
        .prepare(
          `SELECT * FROM journal_entries 
           ORDER BY created_at DESC 
           LIMIT ? OFFSET ?`
        )
        .all(limit, offset);

      const totalRow = db.prepare("SELECT COUNT(*) as count FROM journal_entries").get() as {
        count: number;
      };
      total = totalRow.count;
    }

    // Get attachment counts
    const commitHashes = entries.map((e: any) => e.commit_hash);
    const attachmentCounts = new Map<string, number>();

    if (commitHashes.length > 0) {
      const placeholders = commitHashes.map(() => "?").join(",");
      const attachmentRows = db
        .prepare(
          `SELECT commit_hash, COUNT(*) as count 
           FROM entry_attachments 
           WHERE commit_hash IN (${placeholders})
           GROUP BY commit_hash`
        )
        .all(...commitHashes) as Array<{ commit_hash: string; count: number }>;

      commitHashes.forEach((hash) => attachmentCounts.set(hash, 0));
      attachmentRows.forEach((row) => attachmentCounts.set(row.commit_hash, row.count));
    }

    const entriesWithAttachments = entries.map((entry: any) => ({
      ...entry,
      attachment_count: attachmentCounts.get(entry.commit_hash) || 0,
    }));

    return NextResponse.json({
      entries: entriesWithAttachments,
      total,
      limit,
      offset,
      has_more: offset + entries.length < total,
    });
  } catch (error) {
    console.error("Error fetching entries:", error);
    return NextResponse.json({ error: "Failed to fetch entries" }, { status: 500 });
  }
}







