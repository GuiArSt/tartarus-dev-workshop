import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDatabase();
    const edu = db.prepare("SELECT * FROM education WHERE id = ?").get(id) as any;

    if (!edu) {
      return NextResponse.json({ error: "Education not found" }, { status: 404 });
    }

    return NextResponse.json({
      ...edu,
      focusAreas: JSON.parse(edu.focusAreas || "[]"),
      achievements: JSON.parse(edu.achievements || "[]"),
    });
  } catch (error) {
    console.error("Error fetching education:", error);
    return NextResponse.json({ error: "Failed to fetch education" }, { status: 500 });
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
    const { degree, field, institution, location, dateStart, dateEnd, tagline, note, focusAreas, achievements } = body;

    const existing = db.prepare("SELECT * FROM education WHERE id = ?").get(id) as any;
    if (!existing) {
      return NextResponse.json({ error: "Education not found" }, { status: 404 });
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (degree !== undefined) { updates.push("degree = ?"); values.push(degree); }
    if (field !== undefined) { updates.push("field = ?"); values.push(field); }
    if (institution !== undefined) { updates.push("institution = ?"); values.push(institution); }
    if (location !== undefined) { updates.push("location = ?"); values.push(location); }
    if (dateStart !== undefined) { updates.push("dateStart = ?"); values.push(dateStart); }
    if (dateEnd !== undefined) { updates.push("dateEnd = ?"); values.push(dateEnd); }
    if (tagline !== undefined) { updates.push("tagline = ?"); values.push(tagline); }
    if (note !== undefined) { updates.push("note = ?"); values.push(note || null); }
    if (focusAreas !== undefined) { updates.push("focusAreas = ?"); values.push(JSON.stringify(focusAreas)); }
    if (achievements !== undefined) { updates.push("achievements = ?"); values.push(JSON.stringify(achievements)); }

    if (updates.length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    values.push(id);
    db.prepare(`UPDATE education SET ${updates.join(", ")} WHERE id = ?`).run(...values);

    const updated = db.prepare("SELECT * FROM education WHERE id = ?").get(id) as any;
    return NextResponse.json({
      ...updated,
      focusAreas: JSON.parse(updated.focusAreas || "[]"),
      achievements: JSON.parse(updated.achievements || "[]"),
    });
  } catch (error) {
    console.error("Error updating education:", error);
    return NextResponse.json({ error: "Failed to update education" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDatabase();
    const result = db.prepare("DELETE FROM education WHERE id = ?").run(id);

    if (result.changes === 0) {
      return NextResponse.json({ error: "Education not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting education:", error);
    return NextResponse.json({ error: "Failed to delete education" }, { status: 500 });
  }
}
