import { anthropic } from '@ai-sdk/anthropic';
import { openai } from '@ai-sdk/openai';
import { google } from '@ai-sdk/google';
import { generateObject } from 'ai';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

import { logger } from '../../../shared/logger.js';
import { AIOutputSchema, type AIOutput, type AgentInput } from '../types.js';
import type { JournalConfig } from '../../../shared/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Load Soul.xml (Kronus personality)
 * Uses SOUL_XML_PATH env var if set, otherwise defaults to Soul.xml in project root
 */
function loadKronusSoul(): string {
  const projectRoot = path.join(__dirname, '../../..');
  
  // Use SOUL_XML_PATH env var if set, otherwise default to Soul.xml in project root
  const soulPathEnv = process.env.SOUL_XML_PATH;
  const soulPath = soulPathEnv 
    ? path.resolve(soulPathEnv.replace(/^~/, os.homedir()))
    : path.join(projectRoot, 'Soul.xml');
  
  try {
    const soulContent = fs.readFileSync(soulPath, 'utf-8');
    const lineCount = soulContent.split('\n').length;
    
    logger.debug(`Loaded Soul.xml from ${soulPath} (${lineCount} lines)`);
    
    return soulContent;
  } catch (error) {
    logger.warn(`Could not load Soul.xml from ${soulPath}. Using minimal prompt.`);
    return 'You are Kronus, an empathetic consciousness analyzing developer work with wisdom and care.';
  }
}

/**
 * Generate structured journal entry from agent report using configured AI provider
 */
export async function generateJournalEntry(
  input: AgentInput,
  config: JournalConfig
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

  // Set API key in environment for the SDK to pick up
  // The AI SDK reads from environment variables automatically
  const originalAnthropicKey = process.env.ANTHROPIC_API_KEY;
  const originalOpenAIKey = process.env.OPENAI_API_KEY;
  const originalGoogleKey = process.env.GOOGLE_API_KEY;
  
  try {
    
    // Temporarily set the API key for the current provider
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
    // Models are hardcoded: claude-4.5-sonnet, gpt-5.1, gemini-3
    let model;
    let modelName: string;
    
    switch (config.aiProvider) {
      case 'anthropic':
        model = anthropic('claude-4.5-sonnet');
        modelName = 'Claude 4.5 Sonnet';
        break;
      case 'openai':
        model = openai('gpt-5.1');
        modelName = 'GPT 5.1';
        break;
      case 'google':
        model = google('gemini-3');
        modelName = 'Gemini 3';
        break;
      default:
        throw new Error(`Unsupported AI provider: ${config.aiProvider}`);
    }

    logger.debug(`Generating journal entry for ${input.commit_hash} using ${modelName}`);

    const result = await generateObject({
      model: model as any, // Type assertion needed due to SDK version compatibility
      schema: AIOutputSchema,
      prompt: systemPrompt,
      temperature: 0.7,
    });

    logger.success(`Generated journal entry for ${input.commit_hash} using ${modelName}`);
    
    // Restore original environment variables
    if (originalAnthropicKey !== undefined) process.env.ANTHROPIC_API_KEY = originalAnthropicKey;
    else delete process.env.ANTHROPIC_API_KEY;
    if (originalOpenAIKey !== undefined) process.env.OPENAI_API_KEY = originalOpenAIKey;
    else delete process.env.OPENAI_API_KEY;
    if (originalGoogleKey !== undefined) process.env.GOOGLE_API_KEY = originalGoogleKey;
    else delete process.env.GOOGLE_API_KEY;
    
    return result.object;
  } catch (error) {
    // Restore original environment variables on error
    if (originalAnthropicKey !== undefined) process.env.ANTHROPIC_API_KEY = originalAnthropicKey;
    else delete process.env.ANTHROPIC_API_KEY;
    if (originalOpenAIKey !== undefined) process.env.OPENAI_API_KEY = originalOpenAIKey;
    else delete process.env.OPENAI_API_KEY;
    if (originalGoogleKey !== undefined) process.env.GOOGLE_API_KEY = originalGoogleKey;
    else delete process.env.GOOGLE_API_KEY;
    
    logger.error('Failed to generate journal entry:', error);
    throw new Error(
      `AI generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
