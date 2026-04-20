import { NextRequest, NextResponse } from "next/server";
import { gmailGetMessage } from "@/lib/google/client";

// GET - Get full message content
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ messageId: string }> }
) {
  try {
    const { messageId } = await params;
    const message = await gmailGetMessage(messageId);
    return NextResponse.json(message);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
