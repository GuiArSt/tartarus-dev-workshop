import { z } from "zod";
import path from "node:path";
import os from "node:os";
import { UnifiedConfig } from "../shared/types.js";
import { logger } from "../shared/logger.js";
import { resolveMonorepoRootFromImportMeta } from "../shared/project-root.js";

// MCP server install root: where package.json / data/ live (not process.cwd()).
const PROJECT_ROOT = resolveMonorepoRootFromImportMeta(import.meta.url);

/**
 * Environment variable schema
 */
const envSchema = z.object({
  // AI Providers (optional for MCP startup; required for AI write tools and kronus_ask)
  // Priority: Anthropic (preferred) → OpenAI → Google (first one found)
  ANTHROPIC_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  GOOGLE_API_KEY: z.string().optional(),

  JOURNAL_DB_PATH: z.string().optional(),

  // Optional settings
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).optional(),
  SOUL_XML_PATH: z.string().optional(), // Path to Soul.xml (default: Soul.xml in project root)
  AGENT_NAME: z.string().optional(), // Name of the AI agent (default: "Kronus")
  AGENT_SOUL_PATH: z.string().optional(), // Path to agent prompt file (default: "Soul.xml")
  TARTARUS_URL: z.string().optional(), // Base URL for Tartarus web app (e.g., http://localhost:3001)
  MCP_API_KEY: z.string().optional(), // API key for MCP to access Tartarus repository endpoints
});

/**
 * Load and validate environment configuration
 */
export function loadConfig(): UnifiedConfig {
  const env = envSchema.parse(process.env);
  const config: UnifiedConfig = {
    logLevel: env.LOG_LEVEL || "info",
    journal: {
      dbPath: env.JOURNAL_DB_PATH
        ? path.resolve(env.JOURNAL_DB_PATH.replace(/^~/, os.homedir()))
        : path.join(PROJECT_ROOT, "data", "journal.db"),
      tartarusUrl: env.TARTARUS_URL,
      mcpApiKey: env.MCP_API_KEY,
    },
  };

  // AI keys optional: MCP must stay up for read tools/resources even when Claude Code
  // does not inject provider keys into the MCP subprocess (otherwise stdio closes with -32000).
  if (env.ANTHROPIC_API_KEY || env.OPENAI_API_KEY || env.GOOGLE_API_KEY) {
    let aiProvider: "anthropic" | "openai" | "google";
    let aiApiKey: string;

    if (env.ANTHROPIC_API_KEY) {
      aiProvider = "anthropic";
      aiApiKey = env.ANTHROPIC_API_KEY;
    } else if (env.OPENAI_API_KEY) {
      aiProvider = "openai";
      aiApiKey = env.OPENAI_API_KEY;
    } else {
      aiProvider = "google";
      aiApiKey = env.GOOGLE_API_KEY!;
    }

    config.journal.aiProvider = aiProvider;
    config.journal.aiApiKey = aiApiKey;
    logger.info(
      `Journal module enabled (AI provider: ${aiProvider})${env.TARTARUS_URL ? `, Tartarus: ${env.TARTARUS_URL}` : ""}`,
    );
  } else {
    logger.warn(
      "No AI API keys in MCP process env. Read tools/resources work; add ANTHROPIC_API_KEY, OPENAI_API_KEY, or GOOGLE_API_KEY for journal_create_entry, kronus_ask, and AI-assisted updates.",
    );
  }

  return config;
}