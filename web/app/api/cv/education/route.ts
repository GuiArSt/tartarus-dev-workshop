import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const db = getDatabase();
    const education = db.prepare("SELECT * FROM education ORDER BY dateStart DESC").all() as any[];
    const educationParsed = education.map((e) => ({
      ...e,
      focusAreas: JSON.parse(e.focusAreas || "[]"),
      achievements: JSON.parse(e.achievements || "[]"),
    }));
    return NextResponse.json(educationParsed);
  } catch (error) {
    console.error("Error fetching education:", error);
    return NextResponse.json({ error: "Failed to fetch education" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = getDatabase();
    const body = await request.json();
    const { id, degree, field, institution, location, dateStart, dateEnd, tagline, note, focusAreas = [], achievements = [] } = body;

    if (!id || !degree || !field || !institution || !location || !dateStart || !dateEnd || !tagline) {
      return NextResponse.json(
        { error: "id, degree, field, institution, location, dateStart, dateEnd, and tagline are required" },
        { status: 400 }
      );
    }

    db.prepare(
      `INSERT INTO education (id, degree, field, institution, location, dateStart, dateEnd, tagline, note, focusAreas, achievements)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(id, degree, field, institution, location, dateStart, dateEnd, tagline, note || null, JSON.stringify(focusAreas), JSON.stringify(achievements));

    const edu = db.prepare("SELECT * FROM education WHERE id = ?").get(id) as any;
    return NextResponse.json({
      ...edu,
      focusAreas: JSON.parse(edu.focusAreas || "[]"),
      achievements: JSON.parse(edu.achievements || "[]"),
    });
  } catch (error: any) {
    console.error("Error creating education:", error);
    if (error.message?.includes("UNIQUE constraint")) {
      return NextResponse.json({ error: "Education with this ID already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to create education" }, { status: 500 });
  }
}
