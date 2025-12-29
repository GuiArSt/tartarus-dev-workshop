import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/db";

/**
 * GET /api/health
 *
 * Health check endpoint for Docker/monitoring.
 * Returns status of app and database connectivity.
 */
export async function GET() {
  try {
    // Test database connection
    const db = getDatabase();
    const result = db.prepare("SELECT 1 as ok").get() as { ok: number };

    if (result?.ok !== 1) {
      return NextResponse.json(
        { status: "unhealthy", error: "Database check failed" },
        { status: 503 }
      );
    }

    return NextResponse.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      database: "connected",
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "unhealthy",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 503 }
    );
  }
}
