import { NextRequest, NextResponse } from "next/server";
import {
  gmailListMessages,
  gmailSendMessage,
  gmailGetThread,
  gmailModifyMessage,
  gmailReplyToMessage,
  gmailCreateDraft,
} from "@/lib/google/client";

// GET - List/search Gmail messages
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query") || undefined;
    const maxResults = searchParams.get("maxResults")
      ? Number(searchParams.get("maxResults"))
      : undefined;
    const labelIds = searchParams.get("labelIds")
      ? searchParams.get("labelIds")!.split(",")
      : undefined;

    const messages = await gmailListMessages({ query, maxResults, labelIds });
    return NextResponse.json({ messages });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Send, reply, modify, draft, or get thread
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const action = body.action || "send";

    switch (action) {
      case "send": {
        const result = await gmailSendMessage(body);
        return NextResponse.json(result);
      }
      case "reply": {
        const result = await gmailReplyToMessage({
          messageId: body.messageId,
          body: body.body,
          replyAll: body.replyAll,
        });
        return NextResponse.json(result);
      }
      case "modify": {
        const result = await gmailModifyMessage({
          messageId: body.messageId,
          addLabelIds: body.addLabelIds,
          removeLabelIds: body.removeLabelIds,
        });
        return NextResponse.json(result);
      }
      case "draft": {
        const result = await gmailCreateDraft(body);
        return NextResponse.json(result);
      }
      case "thread": {
        const result = await gmailGetThread(body.threadId);
        return NextResponse.json(result);
      }
      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
