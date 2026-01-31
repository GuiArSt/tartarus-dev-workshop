import { NextRequest, NextResponse } from "next/server";
import { listProjects, listIssues } from "@/lib/linear/client";
import { getDrizzleDb, linearProjects, linearIssues } from "@/lib/db/drizzle";
import { eq } from "drizzle-orm";

/**
 * Linear Sync Preview API
 *
 * Returns a diff between Linear API data and local cache, showing:
 * - New items (in API but not in cache)
 * - Updated items (in both, but with field changes)
 * - Deleted items (in cache but not in API)
 *
 * Also generates AI summaries for new items (without saving them).
 *
 * GET - Preview changes before syncing
 */

interface SyncChange {
  type: "project" | "issue";
  action: "create" | "update" | "delete";
  id: string;
  identifier?: string;
  name: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  changedFields: string[];
  currentSummary: string | null;
  proposedSummary: string | null;
  summaryNeedsReview: boolean;
}

interface SyncPreview {
  changes: SyncChange[];
  stats: {
    created: number;
    updated: number;
    deleted: number;
    unchanged: number;
  };
  generatedAt: string;
}

// Fields to compare for detecting updates (excluding metadata fields)
const PROJECT_COMPARE_FIELDS = [
  "name",
  "description",
  "content",
  "state",
  "progress",
  "targetDate",
  "startDate",
  "leadId",
  "leadName",
];

const ISSUE_COMPARE_FIELDS = [
  "title",
  "description",
  "priority",
  "stateId",
  "stateName",
  "assigneeId",
  "assigneeName",
  "teamId",
  "teamName",
  "projectId",
  "projectName",
];

/**
 * Generate a summary for Linear content using the AI summarize endpoint
 */
async function generateSummary(
  type: "linear_issue" | "linear_project",
  content: string,
  title: string
): Promise<string | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const response = await fetch(`${baseUrl}/api/ai/summarize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, content, title }),
    });

    if (!response.ok) {
      console.warn(`Summary generation failed for ${type}: ${response.status}`);
      return null;
    }

    const data = await response.json();
    return data.summary || null;
  } catch (error) {
    console.warn(`Summary generation error for ${type}:`, error);
    return null;
  }
}

/**
 * Compare two values and return true if they differ
 */
function valuesDiffer(a: unknown, b: unknown): boolean {
  // Handle null/undefined
  if (a == null && b == null) return false;
  if (a == null || b == null) return true;

  // Handle arrays (team members, etc.)
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return true;
    return JSON.stringify(a.sort()) !== JSON.stringify(b.sort());
  }

  // Handle objects
  if (typeof a === "object" && typeof b === "object") {
    return JSON.stringify(a) !== JSON.stringify(b);
  }

  // Simple comparison
  return a !== b;
}

/**
 * Get changed fields between cached and API data
 */
function getChangedFields(
  cached: Record<string, unknown>,
  api: Record<string, unknown>,
  fields: string[]
): string[] {
  const changed: string[] = [];

  for (const field of fields) {
    if (valuesDiffer(cached[field], api[field])) {
      changed.push(field);
    }
  }

  return changed;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeCompleted = searchParams.get("includeCompleted") === "true";

    const db = getDrizzleDb();

    // Fetch from Linear API (parallel)
    const [apiProjectsResult, apiIssuesResult] = await Promise.all([
      listProjects({ showAll: false }), // Only user's projects
      listIssues({ limit: 250, showAll: false }), // Only user's issues
    ]);

    const apiProjects = apiProjectsResult.projects || [];
    const apiIssues = apiIssuesResult.issues || [];

    // Fetch from cache (parallel)
    const [cachedProjects, cachedIssues] = await Promise.all([
      db.select().from(linearProjects).where(eq(linearProjects.isDeleted, false)),
      db.select().from(linearIssues).where(eq(linearIssues.isDeleted, false)),
    ]);

    // Build lookup maps
    const cachedProjectsMap = new Map(cachedProjects.map((p) => [p.id, p]));
    const cachedIssuesMap = new Map(cachedIssues.map((i) => [i.id, i]));
    const apiProjectIds = new Set(apiProjects.map((p: any) => p.id));
    const apiIssueIds = new Set(apiIssues.map((i: any) => i.id));

    const changes: SyncChange[] = [];
    let unchanged = 0;

    // ─────────────────────────────────────────────────────────────────────────
    // Projects
    // ─────────────────────────────────────────────────────────────────────────

    for (const apiProject of apiProjects) {
      const cached = cachedProjectsMap.get(apiProject.id);

      // Transform API data to match cache schema
      const apiData = {
        id: apiProject.id,
        name: apiProject.name,
        description: apiProject.description || null,
        content: apiProject.content || null,
        state: apiProject.state || null,
        progress: apiProject.progress || null,
        targetDate: apiProject.targetDate || null,
        startDate: apiProject.startDate || null,
        leadId: apiProject.lead?.id || null,
        leadName: apiProject.lead?.name || null,
      };

      if (!cached) {
        // New project
        const contentForSummary = [apiProject.description, apiProject.content]
          .filter(Boolean)
          .join("\n\n");

        let proposedSummary: string | null = null;
        if (contentForSummary.length > 20) {
          proposedSummary = await generateSummary(
            "linear_project",
            contentForSummary,
            apiProject.name
          );
        }

        changes.push({
          type: "project",
          action: "create",
          id: apiProject.id,
          name: apiProject.name,
          before: null,
          after: apiData,
          changedFields: Object.keys(apiData),
          currentSummary: null,
          proposedSummary,
          summaryNeedsReview: proposedSummary !== null,
        });
      } else {
        // Existing project - check for updates
        const changedFields = getChangedFields(
          cached as Record<string, unknown>,
          apiData,
          PROJECT_COMPARE_FIELDS
        );

        if (changedFields.length > 0) {
          // Generate new summary if content changed and current one is empty
          let proposedSummary: string | null = null;
          const summaryNeedsReview =
            !cached.summary &&
            (changedFields.includes("description") || changedFields.includes("content"));

          if (summaryNeedsReview) {
            const contentForSummary = [apiProject.description, apiProject.content]
              .filter(Boolean)
              .join("\n\n");

            if (contentForSummary.length > 20) {
              proposedSummary = await generateSummary(
                "linear_project",
                contentForSummary,
                apiProject.name
              );
            }
          }

          changes.push({
            type: "project",
            action: "update",
            id: apiProject.id,
            name: apiProject.name,
            before: Object.fromEntries(
              changedFields.map((f) => [f, (cached as Record<string, unknown>)[f]])
            ),
            after: Object.fromEntries(
              changedFields.map((f) => [f, apiData[f as keyof typeof apiData]])
            ),
            changedFields,
            currentSummary: cached.summary,
            proposedSummary,
            summaryNeedsReview,
          });
        } else {
          unchanged++;
        }
      }
    }

    // Projects deleted in Linear (in cache but not in API)
    for (const cached of cachedProjects) {
      if (!apiProjectIds.has(cached.id)) {
        changes.push({
          type: "project",
          action: "delete",
          id: cached.id,
          name: cached.name,
          before: {
            name: cached.name,
            description: cached.description,
            state: cached.state,
          },
          after: null,
          changedFields: [],
          currentSummary: cached.summary,
          proposedSummary: null,
          summaryNeedsReview: false,
        });
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Issues
    // ─────────────────────────────────────────────────────────────────────────

    for (const apiIssue of apiIssues) {
      const cached = cachedIssuesMap.get(apiIssue.id);

      // Transform API data to match cache schema
      const apiData = {
        id: apiIssue.id,
        identifier: apiIssue.identifier,
        title: apiIssue.title,
        description: apiIssue.description || null,
        priority: apiIssue.priority ?? null,
        stateId: apiIssue.state?.id || null,
        stateName: apiIssue.state?.name || null,
        assigneeId: apiIssue.assignee?.id || null,
        assigneeName: apiIssue.assignee?.name || null,
        teamId: apiIssue.team?.id || null,
        teamName: apiIssue.team?.name || null,
        projectId: apiIssue.project?.id || null,
        projectName: apiIssue.project?.name || null,
      };

      if (!cached) {
        // New issue
        let proposedSummary: string | null = null;
        if (apiIssue.description && apiIssue.description.length > 20) {
          proposedSummary = await generateSummary(
            "linear_issue",
            apiIssue.description,
            apiIssue.title
          );
        }

        changes.push({
          type: "issue",
          action: "create",
          id: apiIssue.id,
          identifier: apiIssue.identifier,
          name: apiIssue.title,
          before: null,
          after: apiData,
          changedFields: Object.keys(apiData),
          currentSummary: null,
          proposedSummary,
          summaryNeedsReview: proposedSummary !== null,
        });
      } else {
        // Existing issue - check for updates
        const changedFields = getChangedFields(
          cached as Record<string, unknown>,
          apiData,
          ISSUE_COMPARE_FIELDS
        );

        if (changedFields.length > 0) {
          // Generate new summary if description changed and current one is empty
          let proposedSummary: string | null = null;
          const summaryNeedsReview = !cached.summary && changedFields.includes("description");

          if (summaryNeedsReview && apiIssue.description?.length > 20) {
            proposedSummary = await generateSummary(
              "linear_issue",
              apiIssue.description,
              apiIssue.title
            );
          }

          changes.push({
            type: "issue",
            action: "update",
            id: apiIssue.id,
            identifier: apiIssue.identifier,
            name: apiIssue.title,
            before: Object.fromEntries(
              changedFields.map((f) => [f, (cached as Record<string, unknown>)[f]])
            ),
            after: Object.fromEntries(
              changedFields.map((f) => [f, apiData[f as keyof typeof apiData]])
            ),
            changedFields,
            currentSummary: cached.summary,
            proposedSummary,
            summaryNeedsReview,
          });
        } else {
          unchanged++;
        }
      }
    }

    // Issues deleted in Linear (in cache but not in API)
    for (const cached of cachedIssues) {
      if (!apiIssueIds.has(cached.id)) {
        changes.push({
          type: "issue",
          action: "delete",
          id: cached.id,
          identifier: cached.identifier,
          name: cached.title,
          before: {
            title: cached.title,
            description: cached.description,
            stateName: cached.stateName,
            priority: cached.priority,
          },
          after: null,
          changedFields: [],
          currentSummary: cached.summary,
          proposedSummary: null,
          summaryNeedsReview: false,
        });
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Build Response
    // ─────────────────────────────────────────────────────────────────────────

    const stats = {
      created: changes.filter((c) => c.action === "create").length,
      updated: changes.filter((c) => c.action === "update").length,
      deleted: changes.filter((c) => c.action === "delete").length,
      unchanged,
    };

    const preview: SyncPreview = {
      changes,
      stats,
      generatedAt: new Date().toISOString(),
    };

    return NextResponse.json(preview);
  } catch (error: any) {
    console.error("Linear sync preview error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate sync preview" },
      { status: 500 }
    );
  }
}
