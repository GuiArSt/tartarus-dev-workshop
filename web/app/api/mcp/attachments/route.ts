import { NextRequest, NextResponse } from "next/server";
import { validateMcpApiKey, mcpUnauthorizedResponse } from "@/lib/mcp-auth";
import { getDatabase } from "@/lib/db";

/**
 * MCP Resources API - List attachments
 * GET /api/mcp/attachments - List all attachments (metadata only)
 *
 * Query params:
 * - commit_hash: Filter by journal entry
 * - type: Filter by file type (mermaid, image, etc.)
 * - limit: Max results (default 50)
 * - offset: Pagination offset
 */

export async function GET(request: NextRequest) {
  // Validate MCP API key
  const auth = validateMcpApiKey(request);
  if (!auth.valid) {
    return mcpUnauthorizedResponse(auth.error!);
  }

  const url = new URL(request.url);
  const commitHash = url.searchParams.get("commit_hash");
  const fileType = url.searchParams.get("type");
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "50", 10), 100);
  const offset = parseInt(url.searchParams.get("offset") || "0", 10);

  try {
    const db = getDatabase();

    // Build query with optional filters
    let whereClause = "1=1";
    const params: any[] = [];

    if (commitHash) {
      whereClause += " AND commit_hash = ?";
      params.push(commitHash);
    }

    if (fileType) {
      whereClause += " AND file_type = ?";
      params.push(fileType);
    }

    // Get total count
    const countResult = db
      .prepare(`SELECT COUNT(*) as total FROM journal_attachments WHERE ${whereClause}`)
      .get(...params) as { total: number };

    // Get attachments (metadata only, no binary)
    const attachments = db
      .prepare(
        `SELECT id, commit_hash, filename, file_type, file_size, description, created_at
         FROM journal_attachments
         WHERE ${whereClause}
         ORDER BY created_at DESC
         LIMIT ? OFFSET ?`
      )
      .all(...params, limit, offset) as Array<{
      id: number;
      commit_hash: string;
      filename: string;
      file_type: string;
      file_size: number;
      description: string | null;
      created_at: string;
    }>;

    // Add URLs to each attachment
    const attachmentsWithUrls = attachments.map((a) => ({
      ...a,
      file_size_kb: (a.file_size / 1024).toFixed(2),
      metadata_url: `/api/mcp/attachments/${a.id}`,
      raw_url: `/api/mcp/attachments/${a.id}/raw`,
    }));

    // Group by type for discoverability
    const byType: Record<string, number> = {};
    for (const a of attachments) {
      byType[a.file_type] = (byType[a.file_type] || 0) + 1;
    }

    return NextResponse.json({
      total: countResult.total,
      limit,
      offset,
      types_summary: byType,
      attachments: attachmentsWithUrls,
    });
  } catch (error: any) {
    console.error("[MCP Attachments List] Error:", error);
    return NextResponse.json(
      { error: "Failed to list attachments", details: error.message },
      { status: 500 }
    );
  }
}
