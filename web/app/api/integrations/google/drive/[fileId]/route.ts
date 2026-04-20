import { NextRequest, NextResponse } from "next/server";
import { driveGetFile } from "@/lib/google/client";

// GET - Get file details by ID
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    const { fileId } = await params;
    const file = await driveGetFile(fileId);
    return NextResponse.json(file);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
