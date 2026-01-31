import { NextRequest, NextResponse } from "next/server";
import { getDrizzleDb, documents } from "@/lib/db/drizzle";
import { withErrorHandler } from "@/lib/api-handler";

/**
 * GET /api/documents/metadata
 * Get all unique metadata values (tags, types, alsoShownIn) currently used in documents
 */
export const GET = withErrorHandler(async (request: NextRequest) => {
  const db = getDrizzleDb();

  // Fetch all documents with metadata
  const documentRows = await db.select({ metadata: documents.metadata }).from(documents);

  // Extract all unique values
  const tagSet = new Set<string>();
  const typeSet = new Set<string>();
  const alsoShownInSet = new Set<string>();

  for (const doc of documentRows) {
    try {
      const metadata = JSON.parse(doc.metadata || "{}") as Record<string, unknown>;

      // Extract tags
      const tags = metadata.tags;
      if (Array.isArray(tags)) {
        for (const tag of tags) {
          if (typeof tag === "string" && tag.trim().length > 0) {
            tagSet.add(tag.trim());
          }
        }
      }

      // Extract metadata.type (secondary category)
      const type = metadata.type;
      if (typeof type === "string" && type.trim().length > 0) {
        typeSet.add(type.trim());
      }

      // Extract writtenDate (normalize from legacy year field)
      const writtenDate = metadata.writtenDate || metadata.year;
      if (typeof writtenDate === "string" && writtenDate.trim().length > 0) {
        // Note: writtenDate values are not added to a set since they're dates, not categories
      }

      // Extract alsoShownIn
      const alsoShownIn = metadata.alsoShownIn;
      if (Array.isArray(alsoShownIn)) {
        for (const item of alsoShownIn) {
          if (typeof item === "string" && item.trim().length > 0) {
            alsoShownInSet.add(item.trim());
          }
        }
      }
    } catch (error) {
      // Skip invalid JSON metadata
      continue;
    }
  }

  // Convert to sorted arrays
  const tags = Array.from(tagSet).sort();
  const types = Array.from(typeSet).sort();
  const alsoShownIn = Array.from(alsoShownInSet).sort();

  return NextResponse.json({
    tags,
    types, // metadata.type values (secondary category)
    alsoShownIn, // metadata.alsoShownIn values
    counts: {
      tags: tags.length,
      types: types.length,
      alsoShownIn: alsoShownIn.length,
    },
  });
});
