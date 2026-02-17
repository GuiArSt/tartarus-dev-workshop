import { NextRequest, NextResponse } from "next/server";
import { and, count, desc, eq, like, sql } from "drizzle-orm";
import { getDrizzleDb, promptProjects, prompts } from "@/lib/db/drizzle";
import { withErrorHandler } from "@/lib/api-handler";
import { requireQuery, requireBody } from "@/lib/validations";
import { promptProjectQuerySchema, createPromptProjectSchema } from "@/lib/validations/schemas";
import { ConflictError } from "@/lib/errors";

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
 * GET /api/prompts/projects
 * List prompt projects with optional filtering
 */
export const GET = withErrorHandler(async (request: NextRequest) => {
  const { status, search, limit, offset } = requireQuery(promptProjectQuerySchema, request);
  const db = getDrizzleDb();

  const conditions = [];

  if (status) {
    conditions.push(eq(promptProjects.status, status));
  }
  if (search) {
    const searchTerm = `%${search}%`;
    conditions.push(
      sql`(${promptProjects.name} LIKE ${searchTerm} OR ${promptProjects.description} LIKE ${searchTerm})`
    );
  }

  const projectRows = await db
    .select()
    .from(promptProjects)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(promptProjects.updatedAt))
    .limit(limit)
    .offset(offset);

  // Get prompt counts for each project
  const projectsWithCounts = await Promise.all(
    projectRows.map(async (project) => {
      const [countResult] = await db
        .select({ count: count() })
        .from(prompts)
        .where(and(eq(prompts.projectId, project.id), eq(prompts.isLatest, true)));

      return {
        ...toApiProject(project),
        prompt_count: countResult?.count ?? 0,
      };
    })
  );

  const [totalResult] = await db
    .select({ count: count() })
    .from(promptProjects)
    .where(conditions.length > 0 ? and(...conditions) : undefined);

  const total = totalResult?.count ?? 0;

  return NextResponse.json({
    projects: projectsWithCounts,
    total,
    limit,
    offset,
    has_more: offset + projectRows.length < total,
  });
});

/**
 * POST /api/prompts/projects
 * Create a new prompt project
 */
export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await requireBody(createPromptProjectSchema, request);
  const db = getDrizzleDb();

  // Check for existing ID
  const existing = await db
    .select({ id: promptProjects.id })
    .from(promptProjects)
    .where(eq(promptProjects.id, body.id))
    .limit(1);

  if (existing.length > 0) {
    throw new ConflictError(`Project with ID '${body.id}' already exists`);
  }

  const [inserted] = await db
    .insert(promptProjects)
    .values({
      id: body.id,
      name: body.name,
      description: body.description || null,
      status: body.status,
      tags: JSON.stringify(body.tags),
      metadata: JSON.stringify(body.metadata),
    })
    .returning();

  return NextResponse.json(toApiProject(inserted), { status: 201 });
});
