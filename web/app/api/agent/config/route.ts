import { NextResponse } from "next/server";
import { getAgentConfig } from "@/lib/ai/kronus";

/**
 * GET /api/agent/config
 * Returns the agent configuration (name and soul path)
 * Used by client components to display the correct agent name
 */
export async function GET() {
  try {
    const config = getAgentConfig();
    return NextResponse.json(config);
  } catch (error) {
    console.error("Failed to get agent config:", error);
    return NextResponse.json({ name: "Kronus", soulPath: "Soul.xml" }, { status: 500 });
  }
}
