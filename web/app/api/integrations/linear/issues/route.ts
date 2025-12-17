import { NextRequest, NextResponse } from "next/server";
import { listIssues, createIssue } from "@/lib/linear/client";

// GET - List issues (linear_list_issues)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const options = {
      assigneeId: searchParams.get("assigneeId") || undefined,
      stateId: searchParams.get("stateId") || undefined,
      teamId: searchParams.get("teamId") || undefined,
      projectId: searchParams.get("projectId") || undefined,
      query: searchParams.get("query") || undefined,
      limit: searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : 50,
      showAll: searchParams.get("showAll") === "true",
    };

    const result = await listIssues(options);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Linear list issues error:", error);
    return NextResponse.json({ error: error.message || "Failed to list issues" }, { status: 500 });
  }
}

// POST - Create issue (linear_create_issue)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, description, teamId, projectId, priority, assigneeId, parentId } = body;

    if (!title || !teamId) {
      return NextResponse.json({ error: "title and teamId are required" }, { status: 400 });
    }

    const issue = await createIssue({
      title,
      description,
      teamId,
      projectId,
      priority,
      assigneeId,
      parentId,
    });

    return NextResponse.json(issue);
  } catch (error: any) {
    console.error("Linear create issue error:", error);
    return NextResponse.json({ error: error.message || "Failed to create issue" }, { status: 500 });
  }
}
