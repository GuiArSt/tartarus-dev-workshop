import { NextRequest, NextResponse } from "next/server";
import { listPages, createPage } from "@/lib/notion/client";

// GET - List pages
export async function GET() {
  try {
    const pages = await listPages();
    return NextResponse.json({ pages });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Create page
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const page = await createPage(body);
    return NextResponse.json(page);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
