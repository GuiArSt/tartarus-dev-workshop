/**
 * Kronus MCP Tools Registration
 *
 * Registers the kronus_ask tool with the MCP server
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { logger } from '../../shared/logger.js';
import type { JournalConfig } from '../../shared/types.js';
import { KronusAskInputSchema } from './types.js';
import { askKronus } from './agent.js';

/**
 * Register Kronus tools with the MCP server
 */
export function registerKronusTools(server: McpServer, config: JournalConfig) {
  logger.info('Registering Kronus tools...');

  // Tool: Ask Kronus
  server.registerTool(
    'kronus_ask',
    {
      title: 'Ask Kronus',
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
- **deep**: Can read full content if summaries are insufficient

## Response Format
Returns a concise answer with source citations (commit hashes, issue identifiers, project names).

## Examples
- "What's the current status of Developer Journal Workspace?"
- "Show me recent work on the MCP server"
- "What Linear issues are in progress?"
- "What technologies does the AI Eval project use?"`,
      inputSchema: {
        question: KronusAskInputSchema.shape.question,
        repository: KronusAskInputSchema.shape.repository,
        depth: KronusAskInputSchema.shape.depth,
      },
    },
    async ({ question, repository, depth }) => {
      try {
        const response = await askKronus(
          { question, repository, depth: depth || 'quick' },
          config
        );

        // Format response with sources
        let text = response.answer;

        if (response.sources.length > 0) {
          text += '\n\n---\n**Sources:**\n';
          for (const source of response.sources) {
            text += `- ${source.type}: ${source.identifier}`;
            if (source.title) text += ` (${source.title})`;
            text += '\n';
          }
        }

        text += `\n_Depth: ${response.depth_used}_`;

        return {
          content: [{
            type: 'text' as const,
            text,
          }],
        };
      } catch (error) {
        logger.error('kronus_ask error:', error);
        return {
          content: [{
            type: 'text' as const,
            text: `Kronus encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          }],
          isError: true,
        };
      }
    }
  );

  logger.success('Kronus tools registered (1 tool)');
}
