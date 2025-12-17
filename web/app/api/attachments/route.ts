import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const db = getDatabase();
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get("type"); // 'image', 'mermaid', or null for all
    
    let query = `
      SELECT 
        id,
        commit_hash,
        filename,
        mime_type,
        description,
        file_size as size,
        uploaded_at as created_at
      FROM entry_attachments
    `;
    
    if (type === "image") {
      query += " WHERE mime_type LIKE 'image/%'";
    } else if (type === "mermaid") {
      query += " WHERE filename LIKE '%.mmd' OR filename LIKE '%.mermaid'";
    }
    
    query += " ORDER BY uploaded_at DESC";
    
    const attachments = db.prepare(query).all();
    
    return NextResponse.json({
      attachments,
      total: attachments.length,
    });
  } catch (error) {
    console.error("List attachments error:", error);
    return NextResponse.json(
      { error: "Failed to list attachments" },
      { status: 500 }
    );
  }
}
