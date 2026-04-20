import { NextRequest, NextResponse } from "next/server";
import { searchNotionPages } from "@/lib/notion/client";

// GET - Search Notion pages
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query") || "";
    const pageSize = searchParams.get("pageSize")
      ? Number(searchParams.get("pageSize"))
      : undefined;

    const results = await searchNotionPages(query, { pageSize });
    return NextResponse.json({ results });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
