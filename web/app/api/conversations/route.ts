import { NextRequest, NextResponse } from "next/server";
import {
  saveConversation,
  listConversations,
  searchConversations,
  initConversationsTable,
} from "@/lib/db-conversations";

// GET - List conversations
export async function GET(request: NextRequest) {
  try {
    initConversationsTable();

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    if (query) {
      const conversations = searchConversations(query, limit);
      return NextResponse.json({ conversations, total: conversations.length });
    }

    const result = listConversations(limit, offset);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error listing conversations:", error);
    return NextResponse.json(
      { error: error.message || "Failed to list conversations" },
      { status: 500 }
    );
  }
}

// POST - Save new conversation
// Note: Also handles sendBeacon requests which send as text/plain
export async function POST(request: NextRequest) {
  try {
    initConversationsTable();

    // Handle both JSON and text/plain (from sendBeacon)
    const contentType = request.headers.get("content-type") || "";
    let body: { title?: string; messages?: any[] };

    if (contentType.includes("text/plain")) {
      const text = await request.text();
      body = JSON.parse(text);
    } else {
      body = await request.json();
    }

    const { title, messages } = body;

    if (!title || !messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "title and messages are required" }, { status: 400 });
    }

    const id = saveConversation(title, messages);

    return NextResponse.json({
      id,
      message: "Conversation saved successfully",
    });
  } catch (error: any) {
    console.error("Error saving conversation:", error);
    return NextResponse.json(
      { error: error.message || "Failed to save conversation" },
      { status: 500 }
    );
  }
}
