/**
 * Common types shared across all modules
 */

/**
 * Normalize repository name to prevent case-sensitive duplicates.
 * "Jobilla" and "jobilla" → "jobilla"
 */
export const normalizeRepository = (name: string): string =>
  name.trim().toLowerCase();

export interface ToolResponse {
  content: Array<{
    type: "text";
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
export interface JournalConfig {
  dbPath: string;
  aiProvider: "anthropic" | "openai" | "google";
  aiApiKey: string;
  tartarusUrl?: string; // Base URL for Tartarus web app (for attachment download URLs)
  mcpApiKey?: string; // API key for MCP to access Tartarus repository endpoints
}

export interface UnifiedConfig {
  journal?: JournalConfig;
  logLevel?: string;
}
