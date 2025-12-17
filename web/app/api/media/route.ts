import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/db";

// GET - List media assets
export async function GET(request: NextRequest) {
  try {
    const db = getDatabase();
    const searchParams = request.nextUrl.searchParams;
    const commit_hash = searchParams.get("commit_hash");
    const document_id = searchParams.get("document_id");
    const has_links = searchParams.get("has_links"); // "true" to show only linked, "false" for unlinked
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    let query = `
      SELECT 
        id,
        filename,
        mime_type,
        file_size,
        description,
        prompt,
        model,
        tags,
        destination,
        commit_hash,
        document_id,
        created_at,
        updated_at
      FROM media_assets
      WHERE 1=1
    `;
    const params: any[] = [];

    if (commit_hash) {
      query += " AND commit_hash = ?";
      params.push(commit_hash);
    }

    if (document_id) {
      query += " AND document_id = ?";
      params.push(document_id);
    }

    if (has_links === "true") {
      query += " AND (commit_hash IS NOT NULL OR document_id IS NOT NULL)";
    } else if (has_links === "false") {
      query += " AND commit_hash IS NULL AND document_id IS NULL";
    }

    query += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
    params.push(limit, offset);

    const assets = db.prepare(query).all(...params);

    // Get total count
    let countQuery = "SELECT COUNT(*) as total FROM media_assets WHERE 1=1";
    const countParams: any[] = [];
    if (commit_hash) {
      countQuery += " AND commit_hash = ?";
      countParams.push(commit_hash);
    }
    if (document_id) {
      countQuery += " AND document_id = ?";
      countParams.push(document_id);
    }
    if (has_links === "true") {
      countQuery += " AND (commit_hash IS NOT NULL OR document_id IS NOT NULL)";
    } else if (has_links === "false") {
      countQuery += " AND commit_hash IS NULL AND document_id IS NULL";
    }
    const { total } = db.prepare(countQuery).get(...countParams) as { total: number };

    return NextResponse.json({
      assets,
      total,
      limit,
      offset,
    });
  } catch (error: any) {
    console.error("List media error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to list media" },
      { status: 500 }
    );
  }
}

// POST - Save a new media asset (download from URL and store)
export async function POST(request: NextRequest) {
  try {
    const db = getDatabase();
    const body = await request.json();
    const {
      url,
      filename,
      description,
      prompt,
      model,
      tags = [],
      commit_hash,    // Optional: link to journal entry
      document_id,    // Optional: link to repository document
    } = body;

    if (!url) {
      return NextResponse.json({ error: "url is required" }, { status: 400 });
    }

    if (!filename) {
      return NextResponse.json({ error: "filename is required" }, { status: 400 });
    }

    // Determine destination based on links
    // Media is always the home, but we track primary usage
    const destination = commit_hash ? "journal" : document_id ? "repository" : "media";

    console.log(`[Media] Downloading image from: ${url.substring(0, 50)}...`);

    // Download the image
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.statusText}`);
    }

    const contentType = response.headers.get("content-type") || "image/png";
    const arrayBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    const fileSize = arrayBuffer.byteLength;

    console.log(`[Media] Downloaded ${fileSize} bytes, type: ${contentType}`);

    // Insert into database
    const stmt = db.prepare(`
      INSERT INTO media_assets (
        filename, mime_type, data, file_size, description, 
        prompt, model, tags, destination, commit_hash, document_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      filename,
      contentType,
      base64,
      fileSize,
      description || null,
      prompt || null,
      model || null,
      JSON.stringify(tags),
      destination,
      commit_hash || null,
      document_id || null
    );

    console.log(`[Media] Saved asset with id: ${result.lastInsertRowid}`);

    return NextResponse.json({
      id: result.lastInsertRowid,
      filename,
      mime_type: contentType,
      file_size: fileSize,
      destination,
      commit_hash,
      message: "Image saved successfully",
    });
  } catch (error: any) {
    console.error("[Media] Save error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to save media" },
      { status: 500 }
    );
  }
}
