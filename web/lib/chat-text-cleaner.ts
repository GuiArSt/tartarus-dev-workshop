/**
 * Chat Text Cleaner
 *
 * Strips markdown, tool calls, and formatting from conversation messages
 * to produce clean plain text for summarization and search.
 */

interface ChatMessage {
  role: string;
  content: string;
  toolInvocations?: unknown[];
}

/**
 * Strip markdown formatting from text.
 */
function stripMarkdown(text: string): string {
  return text
    // Remove fenced code blocks
    .replace(/```[\s\S]*?```/g, "[code block]")
    // Remove inline code
    .replace(/`[^`]+`/g, (m) => m.slice(1, -1))
    // Remove headers
    .replace(/^#{1,6}\s+/gm, "")
    // Remove bold/italic
    .replace(/\*{1,3}([^*]+)\*{1,3}/g, "$1")
    .replace(/_{1,3}([^_]+)_{1,3}/g, "$1")
    // Remove links, keep text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    // Remove images
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
    // Remove blockquotes
    .replace(/^>\s+/gm, "")
    // Remove horizontal rules
    .replace(/^---+$/gm, "")
    // Remove XML-like tool tags
    .replace(/<[^>]+>[\s\S]*?<\/[^>]+>/g, "")
    // Collapse multiple newlines
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Clean a conversation's messages into plain text suitable for summarization.
 * Filters to user/assistant only, strips tool invocations and formatting.
 */
export function cleanConversationToPlainText(messages: ChatMessage[]): string {
  return messages
    .filter((m) => (m.role === "user" || m.role === "assistant") && m.content?.trim())
    .filter((m) => !m.toolInvocations?.length || m.content.trim().length > 0)
    .map((m) => {
      const label = m.role === "user" ? "User" : "Assistant";
      const cleaned = stripMarkdown(m.content);
      return `${label}: ${cleaned}`;
    })
    .join("\n\n");
}

/**
 * Estimate token count for text (~4 chars per token).
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}
