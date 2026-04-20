/**
 * Kronus Internal Tools — search + fetch
 *
 * Two generic tools that give Kronus agentic access to the entire Tartarus
 * object registry. Instead of 7+ specific tools, Kronus uses:
 *   - search(query, type?) → discover objects
 *   - fetch(uuid) → get full content
 *
 * All reads go directly to the shared SQLite DB (zero HTTP overhead).
 * The tools are used inside askKronus's generateText loop with stopWhen.
 */

import { tool } from "ai";
import { z } from "zod";

import {
  searchTartarusObjects,
  getObjectByUUID,
  getConversationById,
  getEntryByCommit,
  getProjectSummary,
  getDocumentBySlug,
  type TartarusObject,
} from "../journal/db/database.js";

// ─── Helpers ───────────────────────────────────────────────

function truncate(text: string, maxChars = 4000): string {
  if (text.length <= maxChars) return text;
  return text.substring(0, maxChars) + `\n\n... [truncated, ${text.length - maxChars} chars omitted]`;
}

/**
 * Clean conversation messages JSON into readable plain text.
 * Strips tool invocations, system messages, and excessive formatting.
 */
function cleanConversationMessages(messagesJson: string): string {
  let messages: Array<{ role: string; content: string; toolInvocations?: any[] }>;
  try {
    messages = JSON.parse(messagesJson);
  } catch {
    return "[Could not parse conversation messages]";
  }

  return messages
    .filter((m) => (m.role === "user" || m.role === "assistant") && m.content?.trim())
    .map((m) => `**${m.role === "user" ? "User" : "Assistant"}:** ${m.content}`)
    .join("\n\n");
}

/**
 * Fetch the full content of a Tartarus object by resolving its type
 * to the appropriate source table query.
 */
function fetchFullObject(obj: TartarusObject): string {
  const { type, source_table, source_id } = obj;
  const header = `[${type}] ${obj.title || "Untitled"}\nUUID: ${obj.uuid}\n`;

  switch (type) {
    case "journal_entry": {
      const entry = getEntryByCommit(source_id);
      if (!entry) return header + "Entry not found in source table.";
      return (
        header +
        `Repository: ${entry.repository} | Branch: ${entry.branch} | Date: ${entry.date}\n` +
        `Author: ${entry.author}\n\n` +
        `## Why\n${entry.why}\n\n` +
        `## What Changed\n${entry.what_changed}\n\n` +
        `## Decisions\n${entry.decisions}\n\n` +
        `## Technologies\n${entry.technologies}` +
        (entry.kronus_wisdom ? `\n\n## Kronus Wisdom\n${entry.kronus_wisdom}` : "")
      );
    }

    case "project_summary": {
      const ps = getProjectSummary(source_id);
      if (!ps) return header + "Project summary not found.";
      return (
        header +
        `Repository: ${ps.repository}\n` +
        `Status: ${ps.status || "Unknown"}\n\n` +
        (ps.purpose ? `## Purpose\n${ps.purpose}\n\n` : "") +
        (ps.architecture ? `## Architecture\n${ps.architecture}\n\n` : "") +
        (ps.technologies ? `## Technologies\n${ps.technologies}\n\n` : "") +
        (ps.key_decisions ? `## Key Decisions\n${ps.key_decisions}\n\n` : "") +
        (ps.summary ? `## Summary\n${ps.summary}` : "")
      );
    }

    case "document":
    case "prompt": {
      const doc = getDocumentBySlug(source_id);
      if (!doc) return header + "Document not found.";
      return (
        header +
        `Type: ${doc.type} | Language: ${doc.language || "en"}\n\n` +
        doc.content
      );
    }

    case "conversation": {
      const conv = getConversationById(Number(source_id));
      if (!conv) return header + "Conversation not found.";
      const cleaned = cleanConversationMessages(conv.messages);
      return (
        header +
        `Messages: ${conv.title}\n` +
        `Created: ${conv.created_at} | Updated: ${conv.updated_at}\n` +
        (conv.summary ? `Summary: ${conv.summary}\n` : "") +
        `\n---\n\n${cleaned}`
      );
    }

    // For external integrations, we return what we have in the registry
    case "linear_issue":
    case "linear_project":
    case "slite_note":
    case "notion_page":
    case "media_asset":
    case "skill":
    case "work_experience":
    case "education":
    case "portfolio_project":
    case "attachment": {
      // Return registry metadata — the summary is often sufficient
      return (
        header +
        (obj.summary ? `\n${obj.summary}` : "\nNo detailed content available in registry.") +
        (obj.tags.length > 0 ? `\nTags: ${obj.tags.join(", ")}` : "")
      );
    }

    default:
      return header + "Unknown object type.";
  }
}

// ─── Tool Definitions ──────────────────────────────────────

export function buildKronusTools() {
  return {
    search: tool({
      description:
        "Search Tartarus objects by keyword. Returns matching objects with UUID, type, title, summary snippet, and tags. " +
        "Use this to discover objects before fetching their full content with the fetch tool. " +
        "Available types: journal_entry, project_summary, document, prompt, conversation, " +
        "linear_issue, linear_project, slite_note, notion_page, media_asset, skill, " +
        "work_experience, education, portfolio_project, attachment.",
      inputSchema: z.object({
        query: z.string().describe("Search keyword or phrase"),
        type: z
          .string()
          .optional()
          .describe("Filter by object type (e.g., 'conversation', 'journal_entry', 'document')"),
        limit: z.number().optional().default(10).describe("Max results (default 10)"),
      }),
      execute: async ({ query, type, limit }) => {
        const results = searchTartarusObjects(query, type, limit ?? 10);
        if (results.length === 0) {
          return `No objects found matching "${query}"${type ? ` (type: ${type})` : ""}.`;
        }
        return results
          .map(
            (r) =>
              `- [${r.uuid}] (${r.type}) **${r.title || "Untitled"}**` +
              (r.summary ? `\n  ${r.summary.substring(0, 150)}` : "") +
              (r.tags.length > 0 ? `\n  Tags: ${r.tags.join(", ")}` : ""),
          )
          .join("\n\n");
      },
    }),

    fetch: tool({
      description:
        "Fetch the full content of a Tartarus object by UUID. " +
        "Returns the complete data from its source table (journal entry content, document text, " +
        "cleaned conversation messages, project summary details, etc.). " +
        "Use the search tool first to find UUIDs, or use UUIDs from the knowledge index.",
      inputSchema: z.object({
        uuid: z.string().describe("UUID of the object to fetch"),
      }),
      execute: async ({ uuid }) => {
        const obj = getObjectByUUID(uuid);
        if (!obj) return `Object not found for UUID: ${uuid}`;
        return truncate(fetchFullObject(obj));
      },
    }),
  };
}
