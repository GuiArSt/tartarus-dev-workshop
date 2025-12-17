import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/db";
import { WritingMemory, TypoPattern } from "@/lib/db-schema";
import { getDefaultMemory, ScribeMemory } from "@/lib/ai/scribe";

/**
 * GET /api/scribe/memory
 * Retrieve user's writing memory
 */
export async function GET() {
  try {
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

    // Parse and return memory
    const memory: ScribeMemory = {
      typoPatterns: JSON.parse(memoryRow.typo_patterns || "[]"),
      protectedTerms: JSON.parse(memoryRow.protected_terms || "[]"),
      stylePreferences: JSON.parse(memoryRow.style_preferences || "{}"),
      totalChecks: memoryRow.total_checks,
      totalCorrections: memoryRow.total_corrections,
    };

    return NextResponse.json({
      memory,
      stats: {
        totalChecks: memoryRow.total_checks,
        totalCorrections: memoryRow.total_corrections,
        patternsLearned: memory.typoPatterns.length,
        protectedTerms: memory.protectedTerms.length,
      },
      updatedAt: memoryRow.updated_at,
    });
  } catch (error: any) {
    console.error("[Scribe Memory GET] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch memory" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/scribe/memory
 * Update specific parts of writing memory
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { protectedTerms, stylePreferences, typoPatterns } = body;

    const db = getDatabase();

    // Build dynamic update query
    const updates: string[] = [];
    const values: any[] = [];

    if (protectedTerms !== undefined) {
      updates.push("protected_terms = ?");
      values.push(JSON.stringify(protectedTerms));
    }

    if (stylePreferences !== undefined) {
      updates.push("style_preferences = ?");
      values.push(JSON.stringify(stylePreferences));
    }

    if (typoPatterns !== undefined) {
      updates.push("typo_patterns = ?");
      values.push(JSON.stringify(typoPatterns));
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }

    updates.push("updated_at = CURRENT_TIMESTAMP");
    values.push("default");

    db.prepare(
      `UPDATE writing_memory SET ${updates.join(", ")} WHERE user_id = ?`
    ).run(...values);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[Scribe Memory PATCH] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update memory" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/scribe/memory
 * Reset writing memory to defaults
 */
export async function DELETE() {
  try {
    const db = getDatabase();
    const defaultMemory = getDefaultMemory();

    db.prepare(
      `UPDATE writing_memory
       SET typo_patterns = ?,
           style_preferences = ?,
           protected_terms = ?,
           total_checks = 0,
           total_corrections = 0,
           updated_at = CURRENT_TIMESTAMP
       WHERE user_id = ?`
    ).run(
      JSON.stringify(defaultMemory.typoPatterns),
      JSON.stringify(defaultMemory.stylePreferences),
      JSON.stringify(defaultMemory.protectedTerms),
      "default"
    );

    return NextResponse.json({ success: true, message: "Memory reset to defaults" });
  } catch (error: any) {
    console.error("[Scribe Memory DELETE] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to reset memory" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/scribe/memory/term
 * Add a protected term
 */
export async function POST(request: NextRequest) {
  try {
    const { action, term } = await request.json();

    if (!term || typeof term !== "string") {
      return NextResponse.json(
        { error: "Term is required" },
        { status: 400 }
      );
    }

    const db = getDatabase();
    const memoryRow = db
      .prepare("SELECT protected_terms FROM writing_memory WHERE user_id = ?")
      .get("default") as { protected_terms: string } | undefined;

    if (!memoryRow) {
      return NextResponse.json(
        { error: "Memory not initialized" },
        { status: 404 }
      );
    }

    const protectedTerms: string[] = JSON.parse(memoryRow.protected_terms || "[]");

    if (action === "add") {
      if (!protectedTerms.includes(term)) {
        protectedTerms.push(term);
      }
    } else if (action === "remove") {
      const index = protectedTerms.indexOf(term);
      if (index > -1) {
        protectedTerms.splice(index, 1);
      }
    } else {
      return NextResponse.json(
        { error: "Invalid action. Use 'add' or 'remove'" },
        { status: 400 }
      );
    }

    db.prepare(
      `UPDATE writing_memory
       SET protected_terms = ?, updated_at = CURRENT_TIMESTAMP
       WHERE user_id = ?`
    ).run(JSON.stringify(protectedTerms), "default");

    return NextResponse.json({ success: true, protectedTerms });
  } catch (error: any) {
    console.error("[Scribe Memory POST] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update protected terms" },
      { status: 500 }
    );
  }
}
