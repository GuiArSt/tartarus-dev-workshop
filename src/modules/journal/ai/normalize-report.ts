/**
 * Normalize Report - Entry 0 (Living Project Summary)
 *
 * Uses AI SDK 6.0 generateText with Output.object() for structured outputs
 * (generateObject is deprecated in AI SDK 6.0)
 * Model: Claude Haiku 4.5 / GPT 5 / Gemini 3 Flash - based on config
 * Temperature: 0.7 - Creative pattern recognition (schema enforces structure)
 */

import { anthropic } from '@ai-sdk/anthropic';
import { openai } from '@ai-sdk/openai';
import { google } from '@ai-sdk/google';
import { generateText, Output } from 'ai';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { z } from 'zod';

import { logger } from '../../../shared/logger.js';
import type { ProjectSummary, JournalEntry } from '../types.js';
import type { JournalConfig } from '../../../shared/types.js';

/**
 * Zod schema for Entry 0 sections - what the AI generates
 *
 * All fields are REQUIRED non-nullable strings to avoid "too many conditional branches" error.
 * (AI SDK converts nullable to anyOf which has limit of 8 branches)
 *
 * AI returns empty string "" for sections with no meaningful updates.
 * The merge function filters out empty strings.
 */
export const SummaryUpdateSchema = z.object({
  // Core sections
  summary: z.string().describe('High-level project overview. Return empty string if no updates.'),
  purpose: z.string().describe('Why this project exists. Return empty string if no updates.'),
  architecture: z.string().describe('Overall structure and organization. Return empty string if no updates.'),
  key_decisions: z.string().describe('Major architectural decisions. Return empty string if no updates.'),
  technologies: z.string().describe('Core technologies used. Return empty string if no updates.'),
  status: z.string().describe('Current project status. Return empty string if no updates.'),

  // Living Project Summary - Detailed separate fields
  file_structure: z.string().describe('Git-style file tree with brief file summaries. Return empty string if no updates.'),
  tech_stack: z.string().describe('Frameworks, libraries, versions (indicative). Return empty string if no updates.'),
  frontend: z.string().describe('Frontend patterns, components, state management, UI libraries. Return empty string if no updates.'),
  backend: z.string().describe('Backend routes, middleware, server actions, auth patterns. Return empty string if no updates.'),
  database_info: z.string().describe('Database schema, ORM patterns, migrations approach. Return empty string if no updates.'),
  services: z.string().describe('External APIs and how they are integrated. Return empty string if no updates.'),
  custom_tooling: z.string().describe('Project-specific utilities, helpers, wrappers. Return empty string if no updates.'),
  data_flow: z.string().describe('How data moves through the system. Return empty string if no updates.'),
  patterns: z.string().describe('Naming conventions, file organization, code style. Return empty string if no updates.'),
  commands: z.string().describe('Dev commands, deploy scripts, make targets. Return empty string if no updates.'),
  extended_notes: z.string().describe('Gotchas, TODOs, historical context, anything else. Return empty string if no updates.'),
});

export type SummaryUpdate = z.infer<typeof SummaryUpdateSchema>;

/**
 * Get project root directory
 */
function getProjectRoot(): string {
  const soulPathEnv = process.env.SOUL_XML_PATH;
  if (soulPathEnv) {
    const resolved = path.resolve(soulPathEnv.replace(/^~/, os.homedir()));
    const dir = path.dirname(resolved);
    if (fs.existsSync(path.join(dir, 'package.json'))) {
      return dir;
    }
  }

  const cwd = process.cwd();
  if (fs.existsSync(path.join(cwd, 'Soul.xml')) || fs.existsSync(path.join(cwd, 'package.json'))) {
    return cwd;
  }

  let currentDir = cwd;
  for (let i = 0; i < 10; i++) {
    if (fs.existsSync(path.join(currentDir, 'Soul.xml')) ||
        fs.existsSync(path.join(currentDir, 'package.json'))) {
      return currentDir;
    }
    const parent = path.dirname(currentDir);
    if (parent === currentDir) break;
    currentDir = parent;
  }

  return cwd;
}

/**
 * Load Soul.xml (Kronus personality) - Full Soul, no repository writings/portfolio
 */
function loadKronusSoul(): string {
  const projectRoot = getProjectRoot();

  const soulPathEnv = process.env.SOUL_XML_PATH;
  const soulPath = soulPathEnv
    ? path.resolve(soulPathEnv.replace(/^~/, os.homedir()))
    : path.join(projectRoot, 'Soul.xml');

  try {
    const soulContent = fs.readFileSync(soulPath, 'utf-8');
    logger.debug(`Loaded Soul.xml from ${soulPath} for Entry 0 normalization`);
    return soulContent;
  } catch (error) {
    logger.warn(`Could not load Soul.xml from ${soulPath}. Using minimal prompt.`);
    return 'You are Kronus, an empathetic consciousness analyzing developer work with wisdom and care.';
  }
}

/**
 * Format journal entries for context
 */
function formatEntriesForContext(entries: JournalEntry[]): string {
  if (entries.length === 0) {
    return 'No recent journal entries available.';
  }

  return entries.map(e => `
### ${e.commit_hash} (${e.date})
- **Why:** ${e.why}
- **Changed:** ${e.what_changed}
- **Decisions:** ${e.decisions}
- **Tech:** ${e.technologies}
${e.files_changed ? `- **Files:** ${JSON.stringify(e.files_changed)}` : ''}`).join('\n');
}

/**
 * Format existing summary for context
 */
function formatExistingSummary(summary: ProjectSummary | null): string {
  if (!summary) {
    return 'No existing Entry 0 - this is a new project summary.';
  }

  return `
## Existing Entry 0 Sections

**Summary:** ${summary.summary || 'Not set'}
**Purpose:** ${summary.purpose || 'Not set'}
**Architecture:** ${summary.architecture || 'Not set'}
**Key Decisions:** ${summary.key_decisions || 'Not set'}
**Technologies:** ${summary.technologies || 'Not set'}
**Status:** ${summary.status || 'Not set'}

### Living Summary Fields
**File Structure:** ${summary.file_structure || 'Not set'}
**Tech Stack:** ${summary.tech_stack || 'Not set'}
**Frontend:** ${summary.frontend || 'Not set'}
**Backend:** ${summary.backend || 'Not set'}
**Database:** ${summary.database_info || 'Not set'}
**Services:** ${summary.services || 'Not set'}
**Custom Tooling:** ${summary.custom_tooling || 'Not set'}
**Data Flow:** ${summary.data_flow || 'Not set'}
**Patterns:** ${summary.patterns || 'Not set'}
**Commands:** ${summary.commands || 'Not set'}
**Extended Notes:** ${summary.extended_notes || 'Not set'}
`;
}

/**
 * Normalize a chaotic report into structured Entry 0 sections
 *
 * Uses AI SDK 6.0 pattern: generateObject with Zod schema
 * Claude Sonnet 4 has native structured outputs
 */
export async function normalizeReport(
  rawReport: string,
  existingSummary: ProjectSummary | null,
  recentEntries: JournalEntry[],
  config: JournalConfig
): Promise<SummaryUpdate> {
  const kronusSoul = loadKronusSoul();

  const systemPrompt = `${kronusSoul}

## Task: Normalize Project Report into Entry 0 (Living Project Summary)

You are updating the Living Project Summary (Entry 0) based on a chaotic report from an AI agent.
This is NOT a journal entry - this is the persistent project knowledge base that evolves over time.

${formatExistingSummary(existingSummary)}

## Recent Journal Entries (for additional context)
${formatEntriesForContext(recentEntries)}

## Instructions

1. **Extract structured information** from the chaotic report
2. **Preserve existing accurate information** - only update sections with meaningful new info
3. **Merge intelligently** - don't overwrite good existing content with worse new content
4. **Return empty string "" for sections** that have no updates or where existing content is better

### Section Guidelines

- **file_structure**: Convert file lists to git-style tree format (├── └── │). Include brief file summaries when mentioned.
- **tech_stack**: List frameworks, libraries, versions. Mark versions as indicative (things change fast).
- **frontend/backend/database_info**: Document patterns, components, routes, schema approaches.
- **services**: External APIs and how they're integrated.
- **custom_tooling**: Project-specific utilities, helpers, wrappers.
- **data_flow**: How data moves through the system.
- **patterns**: Naming conventions, file organization, code style.
- **commands**: Dev commands, deploy scripts, make targets.
- **extended_notes**: Gotchas, historical context, TODOs, anything that doesn't fit elsewhere.

### File Structure Format Example
\`\`\`
src/
├── modules/
│   ├── journal/
│   │   ├── ai/
│   │   │   └── generate-entry.ts    # AI generation for journal entries
│   │   └── db/
│   │       └── database.ts          # SQLite operations, CRUD
│   └── linear/
│       └── tools.ts                 # Linear API integration
└── shared/
    └── logger.ts                    # Colored console logging
\`\`\`

Be thorough but concise. This is reference documentation for engineers.`;

  // Set API key based on configured provider
  const originalAnthropicKey = process.env.ANTHROPIC_API_KEY;
  const originalOpenAIKey = process.env.OPENAI_API_KEY;
  const originalGoogleKey = process.env.GOOGLE_API_KEY;

  try {
    // Set the API key for the configured provider
    switch (config.aiProvider) {
      case 'anthropic':
        process.env.ANTHROPIC_API_KEY = config.aiApiKey;
        break;
      case 'openai':
        process.env.OPENAI_API_KEY = config.aiApiKey;
        break;
      case 'google':
        process.env.GOOGLE_API_KEY = config.aiApiKey;
        break;
    }

    // Select model based on configured provider
    let model;
    let modelName: string;

    switch (config.aiProvider) {
      case 'anthropic':
        model = anthropic('claude-haiku-4-5');
        modelName = 'Claude Haiku 4.5';
        break;
      case 'openai':
        model = openai('gpt-5');
        modelName = 'GPT 5';
        break;
      case 'google':
        model = google('gemini-3-flash');
        modelName = 'Gemini 3 Flash';
        break;
      default:
        throw new Error(`Unsupported AI provider: ${config.aiProvider}`);
    }

    logger.info(`Normalizing report for Entry 0 using ${modelName}`);
    logger.info(`System prompt length: ${systemPrompt.length} chars`);
    logger.info(`Raw report length: ${rawReport.length} chars`);
    logger.info(`API key present: ${!!config.aiApiKey}`);
    logger.info(`Provider: ${config.aiProvider}`);
    logger.info(`About to call generateText with Output.object()...`);

    // AI SDK 6.0 pattern: generateText with Output.object() (generateObject is deprecated)
    const result = await generateText({
      model,
      output: Output.object({
        schema: SummaryUpdateSchema,
      }),
      prompt: `${systemPrompt}

## Chaotic Report to Normalize

${rawReport}

Extract the structured Entry 0 sections from this report. Return empty string "" for any section that has no meaningful updates.`,
      temperature: 0.7,
    });

    const object = result.output;

    if (!object) {
      logger.error(`No structured output generated. Raw text: ${result.text?.substring(0, 500)}`);
      throw new Error('No structured output generated from AI model');
    }

    logger.debug(`generateText completed, output present: ${!!object}`);
    logger.success(`Normalized report into Entry 0 structure`);

    // Restore original API keys
    if (originalAnthropicKey !== undefined) process.env.ANTHROPIC_API_KEY = originalAnthropicKey;
    else delete process.env.ANTHROPIC_API_KEY;
    if (originalOpenAIKey !== undefined) process.env.OPENAI_API_KEY = originalOpenAIKey;
    else delete process.env.OPENAI_API_KEY;
    if (originalGoogleKey !== undefined) process.env.GOOGLE_API_KEY = originalGoogleKey;
    else delete process.env.GOOGLE_API_KEY;

    return object;
  } catch (error: any) {
    // Restore original API keys on error
    if (originalAnthropicKey !== undefined) process.env.ANTHROPIC_API_KEY = originalAnthropicKey;
    else delete process.env.ANTHROPIC_API_KEY;
    if (originalOpenAIKey !== undefined) process.env.OPENAI_API_KEY = originalOpenAIKey;
    else delete process.env.OPENAI_API_KEY;
    if (originalGoogleKey !== undefined) process.env.GOOGLE_API_KEY = originalGoogleKey;
    else delete process.env.GOOGLE_API_KEY;

    // Log full error details for debugging
    logger.error('Failed to normalize report:', error);

    throw new Error(
      `Entry 0 normalization failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Merge normalized updates with existing summary
 * Only updates fields that have non-empty string values (AI returns "" for no updates)
 */
export function mergeSummaryUpdates(
  existing: ProjectSummary | null,
  updates: SummaryUpdate
): Partial<ProjectSummary> {
  const merged: Partial<ProjectSummary> = {};

  // Helper to check if a string has meaningful content (non-empty after trim)
  const hasContent = (s: string | undefined | null): boolean =>
    s !== undefined && s !== null && s.trim().length > 0;

  // Core fields - only update if non-empty
  if (hasContent(updates.summary)) merged.summary = updates.summary;
  if (hasContent(updates.purpose)) merged.purpose = updates.purpose;
  if (hasContent(updates.architecture)) merged.architecture = updates.architecture;
  if (hasContent(updates.key_decisions)) merged.key_decisions = updates.key_decisions;
  if (hasContent(updates.technologies)) merged.technologies = updates.technologies;
  if (hasContent(updates.status)) merged.status = updates.status;

  // Living Project Summary fields - each maps directly to database column
  if (hasContent(updates.file_structure)) merged.file_structure = updates.file_structure;
  if (hasContent(updates.tech_stack)) merged.tech_stack = updates.tech_stack;
  if (hasContent(updates.frontend)) merged.frontend = updates.frontend;
  if (hasContent(updates.backend)) merged.backend = updates.backend;
  if (hasContent(updates.database_info)) merged.database_info = updates.database_info;
  if (hasContent(updates.services)) merged.services = updates.services;
  if (hasContent(updates.custom_tooling)) merged.custom_tooling = updates.custom_tooling;
  if (hasContent(updates.data_flow)) merged.data_flow = updates.data_flow;
  if (hasContent(updates.patterns)) merged.patterns = updates.patterns;
  if (hasContent(updates.commands)) merged.commands = updates.commands;
  if (hasContent(updates.extended_notes)) merged.extended_notes = updates.extended_notes;

  return merged;
}
