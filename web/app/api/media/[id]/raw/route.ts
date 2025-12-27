import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/db";

interface MediaAsset {
  id: number;
  data: string;
  mime_type: string;
  filename: string;
}

/**
 * GET /api/media/[id]/raw
 * Serve the raw image data as a response
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDatabase();

    const asset = db
      .prepare("SELECT id, data, mime_type, filename FROM media_assets WHERE id = ?")
      .get(id) as MediaAsset | undefined;

    if (!asset) {
      return NextResponse.json({ error: "Media asset not found" }, { status: 404 });
    }

    if (!asset.data) {
      return NextResponse.json(
        { error: "No data available for this asset" },
        { status: 404 }
      );
    }

    // Convert base64 to buffer
    const buffer = Buffer.from(asset.data, "base64");

    // Return the image with proper headers
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": asset.mime_type,
        "Content-Length": buffer.length.toString(),
        "Content-Disposition": `inline; filename="${asset.filename}"`,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error: any) {
    console.error("Get raw media error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to get media" },
      { status: 500 }
    );
  }
}
