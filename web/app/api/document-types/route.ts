import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/db";

export async function GET() {
  try {
    const db = getDatabase();
    const types = db.prepare("SELECT * FROM document_types ORDER BY sortOrder ASC").all();
    return NextResponse.json(types);
  } catch (error) {
    console.error("Error fetching document types:", error);
    return NextResponse.json({ error: "Failed to fetch document types" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = getDatabase();
    const body = await request.json();
    const { name, description, color, icon } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    // Generate ID from name
    const id = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");

    // Get max sortOrder
    const maxOrder = db.prepare("SELECT MAX(sortOrder) as max FROM document_types").get() as { max: number | null };
    const sortOrder = (maxOrder?.max || 0) + 1;

    db.prepare("INSERT INTO document_types (id, name, description, color, icon, sortOrder) VALUES (?, ?, ?, ?, ?, ?)")
      .run(id, name, description || "", color || "emerald", icon || "file-text", sortOrder);

    const created = db.prepare("SELECT * FROM document_types WHERE id = ?").get(id);
    return NextResponse.json(created, { status: 201 });
  } catch (error: any) {
    console.error("Error creating document type:", error);
    if (error.message?.includes("UNIQUE constraint")) {
      return NextResponse.json({ error: "Document type with this name already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to create document type" }, { status: 500 });
  }
}
