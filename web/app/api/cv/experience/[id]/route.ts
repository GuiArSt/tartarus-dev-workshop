import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDatabase();
    const exp = db.prepare("SELECT * FROM work_experience WHERE id = ?").get(id) as any;

    if (!exp) {
      return NextResponse.json({ error: "Experience not found" }, { status: 404 });
    }

    return NextResponse.json({
      ...exp,
      achievements: JSON.parse(exp.achievements || "[]"),
    });
  } catch (error) {
    console.error("Error fetching experience:", error);
    return NextResponse.json({ error: "Failed to fetch experience" }, { status: 500 });
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
    const { title, company, department, location, dateStart, dateEnd, tagline, note, achievements, logo } = body;

    const existing = db.prepare("SELECT * FROM work_experience WHERE id = ?").get(id) as any;
    if (!existing) {
      return NextResponse.json({ error: "Experience not found" }, { status: 404 });
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (title !== undefined) { updates.push("title = ?"); values.push(title); }
    if (company !== undefined) { updates.push("company = ?"); values.push(company); }
    if (department !== undefined) { updates.push("department = ?"); values.push(department || null); }
    if (location !== undefined) { updates.push("location = ?"); values.push(location); }
    if (dateStart !== undefined) { updates.push("dateStart = ?"); values.push(dateStart); }
    if (dateEnd !== undefined) { updates.push("dateEnd = ?"); values.push(dateEnd || null); }
    if (tagline !== undefined) { updates.push("tagline = ?"); values.push(tagline); }
    if (note !== undefined) { updates.push("note = ?"); values.push(note || null); }
    if (achievements !== undefined) { updates.push("achievements = ?"); values.push(JSON.stringify(achievements)); }
    if (logo !== undefined) { updates.push("logo = ?"); values.push(logo || null); }

    if (updates.length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    values.push(id);
    db.prepare(`UPDATE work_experience SET ${updates.join(", ")} WHERE id = ?`).run(...values);

    const updated = db.prepare("SELECT * FROM work_experience WHERE id = ?").get(id) as any;
    return NextResponse.json({
      ...updated,
      achievements: JSON.parse(updated.achievements || "[]"),
    });
  } catch (error) {
    console.error("Error updating experience:", error);
    return NextResponse.json({ error: "Failed to update experience" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDatabase();
    const result = db.prepare("DELETE FROM work_experience WHERE id = ?").run(id);

    if (result.changes === 0) {
      return NextResponse.json({ error: "Experience not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting experience:", error);
    return NextResponse.json({ error: "Failed to delete experience" }, { status: 500 });
  }
}
