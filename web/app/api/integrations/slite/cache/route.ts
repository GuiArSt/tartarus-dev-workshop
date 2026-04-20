import { NextRequest, NextResponse } from "next/server";
import { getDrizzleDb, sliteNotes } from "@/lib/db/drizzle";
import { eq, desc } from "drizzle-orm";

/**
 * GET /api/integrations/slite/cache
 *
 * Fetch all cached Slite notes from local database.
 * Returns data from the local cache, not from Slite API.
 *
 * Query params:
 *   - includeDeleted: boolean (default: false)
 *   - limit: number (default: 200)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeDeleted = searchParams.get("includeDeleted") === "true";
    const limit = Math.min(parseInt(searchParams.get("limit") || "1000", 10), 2000);

    const db = getDrizzleDb();

    let query = db.select().from(sliteNotes);
    if (!includeDeleted) {
      query = query.where(eq(sliteNotes.isDeleted, false)) as typeof query;
    }
    const notes = await query.orderBy(desc(sliteNotes.lastEditedAt)).limit(limit);

    const lastSync =
      notes.length > 0
        ? notes.reduce((latest, n) => {
            const t = new Date(n.syncedAt || 0).getTime();
            return t > latest ? t : latest;
          }, 0)
        : null;

    const formattedNotes = notes.map((n) => ({
      id: n.id,
      title: n.title,
      content: n.content,
      parentNoteId: n.parentNoteId,
      url: n.url,
      ownerId: n.ownerId,
      ownerName: n.ownerName,
      reviewState: n.reviewState,
      noteType: n.noteType,
      summary: n.summary,
      syncedAt: n.syncedAt,
      updatedAt: n.updatedAt,
      lastEditedAt: n.lastEditedAt,
      isDeleted: n.isDeleted,
    }));

    return NextResponse.json({
      notes: formattedNotes,
      stats: { noteCount: notes.length },
      lastSync: lastSync ? new Date(lastSync).toISOString() : null,
      currentUserId: process.env.SLITE_USER_ID || null,
    });
  } catch (error) {
    console.error("Slite cache fetch error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch Slite cache" },
      { status: 500 }
    );
  }
}
