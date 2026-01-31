import { NextResponse } from "next/server";
import { getViewer, getDefaultUserId } from "@/lib/linear/client";

export async function GET() {
  try {
    const viewer = await getViewer();
    const configuredUserId = getDefaultUserId();

    return NextResponse.json({
      ...viewer,
      configuredUserId,
    });
  } catch (error: any) {
    console.error("Linear viewer error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch viewer" }, { status: 500 });
  }
}
