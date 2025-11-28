import { SlackAPIError } from '../../shared/errors.js';
import { logger } from '../../shared/logger.js';
import type { SlackAPIResponse } from './types.js';

/**
 * Slack API client wrapper
 */
export class SlackClient {
  private botHeaders: { Authorization: string; 'Content-Type': string };
  private teamId: string;

  constructor(botToken: string, teamId: string) {
    this.botHeaders = {
      Authorization: `Bearer ${botToken}`,
      'Content-Type': 'application/json',
    };
    this.teamId = teamId;
  }

  private async request(url: string, options?: RequestInit): Promise<any> {
    try {
      const response = await fetch(url, {
        ...options,
        headers: this.botHeaders,
      });

      const data = await response.json();

      if (!data.ok) {
        throw new SlackAPIError(
          data.error || 'Unknown Slack API error',
          data
        );
      }

      return data;
    } catch (error) {
      if (error instanceof SlackAPIError) {
        throw error;
      }
      throw new SlackAPIError(
        `Failed to communicate with Slack API: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async listChannels(limit: number = 100, cursor?: string): Promise<SlackAPIResponse> {
    const params = new URLSearchParams({
      types: 'public_channel,private_channel',
      exclude_archived: 'true',
      limit: Math.min(limit, 200).toString(),
      team_id: this.teamId,
    });

    if (cursor) {
      params.append('cursor', cursor);
    }

    logger.debug(`Listing Slack channels (limit: ${limit})`);
    return this.request(`https://slack.com/api/conversations.list?${params}`);
  }

  async postMessage(channelId: string, text: string): Promise<SlackAPIResponse> {
    logger.debug(`Posting message to channel ${channelId}`);
    return this.request('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      body: JSON.stringify({
        channel: channelId,
        text: text,
      }),
    });
  }

  async replyToThread(
    channelId: string,
    threadTs: string,
    text: string
  ): Promise<SlackAPIResponse> {
    logger.debug(`Replying to thread ${threadTs} in channel ${channelId}`);
    return this.request('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      body: JSON.stringify({
        channel: channelId,
        thread_ts: threadTs,
        text: text,
      }),
    });
  }

  async getChannelHistory(
    channelId: string,
    limit: number = 10
  ): Promise<SlackAPIResponse> {
    const params = new URLSearchParams({
      channel: channelId,
      limit: limit.toString(),
    });

    logger.debug(`Getting history for channel ${channelId} (limit: ${limit})`);
    return this.request(`https://slack.com/api/conversations.history?${params}`);
  }
}
