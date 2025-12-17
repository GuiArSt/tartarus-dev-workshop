import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { NextResponse } from "next/server";

/**
 * Generate a tool definition using Claude Haiku 4.5
 * This creates tools with prompts and Zod schemas for AI-powered operations
 */
export async function POST(req: Request) {
  try {
    const { description, examples, context } = await req.json();

    if (!description) {
      return NextResponse.json(
        { error: "Description is required" },
        { status: 400 }
      );
    }

    // Use Claude Haiku 4.5 for fast, cost-effective tool generation
    const model = anthropic("claude-haiku-4-5-20251001");

    const result = await generateText({
      model,
      system: `You are an expert at creating AI tool definitions with Zod schemas.
Your task is to generate:
1. A clear, concise tool description
2. A comprehensive Zod schema for input validation
3. A prompt template that guides the AI on how to use this tool effectively

The tool should be designed for AI agents to create or update resources.
Focus on making the schema type-safe and the prompt actionable.

ALWAYS respond with valid JSON only, no markdown, no code blocks.`,
      prompt: `Create a tool definition for: "${description}"

${context ? `Context: ${context}` : ""}

${examples ? `Examples of desired behavior:\n${examples}` : ""}

Generate:
1. A tool description (1-2 sentences explaining when and why to use this tool)
2. A Zod schema definition (complete z.object with all necessary fields, descriptions, and validation)
3. A prompt template (instructions for the AI on how to use this tool, what to consider, and best practices)

Respond with ONLY valid JSON:
{
  "description": "...",
  "inputSchema": {
    "field1": "z.string().describe('...')",
    "field2": "z.number().optional()"
  },
  "promptTemplate": "..."
}`,
    });

    // Parse JSON from text response
    const jsonMatch = result.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Failed to parse JSON from response");
    }
    const parsed = JSON.parse(jsonMatch[0]);

    // Convert the schema strings to actual Zod schema
    const schemaFields: Record<string, z.ZodTypeAny> = {};
    for (const [key, value] of Object.entries(parsed.inputSchema)) {
      try {
        // Evaluate the Zod schema string (safe eval context)
        schemaFields[key] = eval(`z.${value}`) as z.ZodTypeAny;
      } catch {
        // Fallback to string if evaluation fails
        schemaFields[key] = z.string().describe(`Field: ${key}`);
      }
    }

    const finalSchema = z.object(schemaFields);

    return NextResponse.json({
      tool: {
        description: parsed.description,
        inputSchema: finalSchema,
        promptTemplate: parsed.promptTemplate,
      },
      raw: parsed,
    });
  } catch (error: any) {
    console.error("Tool generation error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate tool" },
      { status: 500 }
    );
  }
}
