/**
 * Chat Format Parser/Renderer for Prompts
 *
 * Prompts are stored in the content field using markdown-based chat format:
 *
 * ## System
 * You are a helpful assistant...
 *
 * ## User
 * Review this code: {{code}}
 *
 * ## Assistant
 * I'll analyze the code...
 */

export type PromptRole = "system" | "user" | "assistant";
export type PromptMetadataRole = PromptRole | "chat";

export interface ChatMessage {
  role: PromptRole;
  content: string;
}

/**
 * Role header regex - matches ## System, ## User, ## Assistant (case-insensitive)
 */
const ROLE_HEADER_REGEX = /^##\s+(System|User|Assistant)\s*$/im;

/**
 * Parse markdown content into an array of chat messages
 *
 * @example
 * parsePromptContent("## System\n\nYou are helpful.\n\n## User\n\nHi!")
 * // Returns:
 * // [
 * //   { role: "system", content: "You are helpful." },
 * //   { role: "user", content: "Hi!" }
 * // ]
 */
export function parsePromptContent(content: string): ChatMessage[] {
  if (!content || typeof content !== "string") {
    return [];
  }

  const messages: ChatMessage[] = [];
  const lines = content.split("\n");

  let currentRole: PromptRole | null = null;
  let currentContent: string[] = [];

  for (const line of lines) {
    const headerMatch = line.match(ROLE_HEADER_REGEX);

    if (headerMatch) {
      // Save previous message if exists
      if (currentRole && currentContent.length > 0) {
        messages.push({
          role: currentRole,
          content: currentContent.join("\n").trim(),
        });
      }

      // Start new message
      currentRole = headerMatch[1].toLowerCase() as PromptRole;
      currentContent = [];
    } else if (currentRole) {
      // Add line to current message content
      currentContent.push(line);
    }
  }

  // Save final message
  if (currentRole && currentContent.length > 0) {
    messages.push({
      role: currentRole,
      content: currentContent.join("\n").trim(),
    });
  }

  return messages;
}

/**
 * Render an array of chat messages to markdown format
 *
 * @example
 * renderPromptContent([
 *   { role: "system", content: "You are helpful." },
 *   { role: "user", content: "Hi!" }
 * ])
 * // Returns: "## System\n\nYou are helpful.\n\n## User\n\nHi!"
 */
export function renderPromptContent(messages: ChatMessage[]): string {
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return "";
  }

  return messages
    .map((msg) => {
      const roleHeader = `## ${capitalizeRole(msg.role)}`;
      return `${roleHeader}\n\n${msg.content}`;
    })
    .join("\n\n");
}

/**
 * Detect the metadata role from content structure
 *
 * - "system" - only system section
 * - "user" - only user section (rare)
 * - "assistant" - only assistant section (rare)
 * - "chat" - multiple sections or system + user/assistant
 */
export function detectPromptRole(content: string): PromptMetadataRole {
  const messages = parsePromptContent(content);

  if (messages.length === 0) {
    // No recognized headers - treat as system prompt
    return "system";
  }

  if (messages.length === 1) {
    return messages[0].role;
  }

  // Multiple messages = chat format
  return "chat";
}

/**
 * Check if content is already in chat format (has role headers)
 */
export function isInChatFormat(content: string): boolean {
  if (!content) return false;
  return ROLE_HEADER_REGEX.test(content);
}

/**
 * Normalize prompt content to chat format
 *
 * If content already has role headers, returns as-is.
 * If content is plain text, wraps in ## System header.
 */
export function normalizePromptContent(content: string): string {
  if (!content || typeof content !== "string") {
    return "## System\n\n";
  }

  // Already in chat format
  if (isInChatFormat(content)) {
    return content;
  }

  // Wrap plain text as system message
  return `## System\n\n${content.trim()}`;
}

/**
 * Extract placeholders from content (e.g., {{code}}, {{input}})
 */
export function extractPlaceholders(content: string): string[] {
  if (!content) return [];

  const placeholderRegex = /\{\{(\w+)\}\}/g;
  const placeholders: string[] = [];
  let match;

  while ((match = placeholderRegex.exec(content)) !== null) {
    if (!placeholders.includes(match[1])) {
      placeholders.push(match[1]);
    }
  }

  return placeholders;
}

/**
 * Capitalize role name for display
 */
export function capitalizeRole(role: PromptRole): string {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

/**
 * Get role display color class
 */
export function getRoleColorClass(role: PromptRole): {
  bg: string;
  text: string;
  border: string;
} {
  switch (role) {
    case "system":
      return {
        bg: "bg-blue-500/10",
        text: "text-blue-400",
        border: "border-blue-500/30",
      };
    case "user":
      return {
        bg: "bg-green-500/10",
        text: "text-green-400",
        border: "border-green-500/30",
      };
    case "assistant":
      return {
        bg: "bg-purple-500/10",
        text: "text-purple-400",
        border: "border-purple-500/30",
      };
  }
}

/**
 * Validate prompt content format
 *
 * Returns validation result with errors if any
 */
export function validatePromptContent(content: string): {
  valid: boolean;
  errors: string[];
  messages: ChatMessage[];
} {
  const errors: string[] = [];
  const messages = parsePromptContent(content);

  // Check if content is empty
  if (!content || content.trim().length === 0) {
    errors.push("Content cannot be empty");
    return { valid: false, errors, messages: [] };
  }

  // If in chat format, validate structure
  if (isInChatFormat(content)) {
    if (messages.length === 0) {
      errors.push("No valid message sections found");
    }

    // Check for empty message content
    for (const msg of messages) {
      if (!msg.content || msg.content.trim().length === 0) {
        errors.push(`Empty content in ${msg.role} section`);
      }
    }

    // Warn if no system message (not an error, but unusual)
    const hasSystem = messages.some((m) => m.role === "system");
    if (!hasSystem && messages.length > 0) {
      errors.push("Prompt has no system section (consider adding one)");
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    messages,
  };
}
