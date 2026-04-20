/**
 * Daimon Polish — unified correct + translate endpoint
 *
 * Model: Gemini 3.1 Flash Lite (fast, cheap, good enough for grammar/translation)
 * Uses AI SDK 6.0 generateText with Output.object() for structured outputs.
 */

import { NextRequest, NextResponse } from "next/server";
import { google } from "@ai-sdk/google";
import { generateText, Output } from "ai";
import { getDatabase } from "@/lib/db";
import { withErrorHandler } from "@/lib/api-handler";
import { ValidationError } from "@/lib/errors";
import {
  DaimonResponseSchema,
  getDaimonSystemPrompt,
  buildDaimonUserPrompt,
  type DaimonMemory,
  getDefaultDaimonMemory,
} from "@/lib/ai/daimon";

/**
 * Load combined memory from both Atropos and Hermes tables.
 * Falls back to defaults if tables don't exist yet.
 */
function loadDaimonMemory(db: ReturnType<typeof getDatabase>, userId: string): DaimonMemory {
  const memory = getDefaultDaimonMemory();

  try {
    // Atropos dictionary → protected terms
    const atroposDict = db
      .prepare("SELECT term FROM atropos_dictionary WHERE user_id = ?")
      .all(userId) as Array<{ term: string }>;
    for (const row of atroposDict) {
      if (!memory.protectedTerms.includes(row.term)) {
        memory.protectedTerms.push(row.term);
      }
    }
  } catch { /* table may not exist */ }

  try {
    // Hermes dictionary → protected terms
    const hermesDict = db
      .prepare("SELECT term FROM hermes_dictionary WHERE user_id = ?")
      .all(userId) as Array<{ term: string }>;
    for (const row of hermesDict) {
      if (!memory.protectedTerms.includes(row.term)) {
        memory.protectedTerms.push(row.term);
      }
    }
  } catch { /* table may not exist */ }

  try {
    // Atropos memories → correction patterns
    const atroposMemories = db
      .prepare("SELECT content FROM atropos_memories WHERE user_id = ? ORDER BY frequency DESC LIMIT 20")
      .all(userId) as Array<{ content: string }>;
    memory.correctionPatterns = atroposMemories.map((m) => m.content);
  } catch { /* table may not exist */ }

  try {
    // Hermes memories → translation patterns
    const hermesMemories = db
      .prepare("SELECT content FROM hermes_memories WHERE user_id = ? ORDER BY frequency DESC LIMIT 20")
      .all(userId) as Array<{ content: string }>;
    memory.translationPatterns = hermesMemories.map((m) => m.content);
  } catch { /* table may not exist */ }

  try {
    // Atropos stats
    const aStats = db
      .prepare("SELECT total_checks, total_corrections FROM atropos_stats WHERE user_id = ?")
      .get(userId) as { total_checks: number; total_corrections: number } | undefined;
    if (aStats) {
      memory.totalChecks = aStats.total_checks;
      memory.totalCorrections = aStats.total_corrections;
    }
  } catch { /* table may not exist */ }

  try {
    // Hermes stats
    const hStats = db
      .prepare("SELECT total_translations FROM hermes_stats WHERE user_id = ?")
      .get(userId) as { total_translations: number } | undefined;
    if (hStats) {
      memory.totalTranslations = hStats.total_translations;
    }
  } catch { /* table may not exist */ }

  return memory;
}

/**
 * Save correction to Atropos history (keeps existing tables working)
 */
function saveToHistory(
  db: ReturnType<typeof getDatabase>,
  userId: string,
  originalText: string,
  polishedText: string,
  hadChanges: boolean,
  sourceContext?: string
) {
  try {
    db.prepare(
      `INSERT INTO atropos_corrections (user_id, original_text, corrected_text, had_changes, intent_questions, source_context)
       VALUES (?, ?, ?, ?, '[]', ?)`
    ).run(userId, originalText, polishedText, hadChanges ? 1 : 0, sourceContext || null);
  } catch { /* table may not exist */ }

  try {
    const charsDiff = Math.abs(polishedText.length - originalText.length);
    db.prepare(
      `INSERT INTO atropos_stats (user_id, total_checks, total_corrections, total_characters_corrected)
       VALUES (?, 1, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET
         total_checks = total_checks + 1,
         total_corrections = total_corrections + ?,
         total_characters_corrected = total_characters_corrected + ?,
         updated_at = CURRENT_TIMESTAMP`
    ).run(userId, hadChanges ? 1 : 0, charsDiff, hadChanges ? 1 : 0, charsDiff);
  } catch { /* table may not exist */ }
}

/**
 * POST /api/daimon/polish
 *
 * Body: { text: string, targetLanguage?: string, sourceContext?: string }
 */
export const POST = withErrorHandler(async (request: NextRequest) => {
  const { text, targetLanguage, sourceContext } = await request.json();

  if (!text || typeof text !== "string") {
    throw new ValidationError("Text is required");
  }
  if (text.length > 50000) {
    throw new ValidationError("Text too long. Maximum 50,000 characters.");
  }

  const googleApiKey =
    process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!googleApiKey) {
    throw new Error(
      "Google API key not configured (GOOGLE_GENERATIVE_AI_API_KEY or GOOGLE_API_KEY)"
    );
  }

  // Ensure the AI SDK picks up the key
  const originalKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  process.env.GOOGLE_GENERATIVE_AI_API_KEY = googleApiKey;

  try {
    const db = getDatabase();
    const userId = "default";
    const memory = loadDaimonMemory(db, userId);

    const systemPrompt = getDaimonSystemPrompt(memory);
    const userPrompt = buildDaimonUserPrompt(text.trim(), targetLanguage);

    const result = await generateText({
      model: google("gemini-3.1-flash-lite-preview"),
      output: Output.object({ schema: DaimonResponseSchema }),
      system: systemPrompt,
      prompt: userPrompt,
    });

    const response = result.output;
    if (!response) {
      throw new Error("AI generation returned no structured output");
    }

    // Persist to history (non-blocking)
    saveToHistory(db, userId, text.trim(), response.polishedText, response.hadChanges, sourceContext);

    return NextResponse.json({
      polishedText: response.polishedText,
      hadChanges: response.hadChanges,
      didTranslate: response.didTranslate,
      notes: response.notes ?? null,
    });
  } finally {
    // Restore original key
    if (originalKey) process.env.GOOGLE_GENERATIVE_AI_API_KEY = originalKey;
    else delete process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  }
});
