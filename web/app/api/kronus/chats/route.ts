/**
 * Kronus Chats List API
 *
 * GET: List Kronus chat conversations with pagination
 *
 * Query params:
 *   - limit: number (default: 50, max: 100)
 *   - offset: number (default: 0) - for pagination
 *   - repository: string (optional) - filter by repository
 */

import { NextRequest, NextResponse } from "next/server";
import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { normalizeRepository } from "@/lib/utils";

function getObservabilityDbPath(): string {
  let currentDir = process.cwd();
  if (path.basename(currentDir) === "web") {
    currentDir = path.dirname(currentDir);
  }
  return path.join(currentDir, "data", "observability.db");
}

interface KronusChatRow {
  id: number;
  trace_id: string;
  question: string;
  answer: string;
  repository: string | null;
  depth: string;
  sources: string | null;
  input_tokens: number | null;
  output_tokens: number | null;
  latency_ms: number | null;
  cost_usd: number | null;
  status: string;
  summary: string | null;
  summary_updated_at: string | null;
  created_at: string;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 100);
    const offset = parseInt(searchParams.get("offset") || "0", 10);
    const rawRepository = searchParams.get("repository");
    const repository = rawRepository ? normalizeRepository(rawRepository) : null;

    const dbPath = getObservabilityDbPath();
    if (!fs.existsSync(dbPath)) {
      return NextResponse.json({ error: "Observability database not found" }, { status: 404 });
    }

    const db = new Database(dbPath, { readonly: true });

    // Build query based on filters
    let query = "SELECT * FROM kronus_chats";
    let countQuery = "SELECT COUNT(*) as count FROM kronus_chats";
    const params: any[] = [];

    if (repository) {
      query += " WHERE repository = ?";
      countQuery += " WHERE repository = ?";
      params.push(repository);
    }

    query += " ORDER BY created_at DESC LIMIT ? OFFSET ?";

    // Get total count
    const countResult = db.prepare(countQuery).get(...(repository ? [repository] : [])) as {
      count: number;
    };
    const total = countResult.count;

    // Get chats
    const chats = db.prepare(query).all(...params, limit, offset) as KronusChatRow[];
    db.close();

    // Format response with summary status
    const formattedChats = chats.map((chat) => ({
      id: chat.id,
      trace_id: chat.trace_id,
      question: chat.question,
      answer: chat.answer,
      question_preview: chat.question.substring(0, 150) + (chat.question.length > 150 ? "..." : ""),
      answer_preview: chat.answer.substring(0, 300) + (chat.answer.length > 300 ? "..." : ""),
      repository: chat.repository,
      depth: chat.depth,
      status: chat.status,
      // Summary info
      has_summary: !!chat.summary,
      summary: chat.summary,
      summary_updated_at: chat.summary_updated_at,
      // Metrics
      input_tokens: chat.input_tokens,
      output_tokens: chat.output_tokens,
      latency_ms: chat.latency_ms,
      cost_usd: chat.cost_usd,
      // Sources (parsed)
      sources: chat.sources ? JSON.parse(chat.sources) : null,
      created_at: chat.created_at,
    }));

    return NextResponse.json({
      chats: formattedChats,
      pagination: {
        total,
        limit,
        offset,
        has_more: offset + chats.length < total,
        page: Math.floor(offset / limit) + 1,
        total_pages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error("[KronusChats] GET error:", error);
    return NextResponse.json({ error: error.message || "Unknown error" }, { status: 500 });
  }
}
