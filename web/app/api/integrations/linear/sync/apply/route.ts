import { NextRequest, NextResponse } from "next/server";
import { listProjects, listIssues } from "@/lib/linear/client";
import { getDrizzleDb, linearProjects, linearIssues } from "@/lib/db/drizzle";
import { eq } from "drizzle-orm";

/**
 * Linear Sync Apply API
 *
 * Applies only the approved changes from a preview.
 * This gives users control over what gets synced to the local cache.
 *
 * POST - Apply approved changes
 */

interface ApprovedChange {
  id: string;
  type: "project" | "issue";
  action: "create" | "update" | "delete";
  summaryOverride?: string;
}

interface ApplyRequest {
  approved: ApprovedChange[];
  rejected?: string[];
}

interface ApplyResult {
  success: boolean;
  applied: number;
  skipped: number;
  errors: Array<{ id: string; error: string }>;
  details: {
    projects: { created: number; updated: number; deleted: number };
    issues: { created: number; updated: number; deleted: number };
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: ApplyRequest = await request.json();
    const { approved = [], rejected = [] } = body;

    if (approved.length === 0) {
      return NextResponse.json({
        success: true,
        applied: 0,
        skipped: 0,
        errors: [],
        details: {
          projects: { created: 0, updated: 0, deleted: 0 },
          issues: { created: 0, updated: 0, deleted: 0 },
        },
      });
    }

    const db = getDrizzleDb();

    // Fetch fresh data from Linear API for the approved items
    const [apiProjectsResult, apiIssuesResult] = await Promise.all([
      listProjects({ showAll: false }),
      listIssues({ limit: 250, showAll: false }),
    ]);

    const apiProjectsMap = new Map((apiProjectsResult.projects || []).map((p: any) => [p.id, p]));
    const apiIssuesMap = new Map((apiIssuesResult.issues || []).map((i: any) => [i.id, i]));

    const errors: Array<{ id: string; error: string }> = [];
    const details = {
      projects: { created: 0, updated: 0, deleted: 0 },
      issues: { created: 0, updated: 0, deleted: 0 },
    };

    // Process approved changes
    for (const change of approved) {
      try {
        if (change.type === "project") {
          await applyProjectChange(db, change, apiProjectsMap, details.projects);
        } else if (change.type === "issue") {
          await applyIssueChange(db, change, apiIssuesMap, details.issues);
        }
      } catch (error: any) {
        console.error(`Error applying change ${change.id}:`, error);
        errors.push({
          id: change.id,
          error: error.message || "Unknown error",
        });
      }
    }

    const result: ApplyResult = {
      success: errors.length === 0,
      applied:
        details.projects.created +
        details.projects.updated +
        details.projects.deleted +
        details.issues.created +
        details.issues.updated +
        details.issues.deleted,
      skipped: rejected.length,
      errors,
      details,
    };

    console.log("[Linear Sync Apply] Completed:", result);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Linear sync apply error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to apply sync changes" },
      { status: 500 }
    );
  }
}

/**
 * Apply a project change
 */
async function applyProjectChange(
  db: ReturnType<typeof getDrizzleDb>,
  change: ApprovedChange,
  apiProjectsMap: Map<string, any>,
  stats: { created: number; updated: number; deleted: number }
) {
  const now = new Date().toISOString();

  if (change.action === "delete") {
    // Soft delete: mark as deleted but preserve data
    await db
      .update(linearProjects)
      .set({
        isDeleted: true,
        deletedAt: now,
        syncedAt: now,
      })
      .where(eq(linearProjects.id, change.id));

    stats.deleted++;
    return;
  }

  const apiProject = apiProjectsMap.get(change.id);
  if (!apiProject) {
    throw new Error(`Project ${change.id} not found in Linear API`);
  }

  const teamIds = apiProject.members?.nodes?.map((m: any) => m.id) || [];
  const memberIds = apiProject.members?.nodes?.map((m: any) => m.id) || [];

  const projectData = {
    id: apiProject.id,
    name: apiProject.name,
    description: apiProject.description || null,
    content: apiProject.content || null,
    state: apiProject.state || null,
    progress: apiProject.progress || null,
    targetDate: apiProject.targetDate || null,
    startDate: apiProject.startDate || null,
    url: apiProject.url,
    leadId: apiProject.lead?.id || null,
    leadName: apiProject.lead?.name || null,
    teamIds: JSON.stringify(teamIds),
    memberIds: JSON.stringify(memberIds),
    syncedAt: now,
    updatedAt: now,
    isDeleted: false,
    deletedAt: null,
  };

  if (change.action === "create") {
    // Create new project
    await db.insert(linearProjects).values({
      ...projectData,
      summary: change.summaryOverride || null,
      createdAt: now,
    });

    stats.created++;
  } else if (change.action === "update") {
    // Update existing project
    const updateData: Record<string, unknown> = { ...projectData };

    // Only update summary if override provided
    if (change.summaryOverride !== undefined) {
      updateData.summary = change.summaryOverride;
    }

    await db.update(linearProjects).set(updateData).where(eq(linearProjects.id, change.id));

    stats.updated++;
  }
}

/**
 * Apply an issue change
 */
async function applyIssueChange(
  db: ReturnType<typeof getDrizzleDb>,
  change: ApprovedChange,
  apiIssuesMap: Map<string, any>,
  stats: { created: number; updated: number; deleted: number }
) {
  const now = new Date().toISOString();

  if (change.action === "delete") {
    // Soft delete: mark as deleted but preserve data
    await db
      .update(linearIssues)
      .set({
        isDeleted: true,
        deletedAt: now,
        syncedAt: now,
      })
      .where(eq(linearIssues.id, change.id));

    stats.deleted++;
    return;
  }

  const apiIssue = apiIssuesMap.get(change.id);
  if (!apiIssue) {
    throw new Error(`Issue ${change.id} not found in Linear API`);
  }

  const issueData = {
    id: apiIssue.id,
    identifier: apiIssue.identifier,
    title: apiIssue.title,
    description: apiIssue.description || null,
    url: apiIssue.url,
    priority: apiIssue.priority ?? null,
    stateId: apiIssue.state?.id || null,
    stateName: apiIssue.state?.name || null,
    assigneeId: apiIssue.assignee?.id || null,
    assigneeName: apiIssue.assignee?.name || null,
    teamId: apiIssue.team?.id || null,
    teamName: apiIssue.team?.name || null,
    teamKey: apiIssue.team?.key || null,
    projectId: apiIssue.project?.id || null,
    projectName: apiIssue.project?.name || null,
    parentId: apiIssue.parent?.id || null,
    syncedAt: now,
    updatedAt: now,
    isDeleted: false,
    deletedAt: null,
  };

  if (change.action === "create") {
    // Create new issue
    await db.insert(linearIssues).values({
      ...issueData,
      summary: change.summaryOverride || null,
      createdAt: now,
    });

    stats.created++;
  } else if (change.action === "update") {
    // Update existing issue
    const updateData: Record<string, unknown> = { ...issueData };

    // Only update summary if override provided
    if (change.summaryOverride !== undefined) {
      updateData.summary = change.summaryOverride;
    }

    await db.update(linearIssues).set(updateData).where(eq(linearIssues.id, change.id));

    stats.updated++;
  }
}
