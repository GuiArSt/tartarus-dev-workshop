import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDatabase();
    const docType = db.prepare("SELECT * FROM document_types WHERE id = ?").get(id);

    if (!docType) {
      return NextResponse.json({ error: "Document type not found" }, { status: 404 });
    }

    return NextResponse.json(docType);
  } catch (error) {
    console.error("Error fetching document type:", error);
    return NextResponse.json({ error: "Failed to fetch document type" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDatabase();
    const body = await request.json();
    const { name, description, color, icon, sortOrder } = body;

    const existing = db.prepare("SELECT * FROM document_types WHERE id = ?").get(id) as any;
    if (!existing) {
      return NextResponse.json({ error: "Document type not found" }, { status: 404 });
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (name !== undefined) { updates.push("name = ?"); values.push(name); }
    if (description !== undefined) { updates.push("description = ?"); values.push(description); }
    if (color !== undefined) { updates.push("color = ?"); values.push(color); }
    if (icon !== undefined) { updates.push("icon = ?"); values.push(icon); }
    if (sortOrder !== undefined) { updates.push("sortOrder = ?"); values.push(sortOrder); }

    if (updates.length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    values.push(id);
    db.prepare(`UPDATE document_types SET ${updates.join(", ")} WHERE id = ?`).run(...values);

    // If name changed, update all documents with this type
    if (name !== undefined && name !== existing.name) {
      // Update documents metadata.type
      const docs = db.prepare("SELECT id, metadata FROM documents WHERE json_extract(metadata, '$.type') = ?").all(existing.name) as any[];
      const updateDoc = db.prepare("UPDATE documents SET metadata = ? WHERE id = ?");
      for (const doc of docs) {
        const meta = JSON.parse(doc.metadata || "{}");
        meta.type = name;
        updateDoc.run(JSON.stringify(meta), doc.id);
      }
    }

    const updated = db.prepare("SELECT * FROM document_types WHERE id = ?").get(id);
    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("Error updating document type:", error);
    if (error.message?.includes("UNIQUE constraint")) {
      return NextResponse.json({ error: "Document type with this name already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to update document type" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDatabase();

    const existing = db.prepare("SELECT * FROM document_types WHERE id = ?").get(id) as any;
    if (!existing) {
      return NextResponse.json({ error: "Document type not found" }, { status: 404 });
    }

    // Check if there are documents using this type
    const docsUsingType = db.prepare("SELECT COUNT(*) as count FROM documents WHERE json_extract(metadata, '$.type') = ?").get(existing.name) as { count: number };
    if (docsUsingType.count > 0) {
      return NextResponse.json({
        error: `Cannot delete type with ${docsUsingType.count} documents. Reassign documents first.`
      }, { status: 400 });
    }

    db.prepare("DELETE FROM document_types WHERE id = ?").run(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting document type:", error);
    return NextResponse.json({ error: "Failed to delete document type" }, { status: 500 });
  }
}
