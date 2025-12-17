import { NextRequest, NextResponse } from "next/server";
import { validateMcpApiKey, mcpUnauthorizedResponse } from "@/lib/mcp-auth";
import { getDatabase } from "@/lib/db";

/**
 * MCP Resources API - Raw attachment binary content
 * GET /api/mcp/attachments/:id/raw - Stream raw binary with proper headers
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

  try {
    const db = getDatabase();

    const attachment = db
      .prepare(
        `SELECT id, filename, file_type, file_size, file_data
         FROM journal_attachments WHERE id = ?`
      )
      .get(attachmentId) as {
      id: number;
      filename: string;
      file_type: string;
      file_size: number;
      file_data: Buffer;
    } | undefined;

    if (!attachment) {
      return NextResponse.json({ error: "Attachment not found" }, { status: 404 });
    }

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
    } else if (attachment.filename.endsWith(".md")) {
      contentType = "text/markdown; charset=utf-8";
    } else if (attachment.filename.endsWith(".json")) {
      contentType = "application/json";
    }

    // Convert Buffer to Uint8Array for NextResponse compatibility
    const data = new Uint8Array(attachment.file_data);

    return new NextResponse(data, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": attachment.file_size.toString(),
        "Content-Disposition": `inline; filename="${attachment.filename}"`,
        "Cache-Control": "public, max-age=3600",
        "ETag": `"${attachment.id}-${attachment.file_size}"`,
      },
    });
  } catch (error: any) {
    console.error("[MCP Attachments Raw] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch attachment", details: error.message },
      { status: 500 }
    );
  }
}
