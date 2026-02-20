import { NextRequest, NextResponse } from "next/server";
import { searchNotes } from "@/lib/slite/client";

// GET - Search notes
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query") || "";
    const parentNoteId = searchParams.get("parentNoteId") || undefined;
    const hitsPerPage = searchParams.get("hitsPerPage")
      ? Number(searchParams.get("hitsPerPage"))
      : undefined;

    const result = await searchNotes(query, { parentNoteId, hitsPerPage });
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
