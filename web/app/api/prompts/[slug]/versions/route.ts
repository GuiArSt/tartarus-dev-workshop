import { NextRequest, NextResponse } from "next/server";
import { eq, desc } from "drizzle-orm";
import { getDrizzleDb, prompts } from "@/lib/db/drizzle";
import { withErrorHandler } from "@/lib/api-handler";
import { requireParams } from "@/lib/validations";
import { promptSlugSchema } from "@/lib/validations/schemas";
import { NotFoundError } from "@/lib/errors";

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
 * GET /api/prompts/[slug]/versions
 * Get all versions of a prompt
 */
export const GET = withErrorHandler(
  async (_request: NextRequest, context?: { params: Promise<{ slug: string }> }) => {
    const resolvedParams = await context?.params;
    const { slug } = requireParams(promptSlugSchema, resolvedParams);
    const db = getDrizzleDb();

    const allVersions = await db
      .select()
      .from(prompts)
      .where(eq(prompts.slug, slug))
      .orderBy(desc(prompts.version));

    if (allVersions.length === 0) {
      throw new NotFoundError("Prompt", slug);
    }

    return NextResponse.json({
      slug,
      total_versions: allVersions.length,
      versions: allVersions.map(toApiPrompt),
    });
  }
);
