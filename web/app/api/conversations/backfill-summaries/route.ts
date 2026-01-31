import { NextRequest, NextResponse } from "next/server";
import { generateText, Output } from "ai";
import { google } from "@ai-sdk/google";
import { z } from "zod";
import {
  getConversationsWithoutSummary,
  updateConversationSummary,
  updateConversationTitle,
  initConversationsTable,
  type Conversation,
} from "@/lib/db-conversations";
import { withErrorHandler } from "@/lib/api-handler";
import { ValidationError } from "@/lib/errors";

const SummarySchema = z.object({
  title: z
    .string()
    .describe(
      "A short, descriptive title for this conversation (3-6 words max). Should capture the main topic or question."
    ),
  summary: z
    .string()
    .describe(
      "A concise 2-3 sentence summary describing what this conversation was about, what was discussed, and key points covered."
    ),
});

/**
 * Generate a title and summary for a conversation using Gemini Flash 3.
 */
async function generateConversationSummary(
  messages: Array<{ role: string; content: string }>
): Promise<{ title: string; summary: string }> {
  const googleApiKey = process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;

  if (!googleApiKey) {
    throw new ValidationError("Google API key not configured");
  }

  const conversationText = messages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
    .join("\n\n");

  if (!conversationText.trim()) {
    throw new ValidationError("No valid messages to summarize");
  }

  const originalKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  process.env.GOOGLE_GENERATIVE_AI_API_KEY = googleApiKey;

  try {
    const model = google("gemini-3-flash-preview");

    const result = await generateText({
      model,
      output: Output.object({ schema: SummarySchema }),
      system: `You are a conversation summarizer for a developer chat system.
Your task is to create a title and "living summary" for the conversation.

## Title Guidelines
- Short and descriptive: 3-6 words maximum
- Capture the main topic, question, or intent
- Use title case (capitalize important words)
- Examples: "React Hooks Best Practices", "Debugging API Timeout", "Git Merge Conflict Help"

## Summary Guidelines
- Be concise: 2-3 sentences maximum
- Focus on the essence: What was the user asking? What did the assistant explain?
- Include context: Mention technologies, concepts, or specific topics if relevant
- Keep it factual and informative`,
      prompt: `Generate a title and living summary for this conversation:\n\n${conversationText}`,
    });

    const parsed = result.output;
    if (!parsed?.title || !parsed?.summary) {
      throw new ValidationError("Failed to generate title and summary");
    }

    return { title: parsed.title, summary: parsed.summary };
  } finally {
    if (originalKey !== undefined) {
      process.env.GOOGLE_GENERATIVE_AI_API_KEY = originalKey;
    } else {
      delete process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    }
  }
}

/**
 * POST /api/conversations/backfill-summaries
 *
 * Backfill summaries for conversations that don't have one.
 * Called automatically when a new conversation is created.
 * Processes up to 5 conversations at a time to avoid timeout.
 */
export const POST = withErrorHandler(async (request: NextRequest) => {
  initConversationsTable();

  const body = await request.json().catch(() => ({}));
  const limit = Math.min(body?.limit || 50, 100); // Max 100 at a time (increased for batch processing)

  const conversations = getConversationsWithoutSummary(limit);

  if (conversations.length === 0) {
    return NextResponse.json({
      processed: 0,
      message: "No conversations need summaries",
    });
  }

  const results: Array<{ id: number; success: boolean; title?: string; error?: string }> = [];

  for (const conv of conversations) {
    try {
      const { title, summary } = await generateConversationSummary(conv.messages);

      // Update title (without touching updated_at)
      updateConversationTitle(conv.id, title);

      // Update summary (sets summary_updated_at to now)
      updateConversationSummary(conv.id, summary);

      results.push({ id: conv.id, success: true, title });
    } catch (error: any) {
      results.push({
        id: conv.id,
        success: false,
        error: error.message || "Unknown error",
      });
    }
  }

  const successful = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  return NextResponse.json({
    processed: conversations.length,
    successful,
    failed,
    results,
  });
});
