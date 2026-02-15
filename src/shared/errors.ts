import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js";

/**
 * Custom error classes for better error handling
 */

export class ConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigurationError";
  }
}

export class JournalError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "JournalError";
  }
}

/**
 * Convert application errors to MCP errors
 */
export function toMcpError(error: any): McpError {
  if (error instanceof ConfigurationError) {
    return new McpError(ErrorCode.InvalidRequest, error.message);
  }

  if (error instanceof JournalError) {
    return new McpError(
      ErrorCode.InternalError,
      `Journal Error: ${error.message}`,
    );
  }

  // Generic error
  return new McpError(
    ErrorCode.InternalError,
    error.message || "An unexpected error occurred",
  );
}
