/**
 * Text diff utilities for Atropos
 * Computes and renders differences between original and corrected text
 */

import * as Diff from "diff";

export interface DiffPart {
  value: string;
  added?: boolean;
  removed?: boolean;
  changeIndex?: number; // Index of this change for navigation
}

export interface DiffResult {
  parts: DiffPart[];
  stats: {
    additions: number;
    deletions: number;
    unchanged: number;
  };
  changeCount: number; // Total number of distinct changes
  changeIndices: number[]; // Part indices that represent changes (for navigation)
}

/**
 * Add change indices to parts for navigation
 */
function addChangeIndices(parts: DiffPart[]): { parts: DiffPart[]; changeCount: number; changeIndices: number[] } {
  let changeIndex = 0;
  const changeIndices: number[] = [];

  const indexedParts = parts.map((part, partIndex) => {
    if (part.added || part.removed) {
      // Group consecutive removed+added as a single change
      const prevPart = parts[partIndex - 1];
      if (part.added && prevPart?.removed) {
        // This is part of the previous change (replacement)
        return { ...part, changeIndex: changeIndex - 1 };
      }
      changeIndices.push(partIndex);
      return { ...part, changeIndex: changeIndex++ };
    }
    return part;
  });

  return { parts: indexedParts, changeCount: changeIndex, changeIndices };
}

/**
 * Compute word-level diff between original and corrected text
 */
export function computeWordDiff(original: string, corrected: string): DiffResult {
  const rawParts = Diff.diffWords(original, corrected);

  let additions = 0;
  let deletions = 0;
  let unchanged = 0;

  for (const part of rawParts) {
    const wordCount = part.value.trim().split(/\s+/).filter(Boolean).length;
    if (part.added) {
      additions += wordCount;
    } else if (part.removed) {
      deletions += wordCount;
    } else {
      unchanged += wordCount;
    }
  }

  const { parts, changeCount, changeIndices } = addChangeIndices(rawParts);

  return {
    parts,
    stats: { additions, deletions, unchanged },
    changeCount,
    changeIndices,
  };
}

/**
 * Compute character-level diff for more granular changes
 */
export function computeCharDiff(original: string, corrected: string): DiffResult {
  const rawParts = Diff.diffChars(original, corrected);

  let additions = 0;
  let deletions = 0;
  let unchanged = 0;

  for (const part of rawParts) {
    if (part.added) {
      additions += part.value.length;
    } else if (part.removed) {
      deletions += part.value.length;
    } else {
      unchanged += part.value.length;
    }
  }

  const { parts, changeCount, changeIndices } = addChangeIndices(rawParts);

  return {
    parts,
    stats: { additions, deletions, unchanged },
    changeCount,
    changeIndices,
  };
}

/**
 * Compute sentence-level diff for larger text blocks
 */
export function computeSentenceDiff(original: string, corrected: string): DiffResult {
  const rawParts = Diff.diffSentences(original, corrected);

  let additions = 0;
  let deletions = 0;
  let unchanged = 0;

  for (const part of rawParts) {
    if (part.added) {
      additions++;
    } else if (part.removed) {
      deletions++;
    } else {
      unchanged++;
    }
  }

  const { parts, changeCount, changeIndices } = addChangeIndices(rawParts);

  return {
    parts,
    stats: { additions, deletions, unchanged },
    changeCount,
    changeIndices,
  };
}

/**
 * Smart diff - uses character diff for small changes, word diff for larger ones
 */
export function computeSmartDiff(original: string, corrected: string): DiffResult {
  // If texts are identical, return early
  if (original === corrected) {
    return {
      parts: [{ value: original }],
      stats: { additions: 0, deletions: 0, unchanged: original.length },
      changeCount: 0,
      changeIndices: [],
    };
  }

  // For short texts (< 100 chars), use character diff for precision
  if (original.length < 100 && corrected.length < 100) {
    return computeCharDiff(original, corrected);
  }

  // For longer texts, use word diff for readability
  return computeWordDiff(original, corrected);
}

/**
 * Count the number of actual corrections (paired deletions/additions)
 */
export function countCorrections(diffResult: DiffResult): number {
  const { parts } = diffResult;
  let corrections = 0;

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    const nextPart = parts[i + 1];

    // A correction is typically a removed part followed by an added part
    if (part.removed && nextPart?.added) {
      corrections++;
      i++; // Skip the next part since we've counted it
    } else if (part.removed && !nextPart?.added) {
      // Pure deletion
      corrections++;
    } else if (part.added && (i === 0 || !parts[i - 1]?.removed)) {
      // Pure addition (not part of a replacement)
      corrections++;
    }
  }

  return corrections;
}

/**
 * Get a summary of the changes
 */
export function getDiffSummary(diffResult: DiffResult): string {
  const corrections = countCorrections(diffResult);

  if (corrections === 0) {
    return "No changes made";
  }

  if (corrections === 1) {
    return "1 correction";
  }

  return `${corrections} corrections`;
}
