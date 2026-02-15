/**
 * Kronus MCP Tools Registration
 *
 * Registers the kronus_ask tool and observability resources with the MCP server
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { logger } from "../../shared/logger.js";
import type { JournalConfig } from "../../shared/types.js";
import { KronusAskInputSchema } from "./types.js";
import { askKronus } from "./agent.js";
import {
  getRecentKronusChats,
  getKronusChatsByRepository,
  getRecentTraces,
  getTraceSpans,
  getTraceStats,
} from "../../shared/observability.js";

/**
 * Register Kronus tools with the MCP server
 */
export function registerKronusTools(server: McpServer, config: JournalConfig) {
  logger.info("Registering Kronus tools...");

  // Tool: Ask Kronus
  server.registerTool(
    "kronus_ask",
    {
      title: "Ask Kronus",
      description: `Ask Kronus, the knowledge oracle, about projects, work history, or repository data.

## When to Use
- Get project status without reading full Entry 0
- Quick lookups: "What's the status of the AI Eval project?"
- Cross-reference: "Which Linear issues are related to authentication?"
- Historical context: "What was the last change to the database schema?"

## How It Works
Kronus has access to:
- **Project Summaries (Entry 0)**: Living documentation for each repository
- **Journal Entries**: Recent commit history with AI-generated summaries
- **Linear Issues**: Your assigned tickets and their status
- **Linear Projects**: Project progress and details
- **Documents**: Writings, prompts, and notes from the repository

## Depth Modes
- **quick** (default): Uses summaries index only - fast, low cost
- **deep**: Has tools to read SPECIFIC items in full (entries, issues, projects, documents). Fetches only what's needed - not everything at once. Use for detailed questions.

## Response Format
Returns a concise answer with source citations (commit hashes, issue identifiers, project names).

## Examples
- "What's the current status of Developer Journal Workspace?"
- "Show me recent work on the MCP server"
- "What Linear issues are in progress?"
- "What technologies does the AI Eval project use?"`,
      inputSchema: KronusAskInputSchema,
    },
    async ({ question, repository, depth, serious }) => {
      try {
        const response = await askKronus(
          { question, repository, depth: depth || "quick", serious: serious || false },
          config,
        );

        // Format response with sources
        let text = response.answer;

        if (response.sources.length > 0) {
          text += "\n\n---\n**Sources:**\n";
          for (const source of response.sources) {
            text += `- ${source.type}: ${source.identifier}`;
            if (source.title) text += ` (${source.title})`;
            text += "\n";
          }
        }

        text += `\n_Depth: ${response.depth_used}_`;

        return {
          content: [
            {
              type: "text" as const,
              text,
            },
          ],
        };
      } catch (error) {
        logger.error("kronus_ask error:", error);
        return {
          content: [
            {
              type: "text" as const,
              text: `Kronus encountered an error: ${error instanceof Error ? error.message : "Unknown error"}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  // Tool: Get Kronus chat history
  server.registerTool(
    "kronus_history",
    {
      title: "Kronus Chat History",
      description: `Get recent Kronus conversations. Useful for reviewing past questions and answers.

## Use Cases
- Review previous Kronus conversations
- Find answers to questions asked before
- Check what was discussed about a specific repository`,
      inputSchema: z.object({
        repository: z.string().optional().describe("Filter by repository name"),
        limit: z
          .number()
          .min(1)
          .max(100)
          .default(20)
          .describe("Number of chats to return (default: 20)"),
      }),
    },
    async ({ repository, limit }) => {
      try {
        const chats = repository
          ? getKronusChatsByRepository(repository, limit ?? 20)
          : getRecentKronusChats(limit ?? 20);

        if (chats.length === 0) {
          return {
            content: [
              { type: "text" as const, text: "No Kronus conversations found." },
            ],
          };
        }

        let text = `## Kronus Chat History (${chats.length} conversations)\n\n`;
        for (const chat of chats) {
          text += `### ${chat.created_at}\n`;
          text += `**Q:** ${chat.question}\n`;
          text += `**A:** ${chat.answer.substring(0, 300)}${chat.answer.length > 300 ? "..." : ""}\n`;
          text += `_Depth: ${chat.depth} | Tokens: ${chat.input_tokens ?? 0}/${chat.output_tokens ?? 0}_\n\n`;
        }

        return {
          content: [{ type: "text" as const, text }],
        };
      } catch (error) {
        logger.error("kronus_history error:", error);
        return {
          content: [
            {
              type: "text" as const,
              text: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  // Tool: Get observability stats
  server.registerTool(
    "kronus_stats",
    {
      title: "Kronus & AI Stats",
      description: `Get observability statistics for AI usage: traces, tokens, costs.

## Metrics
- Total traces and Kronus chats
- Token usage (input/output)
- Cost in USD
- Average latency
- Error rate`,
      inputSchema: z.object({
        days: z
          .number()
          .min(1)
          .max(90)
          .default(7)
          .describe("Number of days to include (default: 7)"),
      }),
    },
    async ({ days }) => {
      try {
        const stats = getTraceStats(days ?? 7);

        let text = `## AI Observability Stats (Last ${days ?? 7} Days)\n\n`;
        text += `- **Total Traces:** ${stats.total_traces}\n`;
        text += `- **Kronus Chats:** ${stats.kronus_chats}\n`;
        text += `- **Total Tokens:** ${stats.total_tokens?.toLocaleString() ?? 0}\n`;
        text += `- **Total Cost:** $${stats.total_cost?.toFixed(4) ?? "0.00"}\n`;
        text += `- **Avg Latency:** ${Math.round(stats.avg_latency_ms ?? 0)}ms\n`;
        text += `- **Error Rate:** ${((stats.error_rate ?? 0) * 100).toFixed(1)}%\n`;

        return {
          content: [{ type: "text" as const, text }],
        };
      } catch (error) {
        logger.error("kronus_stats error:", error);
        return {
          content: [
            {
              type: "text" as const,
              text: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  // Register resources for observability
  server.registerResource(
    "observability://chats",
    "Kronus Chat History",
    async () => {
      const chats = getRecentKronusChats(50);
      return {
        contents: [
          {
            uri: "observability://chats",
            mimeType: "application/json",
            text: JSON.stringify(chats, null, 2),
          },
        ],
      };
    },
  );

  server.registerResource(
    "observability://traces",
    "AI Traces (Recent)",
    async () => {
      const traces = getRecentTraces(50);
      return {
        contents: [
          {
            uri: "observability://traces",
            mimeType: "application/json",
            text: JSON.stringify(traces, null, 2),
          },
        ],
      };
    },
  );

  server.registerResource(
    "observability://stats",
    "AI Usage Statistics",
    async () => {
      const stats = getTraceStats(7);
      return {
        contents: [
          {
            uri: "observability://stats",
            mimeType: "application/json",
            text: JSON.stringify(stats, null, 2),
          },
        ],
      };
    },
  );

  logger.success("Kronus tools registered (3 tools, 3 resources)");
}
