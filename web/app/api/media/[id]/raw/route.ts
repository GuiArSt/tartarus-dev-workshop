import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/db";

interface MediaRow {
  id: number;
  filename: string;
  mime_type: string;
  data: string; // base64
  file_size: number;
}

/**
 * GET /api/media/[id]/raw
 * Serve the raw image data for a media asset
 * This allows images to be embedded in markdown: ![alt](/api/media/123/raw)
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const mediaId = parseInt(id);

    if (isNaN(mediaId)) {
      return NextResponse.json({ error: "Invalid media ID" }, { status: 400 });
    }

    const db = getDatabase();
    const media = db
      .prepare(
        `
      SELECT id, filename, mime_type, data, file_size
      FROM media_assets
      WHERE id = ?
    `
      )
      .get(mediaId) as MediaRow | undefined;

    if (!media) {
      return NextResponse.json({ error: "Media not found" }, { status: 404 });
    }

    if (!media.data) {
      return NextResponse.json({ error: "Media has no data" }, { status: 404 });
    }

    // Convert base64 to buffer
    const buffer = Buffer.from(media.data, "base64");

    // Return the image with proper headers
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": media.mime_type || "image/png",
        "Content-Length": buffer.length.toString(),
        "Cache-Control": "public, max-age=31536000, immutable",
        "Content-Disposition": `inline; filename="${media.filename}"`,
      },
    });
  } catch (error: any) {
    console.error("Error serving media:", error);
    return NextResponse.json({ error: error.message || "Failed to serve media" }, { status: 500 });
  }
}
