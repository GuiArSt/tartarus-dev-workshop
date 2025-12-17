import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getDatabase } from "@/lib/db";
import { WritingMemory, TypoPattern } from "@/lib/db-schema";
import {
  getScribeSystemPrompt,
  extractTypoPatterns,
  getDefaultMemory,
  ScribeMemory,
} from "@/lib/ai/scribe";

/**
 * POST /api/scribe/check
 * Spellcheck text using Haiku with personalized memory
 */
export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();

    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    if (text.length > 50000) {
      return NextResponse.json(
        { error: "Text too long. Maximum 50,000 characters." },
        { status: 400 }
      );
    }

    // Check if Anthropic API key is configured
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Anthropic API key not configured" },
        { status: 500 }
      );
    }

    // Load user's writing memory
    const db = getDatabase();
    let memoryRow = db
      .prepare("SELECT * FROM writing_memory WHERE user_id = ?")
      .get("default") as WritingMemory | undefined;

    // Create default memory if not exists
    if (!memoryRow) {
      const defaultMemory = getDefaultMemory();
      db.prepare(
        `INSERT INTO writing_memory (user_id, typo_patterns, style_preferences, protected_terms)
         VALUES (?, ?, ?, ?)`
      ).run(
        "default",
        JSON.stringify(defaultMemory.typoPatterns),
        JSON.stringify(defaultMemory.stylePreferences),
        JSON.stringify(defaultMemory.protectedTerms)
      );
      memoryRow = db
        .prepare("SELECT * FROM writing_memory WHERE user_id = ?")
        .get("default") as WritingMemory;
    }

    // Parse memory
    const memory: ScribeMemory = {
      typoPatterns: JSON.parse(memoryRow.typo_patterns || "[]"),
      protectedTerms: JSON.parse(memoryRow.protected_terms || "[]"),
      stylePreferences: JSON.parse(memoryRow.style_preferences || "{}"),
      totalChecks: memoryRow.total_checks,
      totalCorrections: memoryRow.total_corrections,
    };

    // Generate system prompt with memory
    const systemPrompt = getScribeSystemPrompt(memory);

    // Call Haiku for fast spellchecking
    const anthropic = new Anthropic({ apiKey });
    const response = await anthropic.messages.create({
      model: "claude-3-5-haiku-latest",
      max_tokens: Math.min(text.length * 2, 8192),
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: text,
        },
      ],
    });

    // Extract corrected text
    const correctedText =
      response.content[0].type === "text" ? response.content[0].text : text;

    // Count corrections (simple word diff)
    const originalWords = text.split(/\s+/).length;
    const changedWords = text !== correctedText ? 1 : 0; // Simplified count

    // Learn from this correction (async, don't block response)
    const newPatterns = extractTypoPatterns(
      text,
      correctedText,
      memory.typoPatterns
    );
    const hadCorrections = text !== correctedText;

    // Update memory in background
    try {
      db.prepare(
        `UPDATE writing_memory
         SET typo_patterns = ?,
             total_checks = total_checks + 1,
             total_corrections = total_corrections + ?,
             updated_at = CURRENT_TIMESTAMP
         WHERE user_id = ?`
      ).run(JSON.stringify(newPatterns), hadCorrections ? 1 : 0, "default");
    } catch (e) {
      console.error("[Scribe] Failed to update memory:", e);
    }

    return NextResponse.json({
      original: text,
      corrected: correctedText,
      hadCorrections,
      patternsLearned: newPatterns.length - memory.typoPatterns.length,
      totalPatterns: newPatterns.length,
    });
  } catch (error: any) {
    console.error("[Scribe Check] Error:", error);
    return NextResponse.json(
      { error: error.message || "Spellcheck failed" },
      { status: 500 }
    );
  }
}
