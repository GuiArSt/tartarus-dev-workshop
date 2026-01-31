import { NextRequest, NextResponse } from "next/server";
import { eq, and, desc } from "drizzle-orm";
import { getDrizzleDb, prompts } from "@/lib/db/drizzle";
import { withErrorHandler } from "@/lib/api-handler";
import { requireParams, requireBody } from "@/lib/validations";
import { promptSlugSchema, updatePromptSchema } from "@/lib/validations/schemas";
import { NotFoundError } from "@/lib/errors";
import { normalizePromptContent, detectPromptRole } from "@/lib/prompts/chat-format";

type PromptRow = typeof prompts.$inferSelect;

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
 * GET /api/prompts/[slug]
 * Get a prompt by slug (returns latest version by default)
 */
export const GET = withErrorHandler(
  async (_request: NextRequest, context?: { params: Promise<{ slug: string }> }) => {
    const resolvedParams = await context?.params;
    const { slug } = requireParams(promptSlugSchema, resolvedParams);
    const db = getDrizzleDb();

    // Get the latest version of the prompt
    const [prompt] = await db
      .select()
      .from(prompts)
      .where(and(eq(prompts.slug, slug), eq(prompts.isLatest, true)))
      .limit(1);

    if (!prompt) {
      throw new NotFoundError("Prompt", slug);
    }

    // Get version history count
    const allVersions = await db
      .select({ id: prompts.id, version: prompts.version })
      .from(prompts)
      .where(eq(prompts.slug, slug))
      .orderBy(desc(prompts.version));

    return NextResponse.json({
      ...toApiPrompt(prompt),
      version_count: allVersions.length,
      versions: allVersions.map((v) => ({ id: v.id, version: v.version })),
    });
  }
);

/**
 * PUT /api/prompts/[slug]
 * Update a prompt (optionally creates a new version)
 */
export const PUT = withErrorHandler(
  async (request: NextRequest, context?: { params: Promise<{ slug: string }> }) => {
    const resolvedParams = await context?.params;
    const { slug } = requireParams(promptSlugSchema, resolvedParams);
    const body = requireBody(updatePromptSchema, await request.json());
    const db = getDrizzleDb();

    // Get current latest version
    const [current] = await db
      .select()
      .from(prompts)
      .where(and(eq(prompts.slug, slug), eq(prompts.isLatest, true)))
      .limit(1);

    if (!current) {
      throw new NotFoundError("Prompt", slug);
    }

    // Normalize content if provided
    const normalizedContent = body.content ? normalizePromptContent(body.content) : current.content;

    const detectedRole = body.content
      ? body.role || detectPromptRole(normalizedContent)
      : body.role || current.role;

    // Check if content actually changed (for versioning decision)
    const contentChanged = body.content && normalizedContent !== current.content;
    const shouldCreateVersion = body.create_version || contentChanged;

    if (shouldCreateVersion) {
      // Create new version
      // First, mark current as not latest
      await db.update(prompts).set({ isLatest: false }).where(eq(prompts.id, current.id));

      // Insert new version
      const [newVersion] = await db
        .insert(prompts)
        .values({
          slug: current.slug,
          projectId: body.project_id !== undefined ? body.project_id : current.projectId,
          name: body.name || current.name,
          content: normalizedContent,
          role: detectedRole,
          purpose: body.purpose !== undefined ? body.purpose : current.purpose,
          inputSchema: body.input_schema !== undefined ? body.input_schema : current.inputSchema,
          outputSchema:
            body.output_schema !== undefined ? body.output_schema : current.outputSchema,
          config:
            body.config !== undefined
              ? body.config
                ? JSON.stringify(body.config)
                : null
              : current.config,
          status: body.status || current.status,
          tags: body.tags ? JSON.stringify(body.tags) : current.tags,
          language: body.language || current.language,
          version: current.version + 1,
          isLatest: true,
          parentVersionId: current.id,
          legacyDocumentId: current.legacyDocumentId,
        })
        .returning();

      return NextResponse.json({
        ...toApiPrompt(newVersion),
        version_created: true,
        previous_version: current.version,
      });
    } else {
      // Update in place (for metadata-only changes)
      const [updated] = await db
        .update(prompts)
        .set({
          projectId: body.project_id !== undefined ? body.project_id : current.projectId,
          name: body.name || current.name,
          content: normalizedContent,
          role: detectedRole,
          purpose: body.purpose !== undefined ? body.purpose : current.purpose,
          inputSchema: body.input_schema !== undefined ? body.input_schema : current.inputSchema,
          outputSchema:
            body.output_schema !== undefined ? body.output_schema : current.outputSchema,
          config:
            body.config !== undefined
              ? body.config
                ? JSON.stringify(body.config)
                : null
              : current.config,
          status: body.status || current.status,
          tags: body.tags ? JSON.stringify(body.tags) : current.tags,
          language: body.language || current.language,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(prompts.id, current.id))
        .returning();

      return NextResponse.json({
        ...toApiPrompt(updated),
        version_created: false,
      });
    }
  }
);

/**
 * DELETE /api/prompts/[slug]
 * Delete a prompt (all versions)
 */
export const DELETE = withErrorHandler(
  async (_request: NextRequest, context?: { params: Promise<{ slug: string }> }) => {
    const resolvedParams = await context?.params;
    const { slug } = requireParams(promptSlugSchema, resolvedParams);
    const db = getDrizzleDb();

    // Check if exists
    const existing = await db
      .select({ id: prompts.id })
      .from(prompts)
      .where(eq(prompts.slug, slug))
      .limit(1);

    if (existing.length === 0) {
      throw new NotFoundError("Prompt", slug);
    }

    // Delete all versions
    await db.delete(prompts).where(eq(prompts.slug, slug));

    return NextResponse.json({ message: "Prompt deleted successfully" });
  }
);
