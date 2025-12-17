import { NextRequest, NextResponse } from "next/server";
import { updateIssue } from "@/lib/linear/client";

// PATCH - Update issue (linear_update_issue)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ issueId: string }> }
) {
  try {
    const { issueId } = await params;
    const body = await request.json();
    const { title, description, priority, stateId, assigneeId } = body;

    const issue = await updateIssue(issueId, {
      title,
      description,
      priority,
      stateId,
      assigneeId,
    });

    return NextResponse.json(issue);
  } catch (error: any) {
    console.error("Linear update issue error:", error);
    return NextResponse.json({ error: error.message || "Failed to update issue" }, { status: 500 });
  }
}
