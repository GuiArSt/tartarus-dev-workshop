import { NextRequest, NextResponse } from "next/server";
import { askSlite } from "@/lib/slite/client";

// GET - Ask Slite AI
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const question = searchParams.get("question");

    if (!question) {
      return NextResponse.json({ error: "question parameter required" }, { status: 400 });
    }

    const result = await askSlite(question);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
