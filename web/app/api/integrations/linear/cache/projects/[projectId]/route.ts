import { NextRequest, NextResponse } from "next/server";
import { getDrizzleDb, linearProjects } from "@/lib/db/drizzle";
import { eq } from "drizzle-orm";

/**
 * GET /api/integrations/linear/cache/projects/[projectId]
 *
 * Fetch full project details from local cache (not Linear API).
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const db = getDrizzleDb();

    const project = await db
      .select()
      .from(linearProjects)
      .where(eq(linearProjects.id, projectId))
      .get();

    if (!project) {
      return NextResponse.json(
        { error: `Project "${projectId}" not found in cache. Try syncing Linear data first.` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: project.id,
      name: project.name,
      description: project.description,
      content: project.content,
      state: project.state,
      progress: project.progress,
      targetDate: project.targetDate,
      startDate: project.startDate,
      url: project.url,
      lead: project.leadId
        ? {
            id: project.leadId,
            name: project.leadName,
          }
        : null,
      teamIds: JSON.parse(project.teamIds || "[]"),
      memberIds: JSON.parse(project.memberIds || "[]"),
      summary: project.summary,
      syncedAt: project.syncedAt,
      isDeleted: project.isDeleted,
    });
  } catch (error: any) {
    console.error("Linear cache project fetch error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch project from cache" },
      { status: 500 }
    );
  }
}
