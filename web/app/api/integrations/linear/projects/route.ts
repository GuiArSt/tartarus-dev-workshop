import { NextRequest, NextResponse } from "next/server";
import { listProjects } from "@/lib/linear/client";

// GET - List projects (linear_list_projects)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get("teamId") || undefined;
    const showAll = searchParams.get("showAll") === "true";

    const result = await listProjects({ teamId, showAll });
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Linear list projects error:", error);
    return NextResponse.json({ error: error.message || "Failed to list projects" }, { status: 500 });
  }
}
