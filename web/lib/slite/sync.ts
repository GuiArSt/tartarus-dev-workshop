/**
 * Slite Sync - Cache Slite notes locally
 *
 * Fetches notes from Slite REST API and stores them in the database.
 * Preserves historical data even if notes are deleted in Slite.
 * Generates AI summaries for new notes via /api/ai/summarize endpoint.
 */

import { getDrizzleDb, sliteNotes } from "@/lib/db/drizzle";
import { eq } from "drizzle-orm";
import { listNotes, getNote } from "./client";

/**
 * Generate a summary for Slite content using the AI summarize endpoint
 */
async function generateSummary(
  content: string,
  title: string
): Promise<string | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const response = await fetch(`${baseUrl}/api/ai/summarize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "slite_note", content, title }),
    });

    if (!response.ok) {
      console.warn(`Summary generation failed for slite_note: ${response.status}`);
      return null;
    }

    const data = await response.json();
    return data.summary || null;
  } catch (error) {
    console.warn("Summary generation error for slite_note:", error);
    return null;
  }
}

export interface SliteSyncResult {
  notes: {
    created: number;
    updated: number;
    deleted: number;
    total: number;
  };
}

/**
 * Sync Slite Notes to local database.
 * Fetches all notes, then fetches content for each.
 */
export async function syncSliteNotes(): Promise<SliteSyncResult["notes"]> {
  const db = getDrizzleDb();

  // Fetch all notes from Slite API (metadata only, no content)
  const apiNotes = await listNotes({ maxPages: 20 });

  // Get existing note IDs and summaries from DB
  const existingNotes = await db
    .select({ id: sliteNotes.id, summary: sliteNotes.summary })
    .from(sliteNotes);
  const existingIds = new Set(existingNotes.map((n) => n.id));
  const existingSummaries = new Map(existingNotes.map((n) => [n.id, n.summary]));

  // Track API note IDs
  const apiIds = new Set(apiNotes.map((n) => n.id));

  let created = 0;
  let updated = 0;

  for (const note of apiNotes) {
    // Fetch full content for each note
    let content: string | null = null;
    try {
      const fullNote = await getNote(note.id, "md");
      content = fullNote.content || null;
    } catch (error) {
      console.warn(`Could not fetch content for note ${note.id}:`, error);
    }

    const noteData = {
      id: note.id,
      title: note.title,
      content,
      parentNoteId: note.parentNoteId || null,
      url: note.url || null,
      ownerId: note.owner?.userId || note.owner?.groupId || null,
      ownerName: null as string | null, // Not in list response
      reviewState: note.reviewState || null,
      noteType: null as string | null, // Not in list response
      syncedAt: new Date().toISOString(),
      updatedAt: note.updatedAt || new Date().toISOString(),
      lastEditedAt: note.lastEditedAt || null,
      isDeleted: false,
      deletedAt: null,
    };

    if (existingIds.has(note.id)) {
      // Update existing
      const hasSummary = !!existingSummaries.get(note.id);
      let summary: string | null | undefined = undefined;

      if (!hasSummary && content && content.length > 20) {
        summary = await generateSummary(content, note.title);
      }

      await db
        .update(sliteNotes)
        .set({
          ...noteData,
          ...(summary !== undefined && { summary }),
          createdAt: undefined, // Preserve original
        })
        .where(eq(sliteNotes.id, note.id));
      updated++;
    } else {
      // Create new — generate summary
      let summary: string | null = null;
      if (content && content.length > 20) {
        summary = await generateSummary(content, note.title);
      }

      await db.insert(sliteNotes).values({
        ...noteData,
        summary,
        createdAt: new Date().toISOString(),
      });
      created++;
    }
  }

  // Mark deleted notes (in DB but not in API)
  let deleted = 0;
  for (const existingId of existingIds) {
    if (!apiIds.has(existingId)) {
      await db
        .update(sliteNotes)
        .set({
          isDeleted: true,
          deletedAt: new Date().toISOString(),
          syncedAt: new Date().toISOString(),
        })
        .where(eq(sliteNotes.id, existingId));
      deleted++;
    }
  }

  const total = await db
    .select()
    .from(sliteNotes)
    .then((rows) => rows.length);

  return { created, updated, deleted, total };
}

/**
 * Full Slite sync orchestrator
 */
export async function syncSliteData(): Promise<SliteSyncResult> {
  return { notes: await syncSliteNotes() };
}
