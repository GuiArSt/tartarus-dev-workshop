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

export async function GET(request: NextRequest) {
  try {
    const db = getDatabase();
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") as "writing" | "prompt" | "note" | null;
    const year = searchParams.get("year");
    const search = searchParams.get("search");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    let query = "SELECT * FROM documents WHERE 1=1";
    const params: any[] = [];

    if (type) {
      query += " AND type = ?";
      params.push(type);
    }

    if (year) {
      query += " AND json_extract(metadata, '$.year') = ?";
      params.push(year);
    }

    if (search) {
      query += " AND (title LIKE ? OR content LIKE ?)";
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm);
    }

    query += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
    params.push(limit, offset);

    const documents = db.prepare(query).all(...params) as any[];
    console.log(`[Documents API] Query: ${query.substring(0, 100)}...`);
    console.log(`[Documents API] Found ${documents.length} documents`);

    // Parse metadata JSON
    const documentsWithParsedMetadata = documents.map((doc) => {
      try {
        return {
          ...doc,
          metadata: JSON.parse(doc.metadata || "{}"),
        };
      } catch (e) {
        console.error(`Failed to parse metadata for document ${doc.id}:`, e);
        return {
          ...doc,
          metadata: {},
        };
      }
    });

    // Get total count
    let countQuery = "SELECT COUNT(*) as count FROM documents WHERE 1=1";
    const countParams: any[] = [];
    if (type) {
      countQuery += " AND type = ?";
      countParams.push(type);
    }
    if (year) {
      countQuery += " AND json_extract(metadata, '$.year') = ?";
      countParams.push(year);
    }
    if (search) {
      countQuery += " AND (title LIKE ? OR content LIKE ?)";
      const searchTerm = `%${search}%`;
      countParams.push(searchTerm, searchTerm);
    }

    const totalRow = db.prepare(countQuery).get(...countParams) as { count: number };
    const total = totalRow.count;

    console.log(`[Documents API] Returning ${documentsWithParsedMetadata.length} documents`);
    return NextResponse.json({
      documents: documentsWithParsedMetadata,
      total,
      limit,
      offset,
      has_more: offset + documents.length < total,
    });
  } catch (error) {
    console.error("Error fetching documents:", error);
    return NextResponse.json({ error: "Failed to fetch documents" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = getDatabase();
    const body = await request.json();
    const { title, content, type, language = "en", metadata = {} } = body;

    if (!title || !content || !type) {
      return NextResponse.json(
        { error: "Title, content, and type are required" },
        { status: 400 }
      );
    }

    const slug = slugify(title);
    const metadataJson = JSON.stringify(metadata);

    // Check if slug already exists
    const existing = db.prepare("SELECT id FROM documents WHERE slug = ?").get(slug);
    if (existing) {
      return NextResponse.json({ error: "Document with this title already exists" }, { status: 409 });
    }

    const result = db
      .prepare(
        `INSERT INTO documents (slug, type, title, content, language, metadata, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
      )
      .run(slug, type, title, content, language, metadataJson);

    const document = db.prepare("SELECT * FROM documents WHERE id = ?").get(result.lastInsertRowid) as any;

    return NextResponse.json({
      ...document,
      metadata: JSON.parse(document.metadata || "{}"),
    });
  } catch (error: any) {
    console.error("Error creating document:", error);
    if (error.message?.includes("UNIQUE constraint")) {
      return NextResponse.json({ error: "Document with this title already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to create document" }, { status: 500 });
  }
}
