/**
 * Tartarus Color System
 *
 * Centralized color utility for consistent theming across the application.
 * All colors use CSS variables defined in globals.css for the Tartarus dark theme.
 */

// Available category colors that work well with the Tartarus palette
export const TARTARUS_CATEGORY_COLORS = [
  "teal",
  "gold",
  "violet",
  "rose",
  "blue",
  "emerald",
  "amber",
  "cyan",
  "indigo",
  "pink",
  "lime",
  "orange",
] as const;

export type TartarusCategoryColor = typeof TARTARUS_CATEGORY_COLORS[number];

/**
 * Color class mappings for category-based styling
 * Each color provides consistent text, background, bar, and border classes
 */
const COLOR_CLASS_MAP: Record<TartarusCategoryColor, {
  text: string;
  bg: string;
  bar: string;
  border: string;
}> = {
  teal: {
    text: "text-[var(--tartarus-teal)]",
    bg: "bg-[var(--tartarus-teal-soft)]",
    bar: "bg-[var(--tartarus-teal)]",
    border: "border-[var(--tartarus-teal-dim)]",
  },
  gold: {
    text: "text-[var(--tartarus-gold)]",
    bg: "bg-[var(--tartarus-gold-soft)]",
    bar: "bg-[var(--tartarus-gold)]",
    border: "border-[var(--tartarus-gold-dim)]",
  },
  violet: {
    text: "text-violet-400",
    bg: "bg-violet-500/10",
    bar: "bg-violet-500",
    border: "border-violet-500/50",
  },
  rose: {
    text: "text-rose-400",
    bg: "bg-rose-500/10",
    bar: "bg-rose-500",
    border: "border-rose-500/50",
  },
  blue: {
    text: "text-blue-400",
    bg: "bg-blue-500/10",
    bar: "bg-blue-500",
    border: "border-blue-500/50",
  },
  emerald: {
    text: "text-[var(--tartarus-success)]",
    bg: "bg-[var(--tartarus-success-soft)]",
    bar: "bg-[var(--tartarus-success)]",
    border: "border-[var(--tartarus-success)]/50",
  },
  amber: {
    text: "text-[var(--tartarus-warning)]",
    bg: "bg-[var(--tartarus-warning-soft)]",
    bar: "bg-[var(--tartarus-warning)]",
    border: "border-[var(--tartarus-warning)]/50",
  },
  cyan: {
    text: "text-cyan-400",
    bg: "bg-cyan-500/10",
    bar: "bg-cyan-500",
    border: "border-cyan-500/50",
  },
  indigo: {
    text: "text-indigo-400",
    bg: "bg-indigo-500/10",
    bar: "bg-indigo-500",
    border: "border-indigo-500/50",
  },
  pink: {
    text: "text-pink-400",
    bg: "bg-pink-500/10",
    bar: "bg-pink-500",
    border: "border-pink-500/50",
  },
  lime: {
    text: "text-lime-400",
    bg: "bg-lime-500/10",
    bar: "bg-lime-500",
    border: "border-lime-500/50",
  },
  orange: {
    text: "text-orange-400",
    bg: "bg-orange-500/10",
    bar: "bg-orange-500",
    border: "border-orange-500/50",
  },
};

/**
 * Get Tartarus-compatible color classes for a category
 * Falls back to teal (primary color) if color not found
 */
export function getCategoryColors(colorName: string): {
  text: string;
  bg: string;
  bar: string;
  border: string;
} {
  const normalizedColor = colorName.toLowerCase() as TartarusCategoryColor;
  return COLOR_CLASS_MAP[normalizedColor] || COLOR_CLASS_MAP.teal;
}

/**
 * Get a consistent color for a given index (for lists/arrays)
 * Cycles through the available colors
 */
export function getColorByIndex(index: number): TartarusCategoryColor {
  return TARTARUS_CATEGORY_COLORS[index % TARTARUS_CATEGORY_COLORS.length];
}

/**
 * Generate a deterministic color based on a string (e.g., category name)
 * Uses a simple hash to always return the same color for the same input
 */
export function getColorFromString(str: string): TartarusCategoryColor {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % TARTARUS_CATEGORY_COLORS.length;
  return TARTARUS_CATEGORY_COLORS[index];
}

/**
 * Status color utilities - for semantic states
 */
export const statusColors = {
  success: {
    text: "text-[var(--tartarus-success)]",
    bg: "bg-[var(--tartarus-success-soft)]",
    border: "border-[var(--tartarus-success)]/50",
  },
  warning: {
    text: "text-[var(--tartarus-warning)]",
    bg: "bg-[var(--tartarus-warning-soft)]",
    border: "border-[var(--tartarus-warning)]/50",
  },
  error: {
    text: "text-[var(--tartarus-error)]",
    bg: "bg-[var(--tartarus-error-soft)]",
    border: "border-[var(--tartarus-error)]/50",
  },
} as const;

/**
 * Primary action colors - for buttons and interactive elements
 */
export const actionColors = {
  primary: {
    solid: "bg-[var(--tartarus-teal)] text-[var(--tartarus-void)] hover:bg-[var(--tartarus-teal-bright)]",
    outline: "border-[var(--tartarus-teal-dim)] text-[var(--tartarus-teal)] hover:bg-[var(--tartarus-teal-soft)]",
    ghost: "text-[var(--tartarus-teal)] hover:bg-[var(--tartarus-teal-soft)]",
  },
  secondary: {
    solid: "bg-[var(--tartarus-gold)] text-[var(--tartarus-void)] hover:bg-[var(--tartarus-gold-bright)]",
    outline: "border-[var(--tartarus-gold-dim)] text-[var(--tartarus-gold)] hover:bg-[var(--tartarus-gold-soft)]",
    ghost: "text-[var(--tartarus-gold)] hover:bg-[var(--tartarus-gold-soft)]",
  },
  destructive: {
    solid: "bg-[var(--tartarus-error)] text-white hover:bg-[var(--tartarus-error)]/90",
    outline: "border-[var(--tartarus-error)]/50 text-[var(--tartarus-error)] hover:bg-[var(--tartarus-error-soft)]",
    ghost: "text-[var(--tartarus-error)] hover:bg-[var(--tartarus-error-soft)]",
  },
} as const;
