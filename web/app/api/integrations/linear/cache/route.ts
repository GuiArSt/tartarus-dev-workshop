import { NextRequest, NextResponse } from "next/server";
import { getDrizzleDb, linearProjects, linearIssues } from "@/lib/db/drizzle";
import { eq, desc } from "drizzle-orm";

/**
 * GET /api/integrations/linear/cache
 *
 * Fetch all cached Linear data (projects and issues) from local database.
 * Returns data from the local cache, not from Linear API.
 *
 * Query params:
 *   - includeDeleted: boolean (default: false) - include soft-deleted items
 *   - limit: number (default: 100) - max items per type
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeDeleted = searchParams.get("includeDeleted") === "true";
    const limit = Math.min(parseInt(searchParams.get("limit") || "100", 10), 500);

    const db = getDrizzleDb();

    // Fetch projects
    let projectsQuery = db.select().from(linearProjects);
    if (!includeDeleted) {
      projectsQuery = projectsQuery.where(eq(linearProjects.isDeleted, false)) as typeof projectsQuery;
    }
    const projects = await projectsQuery.orderBy(desc(linearProjects.updatedAt)).limit(limit);

    // Fetch issues
    let issuesQuery = db.select().from(linearIssues);
    if (!includeDeleted) {
      issuesQuery = issuesQuery.where(eq(linearIssues.isDeleted, false)) as typeof issuesQuery;
    }
    const issues = await issuesQuery.orderBy(desc(linearIssues.updatedAt)).limit(limit);

    // Get last sync time
    const lastProjectSync = projects.length > 0 ? projects[0]?.syncedAt : null;
    const lastIssueSync = issues.length > 0 ? issues[0]?.syncedAt : null;
    const lastSync =
      lastProjectSync && lastIssueSync
        ? new Date(
            Math.max(new Date(lastProjectSync).getTime(), new Date(lastIssueSync).getTime())
          ).toISOString()
        : lastProjectSync || lastIssueSync || null;

    // Format response
    const formattedProjects = projects.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      state: p.state,
      progress: p.progress,
      targetDate: p.targetDate,
      url: p.url,
      lead: p.leadId ? { id: p.leadId, name: p.leadName } : null,
      summary: p.summary,
      syncedAt: p.syncedAt,
      isDeleted: p.isDeleted,
    }));

    const formattedIssues = issues.map((i) => ({
      id: i.id,
      identifier: i.identifier,
      title: i.title,
      description: i.description,
      priority: i.priority,
      url: i.url,
      state: i.stateId ? { id: i.stateId, name: i.stateName } : null,
      assignee: i.assigneeId ? { id: i.assigneeId, name: i.assigneeName } : null,
      team: i.teamId ? { id: i.teamId, name: i.teamName, key: i.teamKey } : null,
      project: i.projectId ? { id: i.projectId, name: i.projectName } : null,
      summary: i.summary,
      syncedAt: i.syncedAt,
      isDeleted: i.isDeleted,
    }));

    return NextResponse.json({
      projects: formattedProjects,
      issues: formattedIssues,
      stats: {
        projectCount: projects.length,
        issueCount: issues.length,
      },
      lastSync,
    });
  } catch (error) {
    console.error("Linear cache fetch error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch Linear cache" },
      { status: 500 }
    );
  }
}
