import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/db";
import { withErrorHandler } from "@/lib/api-handler";

/**
 * GET /api/documents/tags
 * Get all unique tags currently used in documents
 */
export const GET = withErrorHandler(async (request: NextRequest) => {
  const db = getDatabase();

  // Fetch all documents with metadata
  const documents = db.prepare("SELECT metadata FROM documents").all() as Array<{ metadata: string }>;

  // Extract all unique tags
  const tagSet = new Set<string>();
  
  for (const doc of documents) {
    try {
      const metadata = JSON.parse(doc.metadata || "{}") as Record<string, unknown>;
      const tags = metadata.tags;
      
      if (Array.isArray(tags)) {
        for (const tag of tags) {
          if (typeof tag === "string" && tag.trim().length > 0) {
            tagSet.add(tag.trim());
          }
        }
      }
    } catch (error) {
      // Skip invalid JSON metadata
      continue;
    }
  }

  // Convert to sorted array
  const tags = Array.from(tagSet).sort();

  return NextResponse.json({
    tags,
    count: tags.length,
  });
});
