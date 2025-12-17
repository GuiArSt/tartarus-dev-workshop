import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDatabase();
    const skill = db.prepare("SELECT * FROM skills WHERE id = ?").get(id) as any;

    if (!skill) {
      return NextResponse.json({ error: "Skill not found" }, { status: 404 });
    }

    return NextResponse.json({
      ...skill,
      tags: JSON.parse(skill.tags || "[]"),
    });
  } catch (error) {
    console.error("Error fetching skill:", error);
    return NextResponse.json({ error: "Failed to fetch skill" }, { status: 500 });
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
    const {
      name,
      category,
      magnitude,
      description,
      icon,
      color,
      url,
      tags,
      firstUsed,
      lastUsed,
    } = body;

    const existing = db.prepare("SELECT * FROM skills WHERE id = ?").get(id) as any;
    if (!existing) {
      return NextResponse.json({ error: "Skill not found" }, { status: 404 });
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (name !== undefined) {
      updates.push("name = ?");
      values.push(name);
    }
    if (category !== undefined) {
      updates.push("category = ?");
      values.push(category);
    }
    if (magnitude !== undefined) {
      updates.push("magnitude = ?");
      values.push(magnitude);
    }
    if (description !== undefined) {
      updates.push("description = ?");
      values.push(description);
    }
    if (icon !== undefined) {
      updates.push("icon = ?");
      values.push(icon || null);
    }
    if (color !== undefined) {
      updates.push("color = ?");
      values.push(color || null);
    }
    if (url !== undefined) {
      updates.push("url = ?");
      values.push(url || null);
    }
    if (tags !== undefined) {
      updates.push("tags = ?");
      values.push(JSON.stringify(tags));
    }
    if (firstUsed !== undefined) {
      updates.push("firstUsed = ?");
      values.push(firstUsed || null);
    }
    if (lastUsed !== undefined) {
      updates.push("lastUsed = ?");
      values.push(lastUsed || null);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    values.push(id);
    db.prepare(`UPDATE skills SET ${updates.join(", ")} WHERE id = ?`).run(...values);

    const updated = db.prepare("SELECT * FROM skills WHERE id = ?").get(id) as any;
    return NextResponse.json({
      ...updated,
      tags: JSON.parse(updated.tags || "[]"),
    });
  } catch (error) {
    console.error("Error updating skill:", error);
    return NextResponse.json({ error: "Failed to update skill" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDatabase();
    const result = db.prepare("DELETE FROM skills WHERE id = ?").run(id);

    if (result.changes === 0) {
      return NextResponse.json({ error: "Skill not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting skill:", error);
    return NextResponse.json({ error: "Failed to delete skill" }, { status: 500 });
  }
}
