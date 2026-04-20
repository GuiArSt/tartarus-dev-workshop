/**
 * Unified Design System for Kronus Config Popovers
 *
 * A consistent, elegant visual language for Soul, Tools, Model, and Format configs.
 * Inspired by Tartarus palette with mythological aesthetic.
 */

// ============================================================================
// TARTARUS PALETTE
// ============================================================================

export const TARTARUS = {
  // Backgrounds - aligned to globals.css CSS variables
  void: "var(--tartarus-void)",
  abyss: "var(--tartarus-void)", // alias for void
  surface: "var(--tartarus-surface)",
  elevated: "var(--tartarus-elevated)",

  // Borders & Lines
  border: "var(--tartarus-border)",
  borderSubtle: "var(--tartarus-border)",
  borderAccent: "var(--tartarus-border-light)",

  // Text
  text: "var(--tartarus-ivory-dim)",
  textMuted: "var(--tartarus-ivory-muted)",
  textDim: "var(--tartarus-ivory-faded)",

  // Accent Colors
  teal: "var(--tartarus-teal)",
  tealDim: "var(--tartarus-teal-dim)",
  tealGlow: "var(--tartarus-teal-soft)",

  gold: "var(--tartarus-gold)",
  goldGlow: "var(--tartarus-gold-soft)",

  purple: "var(--tartarus-purple)",
  purpleGlow: "var(--tartarus-purple-soft)",

  // Provider Colors
  google: "var(--tartarus-google)",
  anthropic: "var(--tartarus-anthropic)",
  openai: "var(--tartarus-openai)",

  // Status
  success: "var(--tartarus-success)",
  warning: "var(--tartarus-warning)",
  error: "var(--tartarus-error)",
} as const;

// ============================================================================
// SHARED STYLES
// ============================================================================

/**
 * Popover container styles - consistent across all configs
 */
export const popoverStyles = {
  container: {
    backgroundColor: TARTARUS.abyss,
    border: `1px solid ${TARTARUS.border}`,
    color: TARTARUS.text,
    backdropFilter: "blur(12px)",
  },
  inner: {
    backgroundColor: TARTARUS.abyss,
  },
} as const;

/**
 * Header styles for config popovers
 */
export const headerStyles = {
  title: {
    fontWeight: 600,
    color: TARTARUS.text,
    fontSize: "14px",
    letterSpacing: "0.01em",
  },
  subtitle: {
    fontSize: "12px",
    color: TARTARUS.textMuted,
    marginTop: "2px",
  },
  actionButton: {
    fontSize: "11px",
    padding: "4px 8px",
    color: TARTARUS.textMuted,
    background: "transparent",
    border: "none",
    cursor: "pointer",
    borderRadius: "4px",
    transition: "all 0.15s ease",
  },
} as const;

/**
 * Section divider with label
 */
export const sectionStyles = {
  divider: {
    borderTop: `1px solid ${TARTARUS.borderSubtle}`,
    paddingTop: "12px",
    marginTop: "12px",
  },
  label: {
    fontSize: "10px",
    color: TARTARUS.textDim,
    textTransform: "uppercase" as const,
    letterSpacing: "0.08em",
    fontWeight: 500,
    marginBottom: "10px",
  },
} as const;

/**
 * Toggle row styles (for switches)
 */
export const toggleRowStyles = {
  container: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "8px 10px",
    borderRadius: "8px",
    transition: "background 0.15s ease",
    cursor: "pointer",
  },
  containerHover: {
    background: TARTARUS.surface,
  },
  icon: {
    width: "18px",
    height: "18px",
    flexShrink: 0,
  },
  labelContainer: {
    flex: 1,
    minWidth: 0,
  },
  label: {
    fontSize: "13px",
    fontWeight: 500,
    transition: "color 0.15s ease",
  },
  description: {
    fontSize: "11px",
    color: TARTARUS.textMuted,
    marginTop: "1px",
  },
  badge: {
    fontSize: "11px",
    color: TARTARUS.textDim,
    fontFamily: "monospace",
    padding: "2px 6px",
    borderRadius: "4px",
    backgroundColor: TARTARUS.surface,
  },
} as const;

/**
 * Card/Button styles for selectable items
 */
export const cardStyles = {
  base: {
    padding: "10px 12px",
    borderRadius: "8px",
    border: `1px solid ${TARTARUS.border}`,
    backgroundColor: "transparent",
    cursor: "pointer",
    textAlign: "left" as const,
    transition: "all 0.15s ease",
    width: "100%",
  },
  selected: (accentColor: string) => ({
    backgroundColor: `${accentColor}10`,
    borderColor: `${accentColor}40`,
  }),
  hover: {
    backgroundColor: TARTARUS.surface,
    borderColor: TARTARUS.borderAccent,
  },
} as const;

/**
 * Footer/Summary section styles
 */
export const footerStyles = {
  container: {
    paddingTop: "12px",
    borderTop: `1px solid ${TARTARUS.borderSubtle}`,
    marginTop: "12px",
  },
  row: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    fontSize: "12px",
  },
  label: {
    color: TARTARUS.textMuted,
  },
  value: {
    fontFamily: "monospace",
    fontWeight: 500,
  },
  note: {
    fontSize: "11px",
    color: TARTARUS.textDim,
    marginTop: "8px",
    fontStyle: "italic" as const,
  },
} as const;

/**
 * Switch styles (custom colors based on state)
 */
export const switchStyles = {
  off: {
    backgroundColor: TARTARUS.surface,
  },
  on: (color: string = TARTARUS.teal) => ({
    backgroundColor: color,
  }),
} as const;

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Format large numbers with k suffix
 */
export function formatNumber(num: number | undefined | null): string {
  if (num == null || isNaN(num)) {
    return "0";
  }
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${Math.round(num / 1000)}k`;
  }
  return `${num}`;
}

/**
 * Get accent color based on enabled state
 */
export function getAccentColor(enabled: boolean, accentColor: string = TARTARUS.teal): string {
  return enabled ? accentColor : TARTARUS.textDim;
}

/**
 * Generate glow effect CSS
 */
export function glowEffect(color: string, intensity: number = 0.15): string {
  return `0 0 20px ${color}${Math.round(intensity * 255)
    .toString(16)
    .padStart(2, "0")}`;
}
