import { NextRequest, NextResponse } from "next/server";
import { listNotes, createNote } from "@/lib/slite/client";

// GET - List notes
export async function GET() {
  try {
    const notes = await listNotes();
    return NextResponse.json({ notes });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Create note
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const note = await createNote(body);
    return NextResponse.json(note);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
