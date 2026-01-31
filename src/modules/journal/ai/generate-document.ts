/**
 * Generate Document/Prompt from Agent Report
 *
 * Uses AI SDK 6.0 generateText with Output.object() for structured outputs
 * Model: Claude Haiku 4.5 / GPT 5 / Gemini 3 Flash - based on config
 * Temperature: 0.7 - Creative analysis with schema-enforced structure
 */

import { anthropic } from "@ai-sdk/anthropic";
import { openai } from "@ai-sdk/openai";
import { google } from "@ai-sdk/google";
import { generateText, Output } from "ai";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { z } from "zod";

import { logger } from "../../../shared/logger.js";
import type { JournalConfig } from "../../../shared/types.js";

/**
 * Input schema: What the agent sends for document/prompt creation
 */
export const DocumentAgentInputSchema = z.object({
  raw_agent_report: z
    .string()
    .min(10)
    .describe(
      "Agent's full report describing the document or prompt to create",
    ),
  document_type: z
    .enum(["writing", "prompt", "note"])
    .optional()
    .describe(
      "Document type - if not provided, will be auto-detected from report",
    ),
});

/**
 * AI output schema: What Kronus extracts from the report
 */
export const DocumentAIOutputSchema = z.object({
  title: z.string().min(1).describe("Document title"),
  content: z
    .string()
    .min(1)
    .describe(
      "Document content. For prompts, use chat format: ## System, ## User, ## Assistant headers",
    ),
  type: z
    .enum(["writing", "prompt", "note"])
    .describe("Document type (writing, prompt, or note)"),
  language: z
    .string()
    .optional()
    .default("en")
    .describe("Language code (default: en)"),
  // Basic metadata
  tags: z
    .array(z.string())
    .optional()
    .default([])
    .describe("Array of tags for categorization"),
  metadataType: z
    .string()
    .optional()
    .describe("Secondary category (metadata.type) - free-form string"),
  writtenDate: z
    .string()
    .optional()
    .describe(
      'Date when document was originally written. Format: "2024", "2024-03", or "2024-03-15"',
    ),
  // Prompt-specific metadata (only extracted if type is "prompt" or report indicates prompt)
  purpose: z
    .string()
    .optional()
    .describe("For prompts: What this prompt is for"),
  role: z
    .enum(["system", "user", "assistant", "chat"])
    .optional()
    .describe(
      "For prompts: Message role type (auto-detected from content structure)",
    ),
  inputSchema: z
    .string()
    .optional()
    .describe("For prompts: JSON schema for input validation (as JSON string)"),
  outputSchema: z
    .string()
    .optional()
    .describe("For prompts: JSON schema for expected output (as JSON string)"),
  config: z
    .record(z.string(), z.unknown())
    .optional()
    .describe(
      "For prompts: Configuration metadata (model, temperature, max_tokens, etc.)",
    ),
});

export type DocumentAgentInput = z.infer<typeof DocumentAgentInputSchema>;
export type DocumentAIOutput = z.infer<typeof DocumentAIOutputSchema>;

/**
 * Get project root directory
 */
function getProjectRoot(): string {
  const soulPathEnv = process.env.SOUL_XML_PATH;
  if (soulPathEnv) {
    const resolved = path.resolve(soulPathEnv.replace(/^~/, os.homedir()));
    const dir = path.dirname(resolved);
    if (fs.existsSync(path.join(dir, "package.json"))) {
      return dir;
    }
  }

  const cwd = process.cwd();
  if (
    fs.existsSync(path.join(cwd, "Soul.xml")) ||
    fs.existsSync(path.join(cwd, "package.json"))
  ) {
    return cwd;
  }

  let currentDir = cwd;
  for (let i = 0; i < 10; i++) {
    if (
      fs.existsSync(path.join(currentDir, "Soul.xml")) ||
      fs.existsSync(path.join(currentDir, "package.json"))
    ) {
      return currentDir;
    }
    const parent = path.dirname(currentDir);
    if (parent === currentDir) break;
    currentDir = parent;
  }

  return cwd;
}

/**
 * Load Soul.xml (Kronus personality)
 */
function loadKronusSoul(): string {
  const projectRoot = getProjectRoot();

  const soulPathEnv = process.env.SOUL_XML_PATH;
  const soulPath = soulPathEnv
    ? path.resolve(soulPathEnv.replace(/^~/, os.homedir()))
    : path.join(projectRoot, "Soul.xml");

  try {
    const soulContent = fs.readFileSync(soulPath, "utf-8");
    logger.debug(`Loaded Soul.xml from ${soulPath}`);
    return soulContent;
  } catch (error) {
    logger.warn(
      `Could not load Soul.xml from ${soulPath}. Using minimal prompt.`,
    );
    return "You are Kronus, an empathetic consciousness analyzing developer work with wisdom and care.";
  }
}

/**
 * Generate structured document/prompt from agent report using configured AI provider
 */
export async function generateDocument(
  input: DocumentAgentInput,
  config: JournalConfig,
): Promise<DocumentAIOutput> {
  const kronusSoul = loadKronusSoul();

  const systemPrompt = `${kronusSoul}

## Your Current Task

You are analyzing an agent report to extract structured information for creating a document or prompt in the Tartarus repository.

## Document Types

- **writing**: Creative works, essays, poems, philosophical pieces, fiction, articles
- **prompt**: System prompts, AI contexts, templates, instructions for AI, prompt templates
- **note**: Quick notes, reference material, snippets, documentation

## What to Extract

### Required Fields
- **title**: Document title (extract from report or generate appropriate title)
- **content**: Full document content (the actual text of the writing/prompt/note)
- **type**: Document type - "writing", "prompt", or "note" (auto-detect from report if not specified)

### Optional Basic Metadata
- **tags**: Array of relevant tags (extract from report - look for mentions of categories, topics, themes)
- **metadataType**: Secondary category if mentioned (e.g., "poem", "essay", "system-prompt", "code-review-template")
- **writtenDate**: Date when document was originally written (extract if mentioned, format: "2024", "2024-03", or "2024-03-15")
- **language**: Language code (default: "en" if not specified)

### Prompt-Specific Metadata (extract ONLY if type is "prompt" or report clearly indicates a prompt)
- **purpose**: What this prompt is for (e.g., "System prompt for Kronus oracle mode", "Template for code review")
- **role**: Message role type - "system", "user", "assistant", or "chat" (auto-detected from content structure)
- **inputSchema**: JSON schema for input validation (if mentioned - extract as JSON string)
- **outputSchema**: JSON schema for expected output (if mentioned - extract as JSON string)
- **config**: Configuration metadata (if mentioned - extract model, temperature, max_tokens, etc. as JSON object)

## IMPORTANT: Prompt Content Format

For prompts (type="prompt"), you MUST format the content using markdown headers for each role:

\`\`\`
## System

You are a helpful assistant specialized in...

## User

Here is the task: {{input}}

## Assistant

I will analyze this and provide...
\`\`\`

Format rules:
1. Use \`## System\`, \`## User\`, \`## Assistant\` headers (H2 level with exactly one space after ##)
2. Every prompt MUST have at least a \`## System\` section
3. Use \`{{variable}}\` syntax for placeholders the user will fill in
4. Multiple turns: repeat headers in order for conversation examples

Role mapping:
- Only \`## System\` section → role: "system"
- Multiple sections OR user/assistant without system → role: "chat"
- Only \`## User\` section → role: "user" (rare)
- Only \`## Assistant\` section → role: "assistant" (rare)

## Instructions

Analyze the agent report and extract the structured fields.

1. **Determine document type** - writing, prompt, or note (use specified type if provided, otherwise auto-detect)
2. **Extract title** - use explicit title if mentioned, otherwise generate appropriate title
3. **Extract content** - the full text of the document/prompt (use chat format headers for prompts!)
4. **Extract metadata** - tags, categories, dates mentioned in the report
5. **For prompts**: Format content with ## System/User/Assistant headers, extract purpose, schemas, and config if mentioned
6. **Be thorough** - extract all relevant information from the report

Respond with valid JSON matching the schema.`;

  const userPrompt = `Extract structured information from this agent report:

${input.raw_agent_report}

${input.document_type ? `\nNote: Document type is specified as "${input.document_type}" - use this type.` : "\nNote: Auto-detect the document type from the report."}`;

  // Set API key in environment for the SDK to pick up (same pattern as journal entries)
  const originalAnthropicKey = process.env.ANTHROPIC_API_KEY;
  const originalOpenAIKey = process.env.OPENAI_API_KEY;
  const originalGoogleKey = process.env.GOOGLE_API_KEY;

  try {
    // Temporarily set the API key for the current provider
    switch (config.aiProvider) {
      case "anthropic":
        process.env.ANTHROPIC_API_KEY = config.aiApiKey;
        break;
      case "openai":
        process.env.OPENAI_API_KEY = config.aiApiKey;
        break;
      case "google":
        process.env.GOOGLE_API_KEY = config.aiApiKey;
        break;
    }

    // Select model based on configured provider (same pattern as journal entries)
    let model;
    let modelName: string;

    switch (config.aiProvider) {
      case "anthropic":
        // Claude Haiku 4.5 - fast, capable, cost-effective
        model = anthropic("claude-haiku-4-5");
        modelName = "Claude Haiku 4.5";
        break;
      case "openai":
        // GPT-5 mini - fast, cost-effective, no reasoning needed for document generation
        model = openai("gpt-5-mini");
        modelName = "GPT 5 Mini";
        break;
      case "google":
        model = google("gemini-3-flash");
        modelName = "Gemini 3 Flash";
        break;
      default:
        throw new Error(`Unsupported AI provider: ${config.aiProvider}`);
    }

    logger.debug(`Generating document structure using ${modelName}`);

    // AI SDK 6.0 pattern: generateText with Output.object() (same as journal entries)
    const result = await generateText({
      model,
      output: Output.object({ schema: DocumentAIOutputSchema }),
      system: systemPrompt,
      prompt: userPrompt,
      temperature: 0.7,
    });

    const object = result.output;

    if (!object) {
      throw new Error("AI generation returned no structured output");
    }

    logger.success(`Generated document structure using ${modelName}`);

    // Restore original environment variables
    if (originalAnthropicKey !== undefined)
      process.env.ANTHROPIC_API_KEY = originalAnthropicKey;
    else delete process.env.ANTHROPIC_API_KEY;
    if (originalOpenAIKey !== undefined)
      process.env.OPENAI_API_KEY = originalOpenAIKey;
    else delete process.env.OPENAI_API_KEY;
    if (originalGoogleKey !== undefined)
      process.env.GOOGLE_API_KEY = originalGoogleKey;
    else delete process.env.GOOGLE_API_KEY;

    return object;
  } catch (error) {
    // Restore original environment variables on error
    if (originalAnthropicKey !== undefined)
      process.env.ANTHROPIC_API_KEY = originalAnthropicKey;
    else delete process.env.ANTHROPIC_API_KEY;
    if (originalOpenAIKey !== undefined)
      process.env.OPENAI_API_KEY = originalOpenAIKey;
    else delete process.env.OPENAI_API_KEY;
    if (originalGoogleKey !== undefined)
      process.env.GOOGLE_API_KEY = originalGoogleKey;
    else delete process.env.GOOGLE_API_KEY;

    logger.error("Failed to generate document structure:", error);
    throw new Error(
      `AI generation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}
