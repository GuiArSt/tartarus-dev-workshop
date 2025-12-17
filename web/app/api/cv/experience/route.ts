import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const db = getDatabase();
    const experience = db.prepare("SELECT * FROM work_experience ORDER BY dateStart DESC").all() as any[];
    const experienceParsed = experience.map((e) => ({
      ...e,
      achievements: JSON.parse(e.achievements || "[]"),
    }));
    return NextResponse.json(experienceParsed);
  } catch (error) {
    console.error("Error fetching experience:", error);
    return NextResponse.json({ error: "Failed to fetch experience" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = getDatabase();
    const body = await request.json();
    const { id, title, company, department, location, dateStart, dateEnd, tagline, note, achievements = [] } = body;

    if (!id || !title || !company || !location || !dateStart || !tagline) {
      return NextResponse.json(
        { error: "id, title, company, location, dateStart, and tagline are required" },
        { status: 400 }
      );
    }

    db.prepare(
      `INSERT INTO work_experience (id, title, company, department, location, dateStart, dateEnd, tagline, note, achievements)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(id, title, company, department || null, location, dateStart, dateEnd || null, tagline, note || null, JSON.stringify(achievements));

    const exp = db.prepare("SELECT * FROM work_experience WHERE id = ?").get(id) as any;
    return NextResponse.json({
      ...exp,
      achievements: JSON.parse(exp.achievements || "[]"),
    });
  } catch (error: any) {
    console.error("Error creating experience:", error);
    if (error.message?.includes("UNIQUE constraint")) {
      return NextResponse.json({ error: "Experience with this ID already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to create experience" }, { status: 500 });
  }
}
