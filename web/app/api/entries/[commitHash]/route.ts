import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/db";
import { triggerBackup } from "@/lib/backup";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ commitHash: string }> }
) {
  try {
    const { commitHash } = await params;
    const db = getDatabase();
    const entry = db.prepare("SELECT * FROM journal_entries WHERE commit_hash = ?").get(commitHash);

    if (!entry) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    }

    // Get attachments metadata
    const attachments = db
      .prepare(
        `SELECT id, filename, mime_type, description, file_size, uploaded_at 
         FROM entry_attachments 
         WHERE commit_hash = ? 
         ORDER BY uploaded_at ASC`
      )
      .all(commitHash);

    return NextResponse.json({
      ...entry,
      attachments,
    });
  } catch (error) {
    console.error("Error fetching entry:", error);
    return NextResponse.json({ error: "Failed to fetch entry" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ commitHash: string }> }
) {
  try {
    const { commitHash } = await params;
    const db = getDatabase();
    const updates = await request.json();

    const fields: string[] = [];
    const values: any[] = [];

    if (updates.why !== undefined) {
      fields.push("why = ?");
      values.push(updates.why);
    }
    if (updates.what_changed !== undefined) {
      fields.push("what_changed = ?");
      values.push(updates.what_changed);
    }
    if (updates.decisions !== undefined) {
      fields.push("decisions = ?");
      values.push(updates.decisions);
    }
    if (updates.technologies !== undefined) {
      fields.push("technologies = ?");
      values.push(updates.technologies);
    }
    if (updates.kronus_wisdom !== undefined) {
      fields.push("kronus_wisdom = ?");
      values.push(updates.kronus_wisdom);
    }
    if (updates.author !== undefined) {
      fields.push("author = ?");
      values.push(updates.author);
    }
    if (updates.code_author !== undefined) {
      fields.push("code_author = ?");
      values.push(updates.code_author);
    }
    if (updates.team_members !== undefined) {
      fields.push("team_members = ?");
      values.push(typeof updates.team_members === "string" ? updates.team_members : JSON.stringify(updates.team_members));
    }

    if (fields.length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    values.push(commitHash);
    const sql = `UPDATE journal_entries SET ${fields.join(", ")} WHERE commit_hash = ?`;

    const result = db.prepare(sql).run(...values);

    if (result.changes === 0) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    }

    // Get updated entry
    const updatedEntry = db
      .prepare("SELECT * FROM journal_entries WHERE commit_hash = ?")
      .get(commitHash);

    // Trigger backup after update
    try {
      triggerBackup();
    } catch (error) {
      console.error("Backup failed after update:", error);
      // Don't fail the request if backup fails
    }

    return NextResponse.json(updatedEntry);
  } catch (error) {
    console.error("Error updating entry:", error);
    return NextResponse.json({ error: "Failed to update entry" }, { status: 500 });
  }
}
