import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { SlackClient } from './client.js';
import { toMcpError } from '../../shared/errors.js';
import { logger } from '../../shared/logger.js';

/**
 * Register Slack tools with the MCP server
 */
export function registerSlackTools(server: McpServer, client: SlackClient) {
  logger.info('Registering Slack tools...');

  // Tool 1: List Channels
  server.registerTool(
    'slack_list_channels',
    {
      title: 'List Slack Channels',
      description:
        'List public and private channels in your Slack workspace with pagination support',
      inputSchema: {
        limit: z
          .number()
          .optional()
          .default(100)
          .describe('Maximum number of channels to return (default 100, max 200)'),
        cursor: z
          .string()
          .optional()
          .describe('Pagination cursor for next page of results'),
      },
    },
    async ({ limit, cursor }) => {
      try {
        const response = await client.listChannels(limit, cursor);
        return {
          content: [{ type: 'text' as const, text: JSON.stringify(response, null, 2) }],
        };
      } catch (error) {
        throw toMcpError(error);
      }
    }
  );

  // Tool 2: Post Message
  server.registerTool(
    'slack_post_message',
    {
      title: 'Post Slack Message',
      description: 'Post a new message to a Slack channel',
      inputSchema: {
        channel_id: z
          .string()
          .describe('The ID of the channel to post to (e.g., C01234567)'),
        text: z.string().describe('The message text to post'),
      },
    },
    async ({ channel_id, text }) => {
      try {
        const response = await client.postMessage(channel_id, text);
        return {
          content: [{ type: 'text' as const, text: JSON.stringify(response, null, 2) }],
        };
      } catch (error) {
        throw toMcpError(error);
      }
    }
  );

  // Tool 3: Reply to Thread
  server.registerTool(
    'slack_reply_to_thread',
    {
      title: 'Reply to Slack Thread',
      description: 'Reply to a specific message thread in Slack',
      inputSchema: {
        channel_id: z
          .string()
          .describe('The ID of the channel containing the thread'),
        thread_ts: z
          .string()
          .describe(
            'The timestamp of the parent message (format: 1234567890.123456)'
          ),
        text: z.string().describe('The reply text'),
      },
    },
    async ({ channel_id, thread_ts, text }) => {
      try {
        const response = await client.replyToThread(channel_id, thread_ts, text);
        return {
          content: [{ type: 'text' as const, text: JSON.stringify(response, null, 2) }],
        };
      } catch (error) {
        throw toMcpError(error);
      }
    }
  );

  // Tool 4: Get Channel History
  server.registerTool(
    'slack_get_channel_history',
    {
      title: 'Get Slack Channel History',
      description: 'Get recent messages from a Slack channel',
      inputSchema: {
        channel_id: z.string().describe('The ID of the channel'),
        limit: z
          .number()
          .optional()
          .default(10)
          .describe('Number of messages to retrieve (default 10)'),
      },
    },
    async ({ channel_id, limit }) => {
      try {
        const response = await client.getChannelHistory(channel_id, limit);
        return {
          content: [{ type: 'text' as const, text: JSON.stringify(response, null, 2) }],
        };
      } catch (error) {
        throw toMcpError(error);
      }
    }
  );

  logger.success('Slack tools registered (4 tools)');
}
