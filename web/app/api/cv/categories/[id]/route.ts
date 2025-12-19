import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDatabase();
    const category = db.prepare("SELECT * FROM skill_categories WHERE id = ?").get(id);

    if (!category) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    return NextResponse.json(category);
  } catch (error) {
    console.error("Error fetching skill category:", error);
    return NextResponse.json({ error: "Failed to fetch category" }, { status: 500 });
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
    const { name, color, icon, sortOrder } = body;

    const existing = db.prepare("SELECT * FROM skill_categories WHERE id = ?").get(id) as any;
    if (!existing) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (name !== undefined) { updates.push("name = ?"); values.push(name); }
    if (color !== undefined) { updates.push("color = ?"); values.push(color); }
    if (icon !== undefined) { updates.push("icon = ?"); values.push(icon); }
    if (sortOrder !== undefined) { updates.push("sortOrder = ?"); values.push(sortOrder); }

    if (updates.length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    values.push(id);
    db.prepare(`UPDATE skill_categories SET ${updates.join(", ")} WHERE id = ?`).run(...values);

    // If name changed, update all skills with this category
    if (name !== undefined && name !== existing.name) {
      db.prepare("UPDATE skills SET category = ? WHERE category = ?").run(name, existing.name);
    }

    const updated = db.prepare("SELECT * FROM skill_categories WHERE id = ?").get(id);
    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("Error updating skill category:", error);
    if (error.message?.includes("UNIQUE constraint")) {
      return NextResponse.json({ error: "Category with this name already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to update category" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDatabase();

    const existing = db.prepare("SELECT * FROM skill_categories WHERE id = ?").get(id) as any;
    if (!existing) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    // Check if there are skills using this category
    const skillsUsingCategory = db.prepare("SELECT COUNT(*) as count FROM skills WHERE category = ?").get(existing.name) as { count: number };
    if (skillsUsingCategory.count > 0) {
      return NextResponse.json({
        error: `Cannot delete category with ${skillsUsingCategory.count} skills. Reassign skills first.`
      }, { status: 400 });
    }

    db.prepare("DELETE FROM skill_categories WHERE id = ?").run(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting skill category:", error);
    return NextResponse.json({ error: "Failed to delete category" }, { status: 500 });
  }
}
