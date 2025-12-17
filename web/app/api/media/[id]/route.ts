import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/db";

// GET - Get a specific media asset (with or without data)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDatabase();
    const includeData = request.nextUrl.searchParams.get("include_data") === "true";

    const columns = includeData
      ? "*"
      : "id, filename, mime_type, file_size, description, prompt, model, tags, destination, commit_hash, document_id, created_at, updated_at";

    const asset = db.prepare(`SELECT ${columns} FROM media_assets WHERE id = ?`).get(id);

    if (!asset) {
      return NextResponse.json({ error: "Media asset not found" }, { status: 404 });
    }

    return NextResponse.json(asset);
  } catch (error: any) {
    console.error("Get media error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to get media" },
      { status: 500 }
    );
  }
}

// PATCH - Update media asset metadata
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDatabase();
    const body = await request.json();
    const { filename, description, tags, destination, commit_hash, document_id } = body;

    // Check if asset exists
    const existing = db.prepare("SELECT id FROM media_assets WHERE id = ?").get(id);
    if (!existing) {
      return NextResponse.json({ error: "Media asset not found" }, { status: 404 });
    }

    // Build update query dynamically
    const updates: string[] = [];
    const values: any[] = [];

    if (filename !== undefined) {
      updates.push("filename = ?");
      values.push(filename);
    }
    if (description !== undefined) {
      updates.push("description = ?");
      values.push(description);
    }
    if (tags !== undefined) {
      updates.push("tags = ?");
      values.push(JSON.stringify(tags));
    }
    if (destination !== undefined) {
      updates.push("destination = ?");
      values.push(destination);
    }
    if (commit_hash !== undefined) {
      updates.push("commit_hash = ?");
      values.push(commit_hash);
    }
    if (document_id !== undefined) {
      updates.push("document_id = ?");
      values.push(document_id);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    updates.push("updated_at = CURRENT_TIMESTAMP");
    values.push(id);

    db.prepare(`UPDATE media_assets SET ${updates.join(", ")} WHERE id = ?`).run(...values);

    return NextResponse.json({ message: "Media asset updated" });
  } catch (error: any) {
    console.error("Update media error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update media" },
      { status: 500 }
    );
  }
}

// DELETE - Delete a media asset
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDatabase();

    const result = db.prepare("DELETE FROM media_assets WHERE id = ?").run(id);

    if (result.changes === 0) {
      return NextResponse.json({ error: "Media asset not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Media asset deleted" });
  } catch (error: any) {
    console.error("Delete media error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete media" },
      { status: 500 }
    );
  }
}
