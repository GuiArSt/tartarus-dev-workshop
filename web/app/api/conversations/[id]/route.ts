import { NextRequest, NextResponse } from "next/server";
import {
  getConversation,
  updateConversation,
  deleteConversation,
  initConversationsTable,
} from "@/lib/db-conversations";

// GET - Get conversation by ID
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    initConversationsTable();
    const { id } = await params;
    const conversationId = parseInt(id);

    if (isNaN(conversationId)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const conversation = getConversation(conversationId);

    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    return NextResponse.json(conversation);
  } catch (error: any) {
    console.error("Error fetching conversation:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch conversation" },
      { status: 500 }
    );
  }
}

// PATCH - Update conversation
// Note: Also handles sendBeacon requests which send as text/plain
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    initConversationsTable();
    const { id } = await params;
    const conversationId = parseInt(id);

    if (isNaN(conversationId)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

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

    if (!title || !messages) {
      return NextResponse.json({ error: "title and messages are required" }, { status: 400 });
    }

    updateConversation(conversationId, title, messages);

    return NextResponse.json({
      message: "Conversation updated successfully",
    });
  } catch (error: any) {
    console.error("Error updating conversation:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update conversation" },
      { status: 500 }
    );
  }
}

// DELETE - Delete conversation
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    initConversationsTable();
    const { id } = await params;
    const conversationId = parseInt(id);

    if (isNaN(conversationId)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const deleted = deleteConversation(conversationId);

    if (!deleted) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    return NextResponse.json({
      message: "Conversation deleted successfully",
    });
  } catch (error: any) {
    console.error("Error deleting conversation:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete conversation" },
      { status: 500 }
    );
  }
}
