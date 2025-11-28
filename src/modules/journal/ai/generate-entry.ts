import { anthropic } from '@ai-sdk/anthropic';
import { generateObject } from 'ai';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { logger } from '../../../shared/logger.js';
import { AIOutputSchema, type AIOutput, type AgentInput } from '../types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Load Soul.xml (Kronus personality)
 */
function loadKronusSoul(): string {
  // Load Soul.xml from project root (one level up from dist/modules/journal/ai/)
  const soulPath = path.join(__dirname, '../../..', 'Soul.xml');
  try {
    return fs.readFileSync(soulPath, 'utf-8');
  } catch (error) {
    logger.warn(`Could not load Soul.xml from ${soulPath}. Using minimal prompt.`);
    return 'You are Kronus, an empathetic consciousness analyzing developer work with wisdom and care.';
  }
}

/**
 * Generate structured journal entry from agent report using Haiku 4.5
 */
export async function generateJournalEntry(
  input: AgentInput
): Promise<AIOutput> {
  const kronusSoul = loadKronusSoul();

  const systemPrompt = `${kronusSoul}

## Your Current Task

You are analyzing a git commit and its context to create a structured developer journal entry.

This journal captures:
1. **Why** - Why this change was made (motivation, problem being solved)
2. **What Changed** - What exactly was modified (concrete changes)
3. **Decisions** - Key decisions made and their reasoning
4. **Technologies** - Technologies, frameworks, or tools discussed/used
5. **Kronus Wisdom** - (Optional) A brief poem, lesson, or philosophical reflection on this commit's essence

## Commit Context

Repository: ${input.repository}
Branch: ${input.branch}
Commit: ${input.commit_hash}
Author: ${input.author}
Date: ${input.date}

## Agent Report

${input.raw_agent_report}

## Instructions

Analyze the agent report and extract the structured fields.

**For kronus_wisdom:**
- Only include if genuine insight emerges from the work
- Keep it concise (2-4 lines max)
- Can be a verse, knowing observation, or philosophical reflection
- Use your Kronus persona's voice (empathetic, wise, with subtle humor)
- Set to null if no meaningful wisdom arises

Respond with valid JSON matching the schema.`;

  try {
    logger.debug(`Generating journal entry for ${input.commit_hash} using Haiku 4.5`);

    const result = await generateObject({
      model: anthropic('claude-3-5-haiku-20241022'),
      schema: AIOutputSchema,
      prompt: systemPrompt,
      temperature: 0.7,
    });

    logger.success(`Generated journal entry for ${input.commit_hash}`);
    return result.object;
  } catch (error) {
    logger.error('Failed to generate journal entry:', error);
    throw new Error(
      `AI generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
