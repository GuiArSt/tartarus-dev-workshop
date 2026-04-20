import { streamText, convertToModelMessages, type ModelMessage } from "ai";
import { anthropic, type AnthropicProviderOptions } from "@ai-sdk/anthropic";
import { openai } from "@ai-sdk/openai";
import { google, type GoogleGenerativeAIProviderOptions } from "@ai-sdk/google";
import {
  getKronusSystemPrompt,
  getKronusSystemPromptWithSkills,
  SoulConfig,
  DEFAULT_SOUL_CONFIG,
} from "@/lib/ai/kronus";
import { getDrizzleDb, documents } from "@/lib/db/drizzle";
import { eq } from "drizzle-orm";
import type { KronusSkill, SkillConfig, SkillInfo } from "@/lib/ai/skills";
import { mergeSkillConfigs } from "@/lib/ai/skills";
import { toolSpecs, toolCategories, type ToolName } from "@/lib/ai/tools";

/**
 * Tool configuration - controls which tool categories are enabled
 */
export interface ToolsConfig {
  // Core tools (always conceptually available, but can be toggled)
  journal: boolean; // Journal entries, project summaries
  repository: boolean; // Documents, skills, experience, education
  linear: boolean; // Linear issue tracking
  slite: boolean; // Slite knowledge base
  notion: boolean; // Notion workspace pages
  git: boolean; // Git repository access (GitHub/GitLab)
  media: boolean; // Media library, attachments

  // Heavy/optional tools
  imageGeneration: boolean; // FLUX, Gemini image generation
  webSearch: boolean; // Perplexity web search/research

  // External integrations
  google: boolean; // Google Workspace (Drive, Gmail, Calendar)
}

/** Opus 4.7: steer verbosity and literalism (see Anthropic migration guide). */
const CLAUDE_OPUS_47_SYSTEM_SUFFIX = `
When the user wants a short answer, keep it short. Follow their instructions literally; if something essential is missing, ask one brief clarifying question instead of assuming.`;

/**
 * Opus 4.7 rejects assistant-message prefills. Strip leading assistant turns so the
 * thread always starts from a user/tool context (common bad shape after imports or bugs).
 */
function stripLeadingAssistantMessages(messages: ModelMessage[]): ModelMessage[] {
  const out = [...messages];
  while (out.length > 0 && out[0].role === "assistant") {
    out.shift();
  }
  return out;
}

export const DEFAULT_TOOLS_CONFIG: ToolsConfig = {
  journal: true,
  repository: true,
  linear: true,
  slite: false, // Off by default - requires SLITE_API_KEY
  notion: false, // Off by default - requires NOTION_API_KEY
  git: false, // Off by default - requires GitHub/GitLab token
  media: true,
  imageGeneration: false, // Off by default - heavy
  webSearch: false, // Off by default - requires API key
  google: false, // Off by default - requires gws auth setup
};

/**
 * Available model selections - each has a provider and model ID
 * Models with reasoning support will have thinking enabled automatically
 */
export type ModelSelection =
  | "gemini-3.1-pro" // Google - latest, most capable reasoning
  | "gemini-3.1-flash-lite" // Google - ultra-fast, cheapest, high concurrency
  | "claude-sonnet-4.6" // Anthropic - best value, matches Opus performance
  | "claude-opus-4.6" // Anthropic - Opus 4.6, 1M context
  | "claude-opus-4.7" // Anthropic - Opus 4.7 (API: claude-opus-4-7; adaptive thinking only)
  | "gpt-5.4" // OpenAI - flagship, 1M context, extreme reasoning
  | "gpt-5.3-instant"; // OpenAI - fast everyday chat, low hallucination

/**
 * Model configuration - maps selection to provider and model ID
 */
const MODEL_CONFIG: Record<
  ModelSelection,
  {
    provider: "google" | "anthropic" | "openai";
    modelId: string;
    hasThinking: boolean;
  }
> = {
  "gemini-3.1-pro": {
    provider: "google",
    modelId: "gemini-3.1-pro-preview",
    hasThinking: true,
  },
  "gemini-3.1-flash-lite": {
    provider: "google",
    modelId: "gemini-3.1-flash-lite-preview",
    hasThinking: false,
  },
  "claude-sonnet-4.6": {
    provider: "anthropic",
    modelId: "claude-sonnet-4-6",
    hasThinking: true,
  },
  "claude-opus-4.6": {
    provider: "anthropic",
    modelId: "claude-opus-4-6",
    hasThinking: true,
  },
  "claude-opus-4.7": {
    provider: "anthropic",
    modelId: "claude-opus-4-7",
    hasThinking: true,
  },
  "gpt-5.4": {
    provider: "openai",
    modelId: "gpt-5.4",
    hasThinking: true,
  },
  "gpt-5.3-instant": {
    provider: "openai",
    modelId: "gpt-5.3-instant",
    hasThinking: false,
  },
};

/**
 * Get the AI model based on selected model
 *
 * Models:
 * - gemini-3.1-pro: Gemini 3.1 Pro (1M context, most capable reasoning)
 * - gemini-3.1-flash-lite: Gemini 3.1 Flash-Lite (1M context, ultra-fast, cheapest)
 * - claude-sonnet-4.6: Claude Sonnet 4.6 (1M context, best value)
 * - claude-opus-4.6: Claude Opus 4.6 (1M context)
 * - claude-opus-4.7: Claude Opus 4.7 (1M context; adaptive thinking)
 * - gpt-5.4: GPT-5.4 (1M context, extreme reasoning, agentic)
 * - gpt-5.3-instant: GPT-5.3 Instant (200K context, fast chat)
 */
function getModel(selectedModel?: ModelSelection) {
  const defaultModel: ModelSelection = "gemini-3.1-pro";
  const modelKey = selectedModel || defaultModel;
  const config = MODEL_CONFIG[modelKey];

  if (!config) {
    console.warn(`Unknown model: ${modelKey}, falling back to ${defaultModel}`);
    return getModel(defaultModel);
  }

  // Check if the required API key is available
  switch (config.provider) {
    case "google":
      if (process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GOOGLE_API_KEY) {
        console.log(`Using Google model: ${config.modelId}`);
        return {
          model: google(config.modelId),
          provider: config.provider,
          hasThinking: config.hasThinking,
          modelId: config.modelId,
        };
      }
      console.warn("Google API key not configured");
      break;
    case "anthropic":
      if (process.env.ANTHROPIC_API_KEY) {
        console.log(`Using Anthropic model: ${config.modelId}`);
        return {
          model: anthropic(config.modelId),
          provider: config.provider,
          hasThinking: config.hasThinking,
          modelId: config.modelId,
        };
      }
      console.warn("Anthropic API key not configured");
      break;
    case "openai":
      if (process.env.OPENAI_API_KEY) {
        console.log(`Using OpenAI model: ${config.modelId}`);
        return {
          model: openai(config.modelId),
          provider: config.provider,
          hasThinking: config.hasThinking,
          modelId: config.modelId,
        };
      }
      console.warn("OpenAI API key not configured");
      break;
  }

  // Fallback: try any available provider
  if (process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GOOGLE_API_KEY) {
    const fallback = MODEL_CONFIG["gemini-3.1-flash-lite"];
    console.log(`Falling back to Google: ${fallback.modelId}`);
    return {
      model: google(fallback.modelId),
      provider: "google" as const,
      hasThinking: fallback.hasThinking,
      modelId: fallback.modelId,
    };
  }
  if (process.env.ANTHROPIC_API_KEY) {
    const fallback = MODEL_CONFIG["claude-sonnet-4.6"];
    console.log(`Falling back to Anthropic: ${fallback.modelId}`);
    return {
      model: anthropic(fallback.modelId),
      provider: "anthropic" as const,
      hasThinking: fallback.hasThinking,
      modelId: fallback.modelId,
    };
  }
  if (process.env.OPENAI_API_KEY) {
    const fallback = MODEL_CONFIG["gpt-5.3-instant"];
    console.log(`Falling back to OpenAI: ${fallback.modelId}`);
    return {
      model: openai(fallback.modelId),
      provider: "openai" as const,
      hasThinking: fallback.hasThinking,
      modelId: fallback.modelId,
    };
  }

  throw new Error(
    "No AI API key configured. Set GOOGLE_GENERATIVE_AI_API_KEY, ANTHROPIC_API_KEY, or OPENAI_API_KEY"
  );
}

/**
 * Build the tools object based on toolsConfig
 * Tool definitions imported from tools.ts (single source of truth)
 */
function buildTools(toolsConfig: ToolsConfig): Record<string, any> {
  const enabledTools: Record<string, any> = {};

  const configKeys: (keyof ToolsConfig)[] = [
    "journal", "linear", "slite", "repository", "git", "media", "imageGeneration", "webSearch", "google",
  ];

  for (const key of configKeys) {
    if (toolsConfig[key] && toolCategories[key]) {
      for (const toolName of toolCategories[key]) {
        const spec = toolSpecs[toolName];
        if (spec) {
          enabledTools[toolName] = spec;
        }
      }
    }
  }

  // Skill management tools — always available
  for (const toolName of toolCategories._alwaysOn) {
    const spec = toolSpecs[toolName];
    if (spec) {
      enabledTools[toolName] = spec;
    }
  }

  return enabledTools;
}

export async function POST(req: Request) {
  try {
    const { messages, soulConfig, toolsConfig, modelConfig, activeSkillSlugs } =
      await req.json();

    // Determine system prompt and tools based on skill mode vs legacy mode
    let systemPrompt: string;
    let enabledToolsConfig: ToolsConfig;

    if (activeSkillSlugs && Array.isArray(activeSkillSlugs)) {
      // ===== SKILL MODE =====
      // Load ALL skill documents from DB (for available skills reference)
      const db = getDrizzleDb();
      const allSkillDocs = db
        .select()
        .from(documents)
        .where(eq(documents.type, "prompt"))
        .all()
        .filter((d) => {
          try {
            const meta = JSON.parse(d.metadata || "{}");
            return meta.type === "kronus-skill" && meta.skillConfig;
          } catch {
            return false;
          }
        });

      // Build full available skills list (lightweight, for system prompt reference)
      const allAvailableSkills: SkillInfo[] = allSkillDocs.map((d) => {
        const meta = JSON.parse(d.metadata || "{}");
        const config: SkillConfig = meta.skillConfig || { soul: {}, tools: {} };
        return {
          id: d.id,
          slug: d.slug,
          title: d.title,
          description: d.summary || d.content.substring(0, 120),
          icon: config.icon || "Zap",
          color: config.color || "#00CED1",
          priority: config.priority ?? 50,
          config,
        };
      }).sort((a, b) => a.priority - b.priority);

      // Build active skills (full content, for prompt injection)
      const activeSkills: KronusSkill[] = allSkillDocs
        .filter((d) => activeSkillSlugs.includes(d.slug))
        .map((doc) => {
          const meta = JSON.parse(doc.metadata || "{}");
          const config: SkillConfig = meta.skillConfig || { soul: {}, tools: {} };
          return {
            id: doc.id,
            slug: doc.slug,
            title: doc.title,
            description: doc.summary || doc.content.substring(0, 120),
            content: doc.content,
            config,
            icon: config.icon || "Zap",
            color: config.color || "#00CED1",
            priority: config.priority ?? 50,
          };
        });

      // Build skill-aware system prompt with available skills reference
      systemPrompt = await getKronusSystemPromptWithSkills(activeSkills, allAvailableSkills);

      // Derive tools from skill merge (OR with any explicit toolsConfig from client)
      if (activeSkills.length > 0) {
        const merged = mergeSkillConfigs(activeSkills);
        enabledToolsConfig = {
          journal: merged.tools.journal || (toolsConfig?.journal ?? false),
          repository: merged.tools.repository || (toolsConfig?.repository ?? false),
          linear: merged.tools.linear || (toolsConfig?.linear ?? false),
          slite: merged.tools.slite || (toolsConfig?.slite ?? false),
          notion: merged.tools.notion || (toolsConfig?.notion ?? false),
          git: merged.tools.git || (toolsConfig?.git ?? false),
          media: merged.tools.media || (toolsConfig?.media ?? false),
          imageGeneration:
            merged.tools.imageGeneration || (toolsConfig?.imageGeneration ?? false),
          webSearch: merged.tools.webSearch || (toolsConfig?.webSearch ?? false),
          google: merged.tools.google || (toolsConfig?.google ?? false),
        };
      } else {
        // Lean baseline tools (no skills active)
        enabledToolsConfig = toolsConfig
          ? {
              journal: toolsConfig.journal ?? true,
              repository: toolsConfig.repository ?? true,
              linear: toolsConfig.linear ?? false,
              slite: toolsConfig.slite ?? false,
              notion: toolsConfig.notion ?? false,
              git: toolsConfig.git ?? false,
              media: toolsConfig.media ?? false,
              imageGeneration: toolsConfig.imageGeneration ?? false,
              webSearch: toolsConfig.webSearch ?? false,
              google: toolsConfig.google ?? false,
            }
          : { journal: true, repository: true, linear: false, slite: false, notion: false, git: false, media: false, imageGeneration: false, webSearch: false, google: false };
      }
    } else {
      // ===== LEGACY MODE (backward compatible) =====
      const config: SoulConfig = soulConfig
        ? {
            writings: soulConfig.writings ?? true,
            portfolioProjects: soulConfig.portfolioProjects ?? true,
            skills: soulConfig.skills ?? true,
            workExperience: soulConfig.workExperience ?? true,
            education: soulConfig.education ?? true,
            journalEntries: soulConfig.journalEntries ?? true,
            linearProjects: soulConfig.linearProjects ?? true,
            linearIssues: soulConfig.linearIssues ?? true,
            linearIncludeCompleted: soulConfig.linearIncludeCompleted ?? false,
            sliteNotes: soulConfig.sliteNotes ?? false,
            notionPages: soulConfig.notionPages ?? false,
          }
        : DEFAULT_SOUL_CONFIG;

      systemPrompt = await getKronusSystemPrompt(config);

      enabledToolsConfig = toolsConfig
        ? {
            journal: toolsConfig.journal ?? true,
            repository: toolsConfig.repository ?? true,
            linear: toolsConfig.linear ?? true,
            slite: toolsConfig.slite ?? false,
            notion: toolsConfig.notion ?? false,
            git: toolsConfig.git ?? false,
            media: toolsConfig.media ?? true,
            imageGeneration: toolsConfig.imageGeneration ?? false,
            webSearch: toolsConfig.webSearch ?? false,
            google: toolsConfig.google ?? false,
          }
        : DEFAULT_TOOLS_CONFIG;
    }

    // Get model based on selected model (default: gemini-3-flash)
    const selectedModel = modelConfig?.model as ModelSelection | undefined;
    const {
      model,
      provider: actualProvider,
      hasThinking: modelSupportsThinking,
      modelId: activeModelId,
    } = getModel(selectedModel);
    // Reasoning is enabled if model supports it AND user hasn't disabled it
    const reasoningEnabled = modelConfig?.reasoningEnabled ?? true;
    const hasThinking = modelSupportsThinking && reasoningEnabled;
    const enabledTools = buildTools(enabledToolsConfig);

    // Sanitize messages - remove control characters that can cause issues
    // (e.g., <ctrl46> from Delete key, other non-printable characters)
    // Also filter out messages with empty content (can happen when switching models,
    // e.g., Gemini thinking-only messages don't have content that Claude accepts)
    const sanitizedMessages = messages
      .map((msg: any) => {
        if (typeof msg.content === "string") {
          // Remove control character tags like <ctrl46>, <ctrl0>, etc.
          // and actual control characters (ASCII 0-31 except newline/tab)
          const sanitized = msg.content
            .replace(/<ctrl\d+>/gi, "") // Remove <ctrlNN> tags
            .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ""); // Remove control chars except \n \t \r
          return { ...msg, content: sanitized };
        }
        return msg;
      })
      .filter((msg: any) => {
        // Filter out messages with empty content (except final assistant message which is allowed)
        // This prevents "all messages must have non-empty content" errors when switching providers
        if (typeof msg.content === "string") {
          return msg.content.trim().length > 0;
        }
        // For array content (multipart messages), check if there's meaningful content
        if (Array.isArray(msg.content)) {
          return msg.content.length > 0 && msg.content.some((part: any) => {
            if (part.type === "text") return part.text?.trim().length > 0;
            if (part.type === "tool-call" || part.type === "tool-result") return true;
            if (part.type === "image") return true;
            return false;
          });
        }
        return true;
      });

    // Convert UI messages to model format for proper streaming (async in AI SDK 6)
    let modelMessages = await convertToModelMessages(sanitizedMessages);

    const isOpus47 = activeModelId === "claude-opus-4-7" && actualProvider === "anthropic";
    if (isOpus47) {
      modelMessages = stripLeadingAssistantMessages(modelMessages);
    }

    // Gemini 3 Pro requires thoughtSignature for multi-turn tool calling
    // When signatures aren't preserved in message conversion, inject dummy signature
    // See: https://ai.google.dev/gemini-api/docs/thought-signatures
    const isGemini3 =
      actualProvider === "google" &&
      (process.env.GOOGLE_MODEL?.includes("gemini-3") || !process.env.GOOGLE_MODEL);
    if (isGemini3) {
      modelMessages = modelMessages.map((msg: any) => {
        if (msg.role === "assistant" && msg.content) {
          // Add thoughtSignature to tool-call parts that don't have one
          const updatedContent = msg.content.map((part: any) => {
            if (part.type === "tool-call" && !part.providerMetadata?.google?.thoughtSignature) {
              return {
                ...part,
                providerMetadata: {
                  ...part.providerMetadata,
                  google: {
                    ...part.providerMetadata?.google,
                    thoughtSignature: "skip_thought_signature_validator",
                  },
                },
              };
            }
            return part;
          });
          return { ...msg, content: updatedContent };
        }
        return msg;
      });
    }

    // Build provider options for thinking/reasoning based on provider and model capability
    const providerOptions: Record<string, any> = {};
    if (hasThinking) {
      if (actualProvider === "anthropic") {
        // Opus 4.7: adaptive thinking only (budget_tokens rejected by API)
        if (activeModelId === "claude-opus-4-7") {
          // Opus 4.7: adaptive thinking + effort (SDK maps effort → output_config)
          providerOptions.anthropic = {
            thinking: { type: "adaptive", display: "summarized" },
            effort: "xhigh",
          } satisfies AnthropicProviderOptions;
        } else {
          // Sonnet 4.6 / Opus 4.6 — extended thinking with token budget
          providerOptions.anthropic = {
            thinking: { type: "enabled", budgetTokens: 10000 },
          } satisfies AnthropicProviderOptions;
        }
      } else if (actualProvider === "google") {
        // Enable thinking for Gemini models
        providerOptions.google = {
          thinkingConfig: {
            includeThoughts: true,
          },
        } satisfies GoogleGenerativeAIProviderOptions;
      } else if (actualProvider === "openai") {
        // Enable reasoning for GPT-5.2 with medium effort budget
        providerOptions.openai = {
          reasoningEffort: "medium",
          reasoningSummary: "detailed",
        };
      }
    }

    const effectiveSystemPrompt =
      isOpus47 ? `${systemPrompt}\n${CLAUDE_OPUS_47_SYSTEM_SUFFIX}` : systemPrompt;

    const result = streamText({
      model,
      system: effectiveSystemPrompt,
      messages: modelMessages,
      tools: enabledTools as any,
      providerOptions,
      // Opus 4.7: omit non-default sampling params (handled by SDK for this model).
      // Higher output cap recommended at xhigh effort (Anthropic migration guide).
      ...(isOpus47 ? { maxOutputTokens: 64_000 } : {}),
      onError: (event) => {
        // Log streaming errors with full details
        console.error("[Chat Stream Error]", {
          error: event.error,
          message: event.error instanceof Error ? event.error.message : String(event.error),
          stack: event.error instanceof Error ? event.error.stack : undefined,
        });
      },
      onFinish: (event) => {
        // Log completion with full details for debugging
        const isError = event.finishReason === "error" || event.finishReason === "other";
        const logFn = isError ? console.error : console.log;
        const label = isError ? "[Chat Finish Warning]" : "[Chat Complete]";

        const raw = event.rawFinishReason;
        if (raw === "refusal" || raw === "model_context_window_exceeded") {
          console.warn("[Chat Finish raw]", {
            modelId: activeModelId,
            finishReason: event.finishReason,
            rawFinishReason: raw,
          });
        }

        logFn(label, {
          finishReason: event.finishReason,
          rawFinishReason: event.rawFinishReason,
          usage: event.usage,
          // Log response content for debugging empty responses
          textLength: event.text?.length || 0,
          textPreview: event.text?.slice(0, 200) || "(empty)",
          toolCallsCount:
            event.response?.messages?.filter((m: any) => m.role === "assistant" && m.toolCalls)
              ?.length || 0,
          // Raw provider response for debugging
          rawResponse: (event.response as any)?.rawResponse
            ? JSON.stringify((event.response as any).rawResponse).slice(0, 500)
            : "(no raw response)",
        });

        // Specifically flag zero-output issues
        if (event.usage?.outputTokens === 0) {
          console.error("[Chat Zero Output]", {
            finishReason: event.finishReason,
            inputTokens: event.usage?.inputTokens,
            possibleCauses: [
              "Context too large for model",
              "Safety filter triggered",
              "Model returned empty response",
              "Rate limit or quota issue",
            ],
          });
        }
      },
    });

    return result.toUIMessageStreamResponse({
      onError: (error) => {
        // Forward user-friendly error message to the client
        // (by default AI SDK does NOT forward errors to prevent sensitive data leakage)
        if (!(error instanceof Error)) {
          return "An unexpected error occurred. Please try again.";
        }

        const msg = error.message;

        // AI_RetryError wraps the actual cause — extract the last error message
        if (msg.includes("Last error:")) {
          return msg.split("Last error:")[1].trim();
        }

        // Provider-specific codes
        if (msg.includes("high demand") || msg.includes("UNAVAILABLE") || msg.includes("503")) {
          return "The model is currently overloaded. Please try again in a moment.";
        }
        if (msg.includes("rate limit") || msg.includes("quota") || msg.includes("429")) {
          return "Rate limit reached. Please wait a moment before sending another message.";
        }
        if (msg.includes("401") || msg.includes("unauthorized") || msg.includes("api key")) {
          return "Authentication error — check your API key configuration.";
        }
        if (msg.includes("context") || msg.includes("token") || msg.includes("too long")) {
          return "The conversation is too long for this model. Try compressing the context or starting a new chat.";
        }
        if (
          msg.includes("temperature") ||
          msg.includes("top_p") ||
          msg.includes("top_k") ||
          msg.includes("sampling")
        ) {
          return "This model rejected custom sampling parameters. Remove temperature/top_p/top_k from the request (the chat API already omits them for Opus 4.7).";
        }
        if (msg.toLowerCase().includes("prefill")) {
          return "Assistant prefill is not supported for this model. Continue with a user message instead.";
        }

        return msg;
      },
    });
  } catch (error: any) {
    // Categorize and log errors with context
    const errorType = categorizeError(error);
    console.error(`[Chat Error: ${errorType}]`, {
      message: error.message,
      code: error.code,
      status: error.status,
      stack: error.stack,
    });

    return new Response(
      JSON.stringify({
        error: error.message || "Chat failed",
        type: errorType,
        code: error.code,
      }),
      {
        status: error.status || 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

/**
 * Categorize errors for better debugging
 */
function categorizeError(error: any): string {
  const message = error.message?.toLowerCase() || "";
  const code = error.code?.toLowerCase() || "";

  // API/Auth errors
  if (message.includes("api key") || message.includes("unauthorized") || error.status === 401) {
    return "AUTH_ERROR";
  }

  // Rate limiting
  if (message.includes("rate limit") || message.includes("quota") || error.status === 429) {
    return "RATE_LIMIT";
  }

  // Token/context limits
  if (message.includes("token") || message.includes("context") || message.includes("too long")) {
    return "TOKEN_LIMIT";
  }

  // Network errors
  if (code.includes("econnrefused") || code.includes("etimedout") || message.includes("network")) {
    return "NETWORK_ERROR";
  }

  // Timeout
  if (message.includes("timeout") || code.includes("timeout")) {
    return "TIMEOUT";
  }

  // Model errors
  if (message.includes("model") || message.includes("not found")) {
    return "MODEL_ERROR";
  }

  // Safety/content filters
  if (message.includes("safety") || message.includes("blocked") || message.includes("filter")) {
    return "CONTENT_FILTER";
  }

  // Validation errors
  if (message.includes("invalid") || message.includes("validation")) {
    return "VALIDATION_ERROR";
  }

  return "UNKNOWN_ERROR";
}
