import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

/**
 * Perplexity API proxy
 *
 * Perplexity's API is OpenAI-compatible, so we use the same format.
 * Models:
 * - sonar (default search)
 * - sonar-pro (enhanced search)
 * - sonar-reasoning-pro (reasoning with search)
 * - sonar-deep-research (comprehensive research)
 *
 * Security: Requires auth token (same as other internal APIs)
 */

const PERPLEXITY_API_URL = "https://api.perplexity.ai/chat/completions";

// Allowed actions (whitelist)
const ALLOWED_ACTIONS = ["search", "ask", "research", "reason"] as const;
type Action = typeof ALLOWED_ACTIONS[number];

interface PerplexityRequest {
  action: Action;
  query?: string;
  question?: string;
  topic?: string;
  problem?: string;
  strip_thinking?: boolean;
}

// Model mapping for each action
const ACTION_MODELS: Record<Action, string> = {
  search: "sonar",
  ask: "sonar-pro",
  research: "sonar-deep-research",
  reason: "sonar-reasoning-pro",
};

export async function POST(req: NextRequest) {
  // Auth check - same pattern as other internal APIs
  const cookieStore = await cookies();
  const token = cookieStore.get("auth-token")?.value;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "PERPLEXITY_API_KEY not configured" },
      { status: 500 }
    );
  }

  try {
    const body: PerplexityRequest = await req.json();
    const { action, query, question, topic, problem, strip_thinking = true } = body;

    // Validate action is allowed
    if (!action || !ALLOWED_ACTIONS.includes(action)) {
      return NextResponse.json(
        { error: `Invalid action. Must be one of: ${ALLOWED_ACTIONS.join(", ")}` },
        { status: 400 }
      );
    }

    // Get the appropriate model and prompt
    const model = ACTION_MODELS[action];
    const userMessage = query || question || topic || problem || "";

    if (!userMessage) {
      return NextResponse.json(
        { error: "No query/question/topic/problem provided" },
        { status: 400 }
      );
    }

    // Build the request
    const perplexityRequest = {
      model,
      messages: [
        {
          role: "user",
          content: userMessage,
        },
      ],
      // Perplexity-specific options
      return_citations: true,
      return_images: false,
    };

    console.log(`[Perplexity] ${action} with model ${model}: "${userMessage.substring(0, 50)}..."`);

    const response = await fetch(PERPLEXITY_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(perplexityRequest),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Perplexity] API error ${response.status}:`, errorText);
      return NextResponse.json(
        { error: `Perplexity API error: ${response.status}`, details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Extract the response
    let content = data.choices?.[0]?.message?.content || "";
    const citations = data.citations || [];

    // Strip thinking tags if requested (for reasoning models)
    if (strip_thinking && content.includes("<think>")) {
      content = content.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
    }

    // Format response with citations
    let formattedResponse = content;
    if (citations.length > 0) {
      formattedResponse += "\n\n**Sources:**\n";
      citations.forEach((citation: string, i: number) => {
        formattedResponse += `${i + 1}. ${citation}\n`;
      });
    }

    return NextResponse.json({
      result: formattedResponse,
      model,
      citations,
      usage: data.usage,
    });

  } catch (error: any) {
    console.error("[Perplexity] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to call Perplexity API" },
      { status: 500 }
    );
  }
}
