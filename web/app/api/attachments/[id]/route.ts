import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;
    const includeData = searchParams.get("include_data") === "true";
    
    const db = getDatabase();
    
    const query = includeData
      ? `SELECT id, commit_hash, filename, mime_type, description, file_size as size, uploaded_at as created_at, data
         FROM entry_attachments WHERE id = ?`
      : `SELECT id, commit_hash, filename, mime_type, description, file_size as size, uploaded_at as created_at
         FROM entry_attachments WHERE id = ?`;
    
    const attachment = db.prepare(query).get(id) as {
      id: number;
      commit_hash: string;
      filename: string;
      mime_type: string;
      description: string | null;
      size: number;
      created_at: string;
      data?: Buffer;
    } | undefined;
    
    if (!attachment) {
      return NextResponse.json(
        { error: "Attachment not found" },
        { status: 404 }
      );
    }
    
    // Convert data to base64 if included
    const response: Record<string, unknown> = {
      id: attachment.id,
      commit_hash: attachment.commit_hash,
      filename: attachment.filename,
      mime_type: attachment.mime_type,
      description: attachment.description,
      size: attachment.size,
      created_at: attachment.created_at,
    };
    
    if (includeData && attachment.data) {
      response.data_base64 = Buffer.from(attachment.data).toString("base64");
    }
    
    return NextResponse.json(response);
  } catch (error) {
    console.error("Get attachment error:", error);
    return NextResponse.json(
      { error: "Failed to get attachment" },
      { status: 500 }
    );
  }
}
