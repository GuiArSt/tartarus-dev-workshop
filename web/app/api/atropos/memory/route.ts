import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/db";
import {
  getDefaultAtroposMemory,
  AtroposMemory,
  AtroposMemoryEntry,
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
 * GET /api/atropos/memory
 * Retrieve user's Atropos memory
 */
export async function GET() {
  try {
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

    // Parse and return memory
    const memory: AtroposMemory = {
      customDictionary: JSON.parse(memoryRow.custom_dictionary || "[]"),
      memories: JSON.parse(memoryRow.memories || "[]"),
      totalChecks: memoryRow.total_checks,
      totalCorrections: memoryRow.total_corrections,
    };

    return NextResponse.json({
      memory,
      stats: {
        totalChecks: memoryRow.total_checks,
        totalCorrections: memoryRow.total_corrections,
        dictionaryWords: memory.customDictionary.length,
        memoryEntries: memory.memories.length,
      },
      updatedAt: memoryRow.updated_at,
    });
  } catch (error: any) {
    console.error("[Atropos Memory GET] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch memory" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/atropos/memory
 * Save confirmed learnings to memory
 */
export async function POST(request: NextRequest) {
  try {
    const { patterns, dictionaryWords, label } = await request.json();

    const db = getDatabase();
    let memoryRow = db
      .prepare("SELECT * FROM atropos_memory WHERE user_id = ?")
      .get("default") as AtroposMemoryRow | undefined;

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

    // Parse existing data
    const customDictionary: string[] = JSON.parse(
      memoryRow.custom_dictionary || "[]"
    );
    const memories: AtroposMemoryEntry[] = JSON.parse(
      memoryRow.memories || "[]"
    );

    // Add new dictionary words (dedupe)
    if (dictionaryWords && Array.isArray(dictionaryWords)) {
      for (const word of dictionaryWords) {
        if (!customDictionary.includes(word)) {
          customDictionary.push(word);
        }
      }
    }

    // Add new patterns as memory entries
    if (patterns && Array.isArray(patterns)) {
      const now = new Date().toISOString();
      for (const pattern of patterns) {
        memories.push({
          content: pattern,
          tags: label ? [label] : [],
          createdAt: now,
        });
      }
    }

    // Save back to database
    db.prepare(
      `UPDATE atropos_memory
       SET custom_dictionary = ?,
           memories = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE user_id = ?`
    ).run(JSON.stringify(customDictionary), JSON.stringify(memories), "default");

    return NextResponse.json({
      success: true,
      stats: {
        dictionaryWords: customDictionary.length,
        memoryEntries: memories.length,
      },
    });
  } catch (error: any) {
    console.error("[Atropos Memory POST] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to save memory" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/atropos/memory
 * Update specific parts of memory (add/remove dictionary words)
 */
export async function PATCH(request: NextRequest) {
  try {
    const { action, word } = await request.json();

    if (!word || typeof word !== "string") {
      return NextResponse.json({ error: "Word is required" }, { status: 400 });
    }

    const db = getDatabase();
    const memoryRow = db
      .prepare("SELECT custom_dictionary FROM atropos_memory WHERE user_id = ?")
      .get("default") as { custom_dictionary: string } | undefined;

    if (!memoryRow) {
      return NextResponse.json(
        { error: "Memory not initialized" },
        { status: 404 }
      );
    }

    const customDictionary: string[] = JSON.parse(
      memoryRow.custom_dictionary || "[]"
    );

    if (action === "add") {
      if (!customDictionary.includes(word)) {
        customDictionary.push(word);
      }
    } else if (action === "remove") {
      const index = customDictionary.indexOf(word);
      if (index > -1) {
        customDictionary.splice(index, 1);
      }
    } else {
      return NextResponse.json(
        { error: "Invalid action. Use 'add' or 'remove'" },
        { status: 400 }
      );
    }

    db.prepare(
      `UPDATE atropos_memory
       SET custom_dictionary = ?, updated_at = CURRENT_TIMESTAMP
       WHERE user_id = ?`
    ).run(JSON.stringify(customDictionary), "default");

    return NextResponse.json({ success: true, customDictionary });
  } catch (error: any) {
    console.error("[Atropos Memory PATCH] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update memory" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/atropos/memory
 * Reset memory to defaults
 */
export async function DELETE() {
  try {
    const db = getDatabase();
    const defaultMemory = getDefaultAtroposMemory();

    db.prepare(
      `UPDATE atropos_memory
       SET custom_dictionary = ?,
           memories = ?,
           total_checks = 0,
           total_corrections = 0,
           updated_at = CURRENT_TIMESTAMP
       WHERE user_id = ?`
    ).run(
      JSON.stringify(defaultMemory.customDictionary),
      JSON.stringify(defaultMemory.memories),
      "default"
    );

    return NextResponse.json({
      success: true,
      message: "Memory reset to defaults",
    });
  } catch (error: any) {
    console.error("[Atropos Memory DELETE] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to reset memory" },
      { status: 500 }
    );
  }
}
