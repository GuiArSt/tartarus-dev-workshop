import { NextRequest, NextResponse } from "next/server";
import { anthropic } from "@ai-sdk/anthropic";
import { generateObject } from "ai";
import { getDatabase } from "@/lib/db";
import {
  CorrectionResponseSchema,
  getAtroposSystemPrompt,
  buildCorrectionUserPrompt,
  getDefaultAtroposMemory,
  AtroposMemory,
} from "@/lib/ai/atropos";

interface AtroposMemoryRow {
  id: number;
  user_id: string;
  custom_dictionary: string;
  memories: string;
  total_checks: number;
  total_corrections: number;
  created_at: string;
  updated_at: string;
}

/**
 * POST /api/atropos/correct
 * Correct text using Atropos with structured output
 */
export async function POST(request: NextRequest) {
  try {
    const { text, answers } = await request.json();

    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    if (text.length > 50000) {
      return NextResponse.json(
        { error: "Text too long. Maximum 50,000 characters." },
        { status: 400 }
      );
    }

    // Check API key
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Anthropic API key not configured" },
        { status: 500 }
      );
    }

    // Load user's memory
    const db = getDatabase();
    let memoryRow = db
      .prepare("SELECT * FROM atropos_memory WHERE user_id = ?")
      .get("default") as AtroposMemoryRow | undefined;

    // Create default memory if not exists
    if (!memoryRow) {
      const defaultMemory = getDefaultAtroposMemory();
      db.prepare(
        `INSERT INTO atropos_memory (user_id, custom_dictionary, memories)
         VALUES (?, ?, ?)`
      ).run(
        "default",
        JSON.stringify(defaultMemory.customDictionary),
        JSON.stringify(defaultMemory.memories)
      );
      memoryRow = db
        .prepare("SELECT * FROM atropos_memory WHERE user_id = ?")
        .get("default") as AtroposMemoryRow;
    }

    // Parse memory
    const memory: AtroposMemory = {
      customDictionary: JSON.parse(memoryRow.custom_dictionary || "[]"),
      memories: JSON.parse(memoryRow.memories || "[]"),
      totalChecks: memoryRow.total_checks,
      totalCorrections: memoryRow.total_corrections,
    };

    // Build prompts
    const systemPrompt = getAtroposSystemPrompt(memory);
    const userPrompt = buildCorrectionUserPrompt(text, answers);

    // Call Haiku 4.5 with structured output
    const { object: response } = await generateObject({
      model: anthropic("claude-haiku-4-5-20251001"),
      schema: CorrectionResponseSchema,
      system: systemPrompt,
      prompt: userPrompt,
    });

    // Update stats (don't block response)
    try {
      db.prepare(
        `UPDATE atropos_memory
         SET total_checks = total_checks + 1,
             total_corrections = total_corrections + ?,
             updated_at = CURRENT_TIMESTAMP
         WHERE user_id = ?`
      ).run(response.hadChanges ? 1 : 0, "default");
    } catch (e) {
      console.error("[Atropos] Failed to update stats:", e);
    }

    return NextResponse.json({
      correctedText: response.correctedText,
      hadChanges: response.hadChanges,
      intentQuestions: response.intentQuestions || [],
    });
  } catch (error: any) {
    console.error("[Atropos Correct] Error:", error);
    return NextResponse.json(
      { error: error.message || "Correction failed" },
      { status: 500 }
    );
  }
}
