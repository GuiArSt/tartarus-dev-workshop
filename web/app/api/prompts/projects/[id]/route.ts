import { NextRequest, NextResponse } from "next/server";
import { eq, and, count } from "drizzle-orm";
import { getDrizzleDb, promptProjects, prompts } from "@/lib/db/drizzle";
import { withErrorHandler } from "@/lib/api-handler";
import { requireParams, requireBody } from "@/lib/validations";
import { stringIdParamSchema, updatePromptProjectSchema } from "@/lib/validations/schemas";
import { NotFoundError } from "@/lib/errors";

type ProjectRow = typeof promptProjects.$inferSelect;

function parseJsonField<T>(value: string | null, defaultValue: T): T {
  if (!value) return defaultValue;
  try {
    return JSON.parse(value) as T;
  } catch {
    return defaultValue;
  }
}

function toApiProject(row: ProjectRow) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    status: row.status,
    tags: parseJsonField(row.tags, []),
    metadata: parseJsonField(row.metadata, {}),
    created_at: row.createdAt,
    updated_at: row.updatedAt,
  };
}

/**
 * GET /api/prompts/projects/[id]
 * Get a prompt project by ID
 */
export const GET = withErrorHandler(
  async (_request: NextRequest, context?: { params: Promise<{ id: string }> }) => {
    const resolvedParams = await context?.params;
    const { id } = requireParams(stringIdParamSchema, resolvedParams);
    const db = getDrizzleDb();

    const [project] = await db
      .select()
      .from(promptProjects)
      .where(eq(promptProjects.id, id))
      .limit(1);

    if (!project) {
      throw new NotFoundError("Project", id);
    }

    // Get prompt count
    const [countResult] = await db
      .select({ count: count() })
      .from(prompts)
      .where(and(eq(prompts.projectId, id), eq(prompts.isLatest, true)));

    return NextResponse.json({
      ...toApiProject(project),
      prompt_count: countResult?.count ?? 0,
    });
  }
);

/**
 * PUT /api/prompts/projects/[id]
 * Update a prompt project
 */
export const PUT = withErrorHandler(
  async (request: NextRequest, context?: { params: Promise<{ id: string }> }) => {
    const resolvedParams = await context?.params;
    const { id } = requireParams(stringIdParamSchema, resolvedParams);
    const body = await requireBody(updatePromptProjectSchema, request);
    const db = getDrizzleDb();

    // Check if exists
    const [existing] = await db
      .select()
      .from(promptProjects)
      .where(eq(promptProjects.id, id))
      .limit(1);

    if (!existing) {
      throw new NotFoundError("Project", id);
    }

    const [updated] = await db
      .update(promptProjects)
      .set({
        name: body.name || existing.name,
        description: body.description !== undefined ? body.description : existing.description,
        status: body.status || existing.status,
        tags: body.tags ? JSON.stringify(body.tags) : existing.tags,
        metadata: body.metadata ? JSON.stringify(body.metadata) : existing.metadata,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(promptProjects.id, id))
      .returning();

    return NextResponse.json(toApiProject(updated));
  }
);

/**
 * DELETE /api/prompts/projects/[id]
 * Delete a prompt project (prompts are NOT deleted, just unlinked)
 */
export const DELETE = withErrorHandler(
  async (_request: NextRequest, context?: { params: Promise<{ id: string }> }) => {
    const resolvedParams = await context?.params;
    const { id } = requireParams(stringIdParamSchema, resolvedParams);
    const db = getDrizzleDb();

    // Check if exists
    const [existing] = await db
      .select({ id: promptProjects.id })
      .from(promptProjects)
      .where(eq(promptProjects.id, id))
      .limit(1);

    if (!existing) {
      throw new NotFoundError("Project", id);
    }

    // Delete project (prompts will have project_id set to NULL due to ON DELETE SET NULL)
    await db.delete(promptProjects).where(eq(promptProjects.id, id));

    return NextResponse.json({ message: "Project deleted successfully" });
  }
);
