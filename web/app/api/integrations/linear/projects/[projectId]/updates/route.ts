import { NextRequest, NextResponse } from "next/server";
import { createProjectUpdate, listProjectUpdates } from "@/lib/linear/client";
import { getDrizzleDb, linearProjectUpdates } from "@/lib/db/drizzle";
import { eq } from "drizzle-orm";

// GET - List project updates (from cache or live)
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const db = getDrizzleDb();

    // Read from cache first
    const cached = await db
      .select()
      .from(linearProjectUpdates)
      .where(eq(linearProjectUpdates.projectId, projectId))
      .orderBy(linearProjectUpdates.createdAt);

    // Reverse for newest-first
    cached.reverse();

    return NextResponse.json({
      projectId,
      updates: cached,
      total: cached.length,
      source: "cache",
    });
  } catch (error: any) {
    console.error("Failed to list project updates:", error);
    return NextResponse.json(
      { error: error.message || "Failed to list project updates" },
      { status: 500 }
    );
  }
}

// POST - Create a project update (posts to Linear + caches locally)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const { body, health } = await request.json();

    if (!body || !health) {
      return NextResponse.json(
        { error: "body and health are required" },
        { status: 400 }
      );
    }

    if (!["onTrack", "atRisk", "offTrack"].includes(health)) {
      return NextResponse.json(
        { error: "health must be onTrack, atRisk, or offTrack" },
        { status: 400 }
      );
    }

    // Post to Linear
    const update = await createProjectUpdate({ projectId, body, health });

    // Cache locally
    const db = getDrizzleDb();
    await db.insert(linearProjectUpdates).values({
      id: update.id,
      projectId,
      body: update.body,
      health: update.health,
      userId: update.user?.id || null,
      userName: update.user?.name || null,
      createdAt: update.createdAt,
      updatedAt: update.createdAt,
      syncedAt: new Date().toISOString(),
    });

    return NextResponse.json(update);
  } catch (error: any) {
    console.error("Failed to create project update:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create project update" },
      { status: 500 }
    );
  }
}
