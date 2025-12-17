import { NextRequest, NextResponse } from "next/server";
import { validateMcpApiKey, mcpUnauthorizedResponse } from "@/lib/mcp-auth";
import { getDatabase } from "@/lib/db";

/**
 * MCP Resources API - Direct attachment access
 * Protected by MCP_API_KEY for local dev, Supabase auth in production
 *
 * GET /api/mcp/attachments/:id - Get attachment metadata
 * GET /api/mcp/attachments/:id/raw - Get raw binary content
 */

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Validate MCP API key
  const auth = validateMcpApiKey(request);
  if (!auth.valid) {
    return mcpUnauthorizedResponse(auth.error!);
  }

  const { id } = await params;
  const attachmentId = parseInt(id, 10);

  if (isNaN(attachmentId)) {
    return NextResponse.json({ error: "Invalid attachment ID" }, { status: 400 });
  }

  const url = new URL(request.url);
  const isRaw = url.pathname.endsWith("/raw");

  try {
    const db = getDatabase();

    // Get attachment from database
    const attachment = db
      .prepare(
        `SELECT id, commit_hash, filename, file_type, file_size, description, file_data, created_at
         FROM journal_attachments WHERE id = ?`
      )
      .get(attachmentId) as {
      id: number;
      commit_hash: string;
      filename: string;
      file_type: string;
      file_size: number;
      description: string | null;
      file_data: Buffer;
      created_at: string;
    } | undefined;

    if (!attachment) {
      return NextResponse.json({ error: "Attachment not found" }, { status: 404 });
    }

    // If requesting raw binary content
    if (isRaw) {
      // Determine content type
      let contentType = "application/octet-stream";
      if (attachment.file_type === "mermaid") {
        contentType = "text/plain; charset=utf-8";
      } else if (attachment.filename.endsWith(".png")) {
        contentType = "image/png";
      } else if (attachment.filename.endsWith(".jpg") || attachment.filename.endsWith(".jpeg")) {
        contentType = "image/jpeg";
      } else if (attachment.filename.endsWith(".svg")) {
        contentType = "image/svg+xml";
      } else if (attachment.filename.endsWith(".gif")) {
        contentType = "image/gif";
      } else if (attachment.filename.endsWith(".webp")) {
        contentType = "image/webp";
      } else if (attachment.filename.endsWith(".pdf")) {
        contentType = "application/pdf";
      }

      // Convert Buffer to Uint8Array for NextResponse compatibility
      const data = new Uint8Array(attachment.file_data);

      return new NextResponse(data, {
        status: 200,
        headers: {
          "Content-Type": contentType,
          "Content-Length": attachment.file_size.toString(),
          "Content-Disposition": `inline; filename="${attachment.filename}"`,
          "Cache-Control": "public, max-age=3600", // 1 hour cache
          "ETag": `"${attachment.id}-${attachment.file_size}"`,
        },
      });
    }

    // Return metadata (without binary data)
    return NextResponse.json({
      id: attachment.id,
      commit_hash: attachment.commit_hash,
      filename: attachment.filename,
      file_type: attachment.file_type,
      file_size: attachment.file_size,
      file_size_kb: (attachment.file_size / 1024).toFixed(2),
      description: attachment.description,
      created_at: attachment.created_at,
      // URL to fetch raw content
      raw_url: `/api/mcp/attachments/${attachment.id}/raw`,
    });
  } catch (error: any) {
    console.error("[MCP Attachments] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch attachment", details: error.message },
      { status: 500 }
    );
  }
}
