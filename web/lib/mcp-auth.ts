import { NextRequest, NextResponse } from "next/server";

/**
 * Validates MCP API key from request headers or query params.
 * Supports:
 * - Authorization: Bearer <key>
 * - X-MCP-API-Key: <key>
 * - ?api_key=<key> (query param)
 */
export function validateMcpApiKey(request: NextRequest): { valid: boolean; error?: string } {
  const expectedKey = process.env.MCP_API_KEY;

  if (!expectedKey) {
    // If no key is configured, allow access (dev mode)
    console.warn("[MCP Auth] No MCP_API_KEY configured, allowing access");
    return { valid: true };
  }

  // Check Authorization header (Bearer token)
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    if (token === expectedKey) {
      return { valid: true };
    }
  }

  // Check X-MCP-API-Key header
  const mcpKeyHeader = request.headers.get("x-mcp-api-key");
  if (mcpKeyHeader === expectedKey) {
    return { valid: true };
  }

  // Check query param (for simple URL access)
  const url = new URL(request.url);
  const queryKey = url.searchParams.get("api_key");
  if (queryKey === expectedKey) {
    return { valid: true };
  }

  return {
    valid: false,
    error:
      "Invalid or missing MCP API key. Provide via Authorization: Bearer <key>, X-MCP-API-Key header, or ?api_key= query param.",
  };
}

/**
 * Returns a 401 response for unauthorized MCP requests
 */
export function mcpUnauthorizedResponse(error: string): NextResponse {
  return NextResponse.json(
    {
      error: "Unauthorized",
      message: error,
      hint: "Set MCP_API_KEY in your environment and provide it in requests",
    },
    {
      status: 401,
      headers: {
        "WWW-Authenticate": 'Bearer realm="MCP Resources"',
      },
    }
  );
}
