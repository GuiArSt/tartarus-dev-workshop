/**
 * MCP Apps Module
 *
 * Registers interactive UI apps that render in MCP host clients.
 * Apps are tools that return UI resources (bundled HTML/JS) displayed in iframes.
 *
 * Pattern: Tool + UI Resource
 * - Tool returns _meta.ui.resourceUri pointing to a ui:// resource
 * - Host fetches resource and renders in sandboxed iframe
 * - UI communicates with server via @modelcontextprotocol/ext-apps App class
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  registerAppTool,
  registerAppResource,
  RESOURCE_MIME_TYPE,
} from "@modelcontextprotocol/ext-apps/server";
import { z } from "zod";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { logger } from "../../shared/logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Register all MCP Apps with the server
 */
export function registerAppsModule(
  server: McpServer,
  config: { tartarusUrl?: string },
) {
  logger.info("Registering MCP Apps module...");

  const tartarusUrl = config.tartarusUrl || "http://localhost:3005";

  // ─────────────────────────────────────────────────────────────────────────────
  // Linear Review App
  // ─────────────────────────────────────────────────────────────────────────────

  const linearReviewUri = "ui://linear-review/preview.html";

  // Tool: Preview Linear Sync
  registerAppTool(
    server,
    "linear_preview_sync",
    {
      title: "Preview Linear Sync",
      description:
        "Preview changes from Linear before syncing to local cache. Shows diffs between Linear API and cached data, including new items, updates, deletions, and AI-generated summaries for review. Returns an interactive UI for approving/rejecting changes.",
      inputSchema: {
        includeCompleted: z
          .boolean()
          .optional()
          .default(false)
          .describe("Include completed issues/projects in the preview"),
      },
      _meta: {
        ui: {
          resourceUri: linearReviewUri,
          visibility: ["model", "app"],
        },
      },
    },
    async (args: { includeCompleted?: boolean }) => {
      try {
        const response = await fetch(
          `${tartarusUrl}/api/integrations/linear/sync/preview?includeCompleted=${args.includeCompleted || false}`,
        );

        if (!response.ok) {
          const error = await response.text();
          return {
            content: [
              {
                type: "text" as const,
                text: `Error fetching preview: ${response.status} - ${error}`,
              },
            ],
          };
        }

        const data = await response.json();

        return {
          content: [
            {
              type: "text" as const,
              text: `Linear sync preview: ${data.stats.created} new, ${data.stats.updated} updated, ${data.stats.deleted} deleted items ready for review.`,
            },
          ],
          structuredContent: data,
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Failed to fetch preview: ${error instanceof Error ? error.message : "Unknown error"}`,
            },
          ],
        };
      }
    },
  );

  // Tool: Apply Linear Sync (app-only, called from UI)
  registerAppTool(
    server,
    "linear_apply_sync",
    {
      title: "Apply Linear Sync",
      description:
        "Apply approved changes from sync preview. Only syncs items explicitly approved by the user. Called from the Linear Review UI after user reviews and approves changes.",
      inputSchema: {
        approved: z
          .array(
            z.object({
              id: z.string(),
              type: z.enum(["project", "issue"]),
              action: z.enum(["create", "update", "delete"]),
              summaryOverride: z.string().optional(),
            }),
          )
          .describe("List of approved changes to apply"),
        rejected: z
          .array(z.string())
          .optional()
          .describe("List of IDs to skip/reject"),
      },
      _meta: {
        ui: {
          resourceUri: linearReviewUri,
          visibility: ["app"], // Only callable from UI, not model
        },
      },
    },
    async (args: {
      approved: Array<{
        id: string;
        type: "project" | "issue";
        action: "create" | "update" | "delete";
        summaryOverride?: string;
      }>;
      rejected?: string[];
    }) => {
      try {
        const response = await fetch(
          `${tartarusUrl}/api/integrations/linear/sync/apply`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(args),
          },
        );

        if (!response.ok) {
          const error = await response.text();
          return {
            content: [
              {
                type: "text" as const,
                text: `Error applying sync: ${response.status} - ${error}`,
              },
            ],
          };
        }

        const result = await response.json();

        return {
          content: [
            {
              type: "text" as const,
              text: `Applied ${result.applied} changes successfully. ${result.skipped} skipped, ${result.errors?.length || 0} errors.`,
            },
          ],
          structuredContent: result,
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Failed to apply sync: ${error instanceof Error ? error.message : "Unknown error"}`,
            },
          ],
        };
      }
    },
  );

  // UI Resource: Linear Review
  registerAppResource(
    server,
    "Linear Review UI",
    linearReviewUri,
    {
      description:
        "Interactive UI for reviewing Linear sync changes before applying them",
      mimeType: RESOURCE_MIME_TYPE,
    },
    async () => {
      try {
        // Read the bundled HTML from the dist folder
        const htmlPath = path.join(
          __dirname,
          "linear-review/ui/dist/index.html",
        );
        const html = await fs.readFile(htmlPath, "utf-8");

        return {
          contents: [
            {
              uri: linearReviewUri,
              mimeType: RESOURCE_MIME_TYPE,
              text: html,
            },
          ],
        };
      } catch (error) {
        // Return a fallback error UI if the bundled file doesn't exist
        const errorHtml = `
<!DOCTYPE html>
<html>
<head><title>Linear Review - Build Required</title></head>
<body style="font-family: system-ui; padding: 2rem; background: #1a1a2e; color: #e0e0e0;">
  <h1>Linear Review App Not Built</h1>
  <p>Run <code style="background: #2a2a4e; padding: 0.25rem 0.5rem; border-radius: 4px;">npm run build:apps</code> to build the UI.</p>
  <p style="color: #ff6b6b;">Error: ${error instanceof Error ? error.message : "Unknown error"}</p>
</body>
</html>`;

        return {
          contents: [
            {
              uri: linearReviewUri,
              mimeType: RESOURCE_MIME_TYPE,
              text: errorHtml,
            },
          ],
        };
      }
    },
  );

  logger.success("MCP Apps module registered (2 tools, 1 UI resource)");
}
