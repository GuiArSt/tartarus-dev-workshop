/**
 * Notion Sync - Cache Notion pages locally
 *
 * Fetches pages from Notion API and stores them in the database.
 * Preserves historical data even if pages are archived/deleted in Notion.
 * Generates AI summaries for new pages via /api/ai/summarize endpoint.
 */

import { getDrizzleDb, notionPages } from "@/lib/db/drizzle";
import { eq } from "drizzle-orm";
import {
  listPages,
  getPageContent,
  getUser,
  extractTitle,
  extractIcon,
  extractParent,
} from "./client";
import type { NotionUser } from "./client";

/**
 * Generate a summary for Notion content using the AI summarize endpoint
 */
async function generateSummary(
  content: string,
  title: string
): Promise<string | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3005";

    const response = await fetch(`${baseUrl}/api/ai/summarize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "notion_page", content, title }),
    });

    if (!response.ok) {
      console.warn(
        `Summary generation failed for notion_page: ${response.status}`
      );
      return null;
    }

    const data = await response.json();
    return data.summary || null;
  } catch (error) {
    console.warn("Summary generation error for notion_page:", error);
    return null;
  }
}

export interface NotionSyncResult {
  pages: {
    created: number;
    updated: number;
    deleted: number;
    total: number;
  };
}

/**
 * Sync Notion Pages to local database.
 * Fetches all pages, then fetches content for each.
 */
export async function syncNotionPages(): Promise<NotionSyncResult["pages"]> {
  const db = getDrizzleDb();

  // Fetch all pages from Notion API (metadata only)
  const apiPages = await listPages({ maxPages: 20 });

  // Get existing page IDs and summaries from DB
  const existingPages = await db
    .select({ id: notionPages.id, summary: notionPages.summary })
    .from(notionPages);
  const existingIds = new Set(existingPages.map((p) => p.id));
  const existingSummaries = new Map(
    existingPages.map((p) => [p.id, p.summary])
  );

  // Track API page IDs
  const apiIds = new Set(apiPages.map((p) => p.id));

  // Cache user names to avoid repeated lookups
  const userCache = new Map<string, string | null>();
  async function getUserName(userId: string): Promise<string | null> {
    if (userCache.has(userId)) return userCache.get(userId)!;
    try {
      const user: NotionUser = await getUser(userId);
      userCache.set(userId, user.name);
      return user.name;
    } catch {
      userCache.set(userId, null);
      return null;
    }
  }

  let created = 0;
  let updated = 0;

  for (const page of apiPages) {
    // Fetch full content for each page
    let content: string | null = null;
    try {
      content = await getPageContent(page.id);
      if (!content || content.trim().length === 0) content = null;
    } catch (error) {
      console.warn(`Could not fetch content for page ${page.id}:`, error);
    }

    const parent = extractParent(page);
    const createdByName = await getUserName(page.created_by.id);
    const lastEditedByName = await getUserName(page.last_edited_by.id);

    const pageData = {
      id: page.id,
      title: extractTitle(page),
      content,
      parentId: parent.id,
      parentType: parent.type,
      url: page.url,
      createdBy: page.created_by.id,
      createdByName,
      lastEditedBy: page.last_edited_by.id,
      lastEditedByName,
      icon: extractIcon(page),
      coverUrl: page.cover?.external?.url || null,
      archived: page.archived,
      syncedAt: new Date().toISOString(),
      updatedAt: page.last_edited_time || new Date().toISOString(),
      lastEditedAt: page.last_edited_time || null,
      isDeleted: false,
      deletedAt: null,
    };

    if (existingIds.has(page.id)) {
      // Update existing
      const hasSummary = !!existingSummaries.get(page.id);
      let summary: string | null | undefined = undefined;

      if (!hasSummary && content && content.length > 20) {
        summary = await generateSummary(content, pageData.title);
      }

      await db
        .update(notionPages)
        .set({
          ...pageData,
          ...(summary !== undefined && { summary }),
          createdAt: undefined, // Preserve original
        })
        .where(eq(notionPages.id, page.id));
      updated++;

      try {
        const { registerObject } = require("@/lib/object-registry");
        registerObject({ type: 'notion_page', sourceTable: 'notion_pages', sourceId: page.id, title: pageData.title });
      } catch { /* registry is non-critical */ }
    } else {
      // Create new — generate summary
      let summary: string | null = null;
      if (content && content.length > 20) {
        summary = await generateSummary(content, pageData.title);
      }

      await db.insert(notionPages).values({
        ...pageData,
        summary,
        createdAt: page.created_time || new Date().toISOString(),
      });
      created++;

      try {
        const { registerObject } = require("@/lib/object-registry");
        registerObject({ type: 'notion_page', sourceTable: 'notion_pages', sourceId: page.id, title: pageData.title });
      } catch { /* registry is non-critical */ }
    }
  }

  // Mark deleted pages (in DB but not in API)
  let deleted = 0;
  for (const existingId of existingIds) {
    if (!apiIds.has(existingId)) {
      await db
        .update(notionPages)
        .set({
          isDeleted: true,
          deletedAt: new Date().toISOString(),
          syncedAt: new Date().toISOString(),
        })
        .where(eq(notionPages.id, existingId));
      deleted++;
    }
  }

  const total = await db
    .select()
    .from(notionPages)
    .then((rows) => rows.length);

  return { created, updated, deleted, total };
}

/**
 * Full Notion sync orchestrator
 */
export async function syncNotionData(): Promise<NotionSyncResult> {
  return { pages: await syncNotionPages() };
}
