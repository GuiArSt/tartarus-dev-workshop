import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const db = getDatabase();
    console.log("[CV API] Fetching CV data...");

    // Get all CV data
    const skills = db.prepare("SELECT * FROM skills ORDER BY category, name").all() as any[];
    const experience = db
      .prepare("SELECT * FROM work_experience ORDER BY dateStart DESC")
      .all() as any[];
    const education = db
      .prepare("SELECT * FROM education ORDER BY dateStart DESC")
      .all() as any[];

    // Parse JSON fields
    const skillsParsed = skills.map((s) => ({
      ...s,
      tags: JSON.parse(s.tags || "[]"),
    }));

    const experienceParsed = experience.map((e) => ({
      ...e,
      achievements: JSON.parse(e.achievements || "[]"),
    }));

    const educationParsed = education.map((e) => ({
      ...e,
      focusAreas: JSON.parse(e.focusAreas || "[]"),
      achievements: JSON.parse(e.achievements || "[]"),
    }));

    console.log(`[CV API] Returning: ${skillsParsed.length} skills, ${experienceParsed.length} experience, ${educationParsed.length} education`);
    return NextResponse.json({
      skills: skillsParsed,
      experience: experienceParsed,
      education: educationParsed,
    });
  } catch (error) {
    console.error("Error fetching CV data:", error);
    return NextResponse.json({ error: "Failed to fetch CV data" }, { status: 500 });
  }
}
