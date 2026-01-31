import { NextRequest, NextResponse } from "next/server";
import { getDrizzleDb, linearIssues } from "@/lib/db/drizzle";
import { eq, or } from "drizzle-orm";

/**
 * GET /api/integrations/linear/cache/issues/[identifier]
 *
 * Fetch full issue details from local cache (not Linear API).
 * Accepts either the Linear ID or the identifier (e.g., "ENG-1234").
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ identifier: string }> }
) {
  try {
    const { identifier } = await params;
    const db = getDrizzleDb();

    // Try to find by identifier (e.g., "ENG-1234") or by ID
    const issue = await db
      .select()
      .from(linearIssues)
      .where(or(eq(linearIssues.identifier, identifier), eq(linearIssues.id, identifier)))
      .get();

    if (!issue) {
      return NextResponse.json(
        { error: `Issue "${identifier}" not found in cache. Try syncing Linear data first.` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: issue.id,
      identifier: issue.identifier,
      title: issue.title,
      description: issue.description,
      url: issue.url,
      priority: issue.priority,
      state: {
        id: issue.stateId,
        name: issue.stateName,
      },
      assignee: issue.assigneeId
        ? {
            id: issue.assigneeId,
            name: issue.assigneeName,
          }
        : null,
      team: issue.teamId
        ? {
            id: issue.teamId,
            name: issue.teamName,
            key: issue.teamKey,
          }
        : null,
      project: issue.projectId
        ? {
            id: issue.projectId,
            name: issue.projectName,
          }
        : null,
      parentId: issue.parentId,
      summary: issue.summary,
      syncedAt: issue.syncedAt,
      isDeleted: issue.isDeleted,
    });
  } catch (error: any) {
    console.error("Linear cache issue fetch error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch issue from cache" },
      { status: 500 }
    );
  }
}
