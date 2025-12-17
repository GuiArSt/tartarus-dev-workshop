/**
 * Scribe - The Memory-Keeper's Quill
 * A personalized spellchecker that learns your writing patterns
 */

import { TypoPattern } from "../db-schema";

export interface ScribeMemory {
  typoPatterns: TypoPattern[];
  protectedTerms: string[];
  stylePreferences: {
    contractions?: "expand" | "keep" | "mixed";
    spellingVariant?: "american" | "british" | "mixed";
  };
  totalChecks: number;
  totalCorrections: number;
}

/**
 * Build the memory injection section for the Scribe prompt
 */
export function buildMemoryInjection(memory: ScribeMemory): string {
  const sections: string[] = [];

  // Common typos section
  if (memory.typoPatterns.length > 0) {
    const topTypos = memory.typoPatterns
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 20);

    const typoList = topTypos
      .map((t) => `- "${t.mistake}" → "${t.correction}" (seen ${t.frequency}x)`)
      .join("\n");

    sections.push(`**Common Typos to Watch For:**\n${typoList}`);
  }

  // Protected terms section
  if (memory.protectedTerms.length > 0) {
    sections.push(
      `**Technical Terms to Preserve (do not "correct"):**\n${memory.protectedTerms.join(", ")}`
    );
  }

  // Style preferences section
  const styleNotes: string[] = [];
  if (memory.stylePreferences.contractions === "keep") {
    styleNotes.push("- Author uses contractions freely (don't, can't, won't)");
  } else if (memory.stylePreferences.contractions === "expand") {
    styleNotes.push("- Author prefers expanded forms (do not, cannot, will not)");
  }
  if (memory.stylePreferences.spellingVariant === "american") {
    styleNotes.push("- American English spelling preferred");
  } else if (memory.stylePreferences.spellingVariant === "british") {
    styleNotes.push("- British English spelling preferred");
  }

  if (styleNotes.length > 0) {
    sections.push(`**Style Preferences:**\n${styleNotes.join("\n")}`);
  }

  // Stats
  if (memory.totalChecks > 0) {
    sections.push(
      `**Writing Stats:** ${memory.totalChecks} texts checked, ${memory.totalCorrections} corrections made`
    );
  }

  if (sections.length === 0) {
    return "No writing patterns learned yet. This is the first check.";
  }

  return sections.join("\n\n");
}

/**
 * Generate the complete Scribe system prompt
 */
export function getScribeSystemPrompt(memory: ScribeMemory): string {
  const memorySection = buildMemoryInjection(memory);

  return `# Scribe - The Memory-Keeper's Quill

You are Scribe, a precise spellchecker for the Tartarus workshop. Your sole mission: **correct spelling and grammar errors while preserving the author's voice**.

## Your Constraints
- ONLY fix spelling mistakes, typos, and basic grammar
- NEVER rewrite, rephrase, or "improve" the text
- NEVER change technical terms, code snippets, or intentional stylistic choices
- Preserve all formatting, line breaks, and structure
- Keep contractions if the author uses them, expand if they don't
- Preserve punctuation style unless clearly incorrect

## Author's Writing Memory

${memorySection}

## Your Response Format
Return ONLY the corrected text. No explanations, no comments, no "Here's the corrected version:".

If the text has no errors, return it unchanged.

## Examples

Input: "teh quick brown fox jumsp over teh lazy dog"
Output: "the quick brown fox jumps over the lazy dog"

Input: "I was thikning about hte implementation"
Output: "I was thinking about the implementation"

Input: "lets evlveit"
Output: "let's evolve it"

Input: "The API endpint returns a JSON resposne"
Output: "The API endpoint returns a JSON response"

Input: "im going to refactor teh codebase tomrrow"
Output: "I'm going to refactor the codebase tomorrow"`;
}

/**
 * Extract typo patterns by diffing original vs corrected text
 * Simple word-level diff
 */
export function extractTypoPatterns(
  original: string,
  corrected: string,
  existingPatterns: TypoPattern[]
): TypoPattern[] {
  // Create a map of existing patterns for easy lookup
  const patternMap = new Map<string, TypoPattern>();
  for (const p of existingPatterns) {
    patternMap.set(p.mistake.toLowerCase(), p);
  }

  // Tokenize both texts
  const originalWords = original.split(/\s+/).filter(Boolean);
  const correctedWords = corrected.split(/\s+/).filter(Boolean);

  // Simple alignment - if same length, compare word by word
  // This is a naive approach but works for typo detection
  if (originalWords.length === correctedWords.length) {
    for (let i = 0; i < originalWords.length; i++) {
      const orig = originalWords[i];
      const corr = correctedWords[i];

      // Clean punctuation for comparison
      const origClean = orig.replace(/[.,!?;:'"()[\]{}]/g, "").toLowerCase();
      const corrClean = corr.replace(/[.,!?;:'"()[\]{}]/g, "").toLowerCase();

      if (origClean !== corrClean && origClean.length > 1) {
        // Found a difference - this is likely a typo correction
        const existing = patternMap.get(origClean);
        if (existing) {
          existing.frequency++;
        } else {
          patternMap.set(origClean, {
            mistake: origClean,
            correction: corrClean,
            frequency: 1,
          });
        }
      }
    }
  }

  return Array.from(patternMap.values());
}

/**
 * Default memory for new users
 */
export function getDefaultMemory(): ScribeMemory {
  return {
    typoPatterns: [],
    protectedTerms: [
      "MCP",
      "Supabase",
      "Kronus",
      "Tartarus",
      "Scribe",
      "Haiku",
      "API",
      "JSON",
      "SQL",
      "CLI",
      "SDK",
      "TypeScript",
      "JavaScript",
      "React",
      "Next.js",
      "Node.js",
    ],
    stylePreferences: {},
    totalChecks: 0,
    totalCorrections: 0,
  };
}
