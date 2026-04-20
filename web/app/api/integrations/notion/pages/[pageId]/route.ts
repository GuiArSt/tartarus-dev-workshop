import { NextRequest, NextResponse } from "next/server";
import {
  getPage,
  getPageContent,
  updatePage,
  appendBlocks,
  extractTitle,
  extractIcon,
} from "@/lib/notion/client";

// GET - Get page with content
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ pageId: string }> }
) {
  try {
    const { pageId } = await params;
    const [page, content] = await Promise.all([
      getPage(pageId),
      getPageContent(pageId),
    ]);
    return NextResponse.json({
      id: page.id,
      title: extractTitle(page),
      content,
      url: page.url,
      icon: extractIcon(page),
      archived: page.archived,
      lastEditedTime: page.last_edited_time,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH - Update page
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ pageId: string }> }
) {
  try {
    const { pageId } = await params;
    const body = await request.json();

    // Update page properties (title, archived)
    const page = await updatePage(pageId, {
      title: body.title,
      archived: body.archived,
    });

    // If markdown content provided, append it as blocks
    if (body.markdown) {
      await appendBlocks(pageId, body.markdown);
    }

    return NextResponse.json({
      id: page.id,
      title: extractTitle(page),
      url: page.url,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
