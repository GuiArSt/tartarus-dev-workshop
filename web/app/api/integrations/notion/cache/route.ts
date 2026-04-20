import { NextRequest, NextResponse } from "next/server";
import { getDrizzleDb, notionPages } from "@/lib/db/drizzle";
import { eq, desc } from "drizzle-orm";

/**
 * GET /api/integrations/notion/cache
 *
 * Fetch all cached Notion pages from local database.
 * Returns data from the local cache, not from Notion API.
 *
 * Query params:
 *   - includeDeleted: boolean (default: false)
 *   - limit: number (default: 1000)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeDeleted = searchParams.get("includeDeleted") === "true";
    const limit = Math.min(
      parseInt(searchParams.get("limit") || "1000", 10),
      2000
    );

    const db = getDrizzleDb();

    let query = db.select().from(notionPages);
    if (!includeDeleted) {
      query = query.where(eq(notionPages.isDeleted, false)) as typeof query;
    }
    const pages = await query
      .orderBy(desc(notionPages.lastEditedAt))
      .limit(limit);

    const lastSync =
      pages.length > 0
        ? pages.reduce((latest, p) => {
            const t = new Date(p.syncedAt || 0).getTime();
            return t > latest ? t : latest;
          }, 0)
        : null;

    const formattedPages = pages.map((p) => ({
      id: p.id,
      title: p.title,
      content: p.content,
      parentId: p.parentId,
      parentType: p.parentType,
      url: p.url,
      createdBy: p.createdBy,
      createdByName: p.createdByName,
      lastEditedBy: p.lastEditedBy,
      lastEditedByName: p.lastEditedByName,
      icon: p.icon,
      archived: p.archived,
      summary: p.summary,
      syncedAt: p.syncedAt,
      updatedAt: p.updatedAt,
      lastEditedAt: p.lastEditedAt,
      isDeleted: p.isDeleted,
    }));

    return NextResponse.json({
      pages: formattedPages,
      stats: { pageCount: pages.length },
      lastSync: lastSync ? new Date(lastSync).toISOString() : null,
    });
  } catch (error) {
    console.error("Notion cache fetch error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch Notion cache",
      },
      { status: 500 }
    );
  }
}
