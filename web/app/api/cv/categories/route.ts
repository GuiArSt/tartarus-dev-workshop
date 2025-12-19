import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/db";

export async function GET() {
  try {
    const db = getDatabase();
    const categories = db
      .prepare("SELECT * FROM skill_categories ORDER BY sortOrder ASC")
      .all() as any[];

    return NextResponse.json(categories);
  } catch (error) {
    console.error("Error fetching skill categories:", error);
    return NextResponse.json({ error: "Failed to fetch categories" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = getDatabase();
    const body = await request.json();
    const { name, color, icon } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    // Generate ID from name
    const id = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");

    // Get max sortOrder
    const maxOrder = db.prepare("SELECT MAX(sortOrder) as max FROM skill_categories").get() as { max: number | null };
    const sortOrder = (maxOrder.max || 0) + 1;

    db.prepare(
      "INSERT INTO skill_categories (id, name, color, icon, sortOrder) VALUES (?, ?, ?, ?, ?)"
    ).run(id, name, color || "gray", icon || "tag", sortOrder);

    const created = db.prepare("SELECT * FROM skill_categories WHERE id = ?").get(id);
    return NextResponse.json(created, { status: 201 });
  } catch (error: any) {
    console.error("Error creating skill category:", error);
    if (error.message?.includes("UNIQUE constraint")) {
      return NextResponse.json({ error: "Category with this name already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to create category" }, { status: 500 });
  }
}
