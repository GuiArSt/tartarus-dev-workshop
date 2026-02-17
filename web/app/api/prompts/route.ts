import { NextRequest, NextResponse } from "next/server";
import { and, count, desc, eq, like, sql } from "drizzle-orm";
import { getDrizzleDb, prompts, promptProjects } from "@/lib/db/drizzle";
import { withErrorHandler } from "@/lib/api-handler";
import { requireQuery, requireBody } from "@/lib/validations";
import { promptQuerySchema, createPromptSchema } from "@/lib/validations/schemas";
import { ConflictError } from "@/lib/errors";
import { normalizePromptContent, detectPromptRole } from "@/lib/prompts/chat-format";

type PromptRow = typeof prompts.$inferSelect;

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

function parseJsonField<T>(value: string | null, defaultValue: T): T {
  if (!value) return defaultValue;
  try {
    return JSON.parse(value) as T;
  } catch {
    return defaultValue;
  }
}

function toApiPrompt(row: PromptRow) {
  return {
    id: row.id,
    slug: row.slug,
    project_id: row.projectId,
    name: row.name,
    content: row.content,
    role: row.role,
    purpose: row.purpose,
    input_schema: row.inputSchema,
    output_schema: row.outputSchema,
    config: parseJsonField(row.config, null),
    version: row.version,
    is_latest: row.isLatest,
    parent_version_id: row.parentVersionId,
    status: row.status,
    tags: parseJsonField(row.tags, []),
    language: row.language,
    summary: row.summary,
    legacy_document_id: row.legacyDocumentId,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
  };
}

/**
 * GET /api/prompts
 * List prompts with optional filtering
 */
export const GET = withErrorHandler(async (request: NextRequest) => {
  const { project_id, role, status, search, latest_only, limit, offset } = requireQuery(
    promptQuerySchema,
    request
  );
  const db = getDrizzleDb();

  const conditions = [];

  if (latest_only) {
    conditions.push(eq(prompts.isLatest, true));
  }
  if (project_id) {
    conditions.push(eq(prompts.projectId, project_id));
  }
  if (role) {
    conditions.push(eq(prompts.role, role));
  }
  if (status) {
    conditions.push(eq(prompts.status, status));
  }
  if (search) {
    const searchTerm = `%${search}%`;
    conditions.push(
      sql`(${prompts.name} LIKE ${searchTerm} OR ${prompts.content} LIKE ${searchTerm} OR ${prompts.purpose} LIKE ${searchTerm})`
    );
  }

  const promptRows = await db
    .select()
    .from(prompts)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(prompts.updatedAt))
    .limit(limit)
    .offset(offset);

  const [totalResult] = await db
    .select({ count: count() })
    .from(prompts)
    .where(conditions.length > 0 ? and(...conditions) : undefined);

  const total = totalResult?.count ?? 0;

  return NextResponse.json({
    prompts: promptRows.map(toApiPrompt),
    total,
    limit,
    offset,
    has_more: offset + promptRows.length < total,
  });
});

/**
 * POST /api/prompts
 * Create a new prompt
 */
export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await requireBody(createPromptSchema, request);
  const db = getDrizzleDb();

  // Generate slug if not provided
  const slug = body.slug || slugify(body.name);

  // Check for existing slug
  const existing = await db
    .select({ id: prompts.id })
    .from(prompts)
    .where(eq(prompts.slug, slug))
    .limit(1);

  if (existing.length > 0) {
    throw new ConflictError(`Prompt with slug '${slug}' already exists`);
  }

  // Normalize content to chat format and detect role
  const normalizedContent = normalizePromptContent(body.content);
  const detectedRole = body.role || detectPromptRole(normalizedContent);

  // Validate project_id if provided
  if (body.project_id) {
    const project = await db
      .select({ id: promptProjects.id })
      .from(promptProjects)
      .where(eq(promptProjects.id, body.project_id))
      .limit(1);

    if (project.length === 0) {
      throw new ConflictError(`Project '${body.project_id}' does not exist`);
    }
  }

  const [inserted] = await db
    .insert(prompts)
    .values({
      slug,
      projectId: body.project_id || null,
      name: body.name,
      content: normalizedContent,
      role: detectedRole,
      purpose: body.purpose || null,
      inputSchema: body.input_schema || null,
      outputSchema: body.output_schema || null,
      config: body.config ? JSON.stringify(body.config) : null,
      status: body.status,
      tags: JSON.stringify(body.tags),
      language: body.language,
      version: 1,
      isLatest: true,
    })
    .returning();

  return NextResponse.json(toApiPrompt(inserted), { status: 201 });
});
