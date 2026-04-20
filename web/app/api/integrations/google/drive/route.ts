import { NextRequest, NextResponse } from "next/server";
import { driveListFiles, driveSearchFiles, driveCreateFile } from "@/lib/google/client";

// GET - List/search Drive files
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query") || undefined;
    const folderId = searchParams.get("folderId") || undefined;
    const mimeType = searchParams.get("mimeType") || undefined;
    const pageSize = searchParams.get("pageSize")
      ? Number(searchParams.get("pageSize"))
      : undefined;

    const files = await driveListFiles({ query, folderId, mimeType, pageSize });
    return NextResponse.json({ files });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Create a new file
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const file = await driveCreateFile(body);
    return NextResponse.json(file);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
