import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const db = getDatabase();
    const skills = db.prepare("SELECT * FROM skills ORDER BY category, name").all() as any[];
    const skillsParsed = skills.map((s) => ({
      ...s,
      tags: JSON.parse(s.tags || "[]"),
    }));
    return NextResponse.json(skillsParsed);
  } catch (error) {
    console.error("Error fetching skills:", error);
    return NextResponse.json({ error: "Failed to fetch skills" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = getDatabase();
    const body = await request.json();
    const {
      id,
      name,
      category,
      magnitude,
      description,
      icon,
      color,
      url,
      tags = [],
      firstUsed,
      lastUsed,
    } = body;

    if (!id || !name || !category || !magnitude || !description) {
      return NextResponse.json(
        { error: "id, name, category, magnitude, and description are required" },
        { status: 400 }
      );
    }

    db.prepare(
      `INSERT INTO skills (id, name, category, magnitude, description, icon, color, url, tags, firstUsed, lastUsed)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(id, name, category, magnitude, description, icon || null, color || null, url || null, JSON.stringify(tags), firstUsed || null, lastUsed || null);

    const skill = db.prepare("SELECT * FROM skills WHERE id = ?").get(id) as any;
    return NextResponse.json({
      ...skill,
      tags: JSON.parse(skill.tags || "[]"),
    });
  } catch (error: any) {
    console.error("Error creating skill:", error);
    if (error.message?.includes("UNIQUE constraint")) {
      return NextResponse.json({ error: "Skill with this ID already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to create skill" }, { status: 500 });
  }
}
