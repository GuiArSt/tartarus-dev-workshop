import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/db";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    console.log(`[Documents API] Fetching document with slug/id: ${slug}`);
    const db = getDatabase();
    
    // Support both slug and numeric ID
    let document;
    if (/^\d+$/.test(slug)) {
      document = db.prepare("SELECT * FROM documents WHERE id = ?").get(parseInt(slug)) as any;
    } else {
      document = db.prepare("SELECT * FROM documents WHERE slug = ?").get(slug) as any;
    }

    if (!document) {
      console.log(`[Documents API] Document not found for slug: ${slug}`);
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    console.log(`[Documents API] Found document: ${document.title}`);
    try {
      return NextResponse.json({
        ...document,
        metadata: JSON.parse(document.metadata || "{}"),
      });
    } catch (parseError) {
      console.error(`[Documents API] Failed to parse metadata for ${slug}:`, parseError);
      return NextResponse.json({
        ...document,
        metadata: {},
      });
    }
  } catch (error) {
    console.error("Error fetching document:", error);
    return NextResponse.json({ error: "Failed to fetch document" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const db = getDatabase();
    const body = await request.json();
    const { title, content, metadata } = body;

    // Support both slug and numeric ID
    let existing;
    const isNumericId = /^\d+$/.test(slug);
    if (isNumericId) {
      existing = db.prepare("SELECT * FROM documents WHERE id = ?").get(parseInt(slug)) as any;
    } else {
      existing = db.prepare("SELECT * FROM documents WHERE slug = ?").get(slug) as any;
    }
    if (!existing) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (title !== undefined) {
      updates.push("title = ?");
      values.push(title);
      // Update slug if title changed
      const newSlug = slugify(title);
      if (newSlug !== slug) {
        // Check if new slug exists
        const slugExists = db.prepare("SELECT id FROM documents WHERE slug = ?").get(newSlug);
        if (slugExists) {
          return NextResponse.json({ error: "Document with this title already exists" }, { status: 409 });
        }
        updates.push("slug = ?");
        values.push(newSlug);
      }
    }

    if (content !== undefined) {
      updates.push("content = ?");
      values.push(content);
    }

    if (metadata !== undefined) {
      updates.push("metadata = ?");
      values.push(JSON.stringify(metadata));
    }

    updates.push("updated_at = CURRENT_TIMESTAMP");
    values.push(slug);

    if (isNumericId) {
      db.prepare(`UPDATE documents SET ${updates.join(", ")} WHERE id = ?`).run(...values.slice(0, -1), parseInt(slug));
    } else {
      db.prepare(`UPDATE documents SET ${updates.join(", ")} WHERE slug = ?`).run(...values);
    }

    const updated = db.prepare("SELECT * FROM documents WHERE slug = ?").get(
      title ? slugify(title) : slug
    ) as any;

    return NextResponse.json({
      ...updated,
      metadata: JSON.parse(updated.metadata || "{}"),
    });
  } catch (error: any) {
    console.error("Error updating document:", error);
    if (error.message?.includes("UNIQUE constraint")) {
      return NextResponse.json({ error: "Document with this title already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to update document" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const db = getDatabase();
    const result = db.prepare("DELETE FROM documents WHERE slug = ?").run(slug);

    if (result.changes === 0) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting document:", error);
    return NextResponse.json({ error: "Failed to delete document" }, { status: 500 });
  }
}
