/**
 * Slack module types
 */

export interface SlackChannel {
  id: string;
  name: string;
  is_channel: boolean;
  is_private: boolean;
  is_archived: boolean;
  num_members?: number;
}

export interface SlackMessage {
  type: string;
  ts: string;
  user?: string;
  text: string;
  thread_ts?: string;
}

export interface SlackAPIResponse {
  ok: boolean;
  error?: string;
  channels?: SlackChannel[];
  messages?: SlackMessage[];
  response_metadata?: {
    next_cursor?: string;
  };
}
