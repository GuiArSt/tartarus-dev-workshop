/**
 * Common types shared across all modules
 */

export interface ToolResponse {
  content: Array<{
    type: 'text';
    text: string;
  }>;
  isError?: boolean;
}

export interface ErrorResponse {
  error: string;
  details?: string;
}

/**
 * Module-specific configuration interfaces
 */
export interface SlackConfig {
  botToken: string;
  teamId: string;
}

export interface LinearConfig {
  apiKey: string;
}

export interface JournalConfig {
  dbPath: string;
  aiProvider: 'anthropic' | 'openai' | 'google';
  aiApiKey: string;
}

export interface UnifiedConfig {
  slack?: SlackConfig;
  linear?: LinearConfig;
  journal?: JournalConfig;
  logLevel?: string;
}
