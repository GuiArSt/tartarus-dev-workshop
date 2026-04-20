"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { Check, X, Sparkles, CheckCircle, History, ChevronDown, ChevronUp, Send, Languages } from "lucide-react";

interface DaimonPolishPanelProps {
  original: string;
  polished: string;
  /** True when original === polished (no changes needed) */
  isClean: boolean;
  /** True if translation was performed */
  didTranslate?: boolean;
  /** Optional note from the AI (cultural nuance, etc.) */
  notes?: string | null;
  onSendPolished: () => void;
  onSendOriginal: () => void;
  onCancel: () => void;
  /** Replace the textarea content with the polished text (for editing) */
  onAcceptInPlace: () => void;
}

interface HistoryEntry {
  id: number;
  originalText: string;
  correctedText: string;
  hadChanges: boolean;
  sourceContext: string | null;
  createdAt: string;
}

// ─── Word-level diff ───────────────────────────────────────

function computeWordDiff(
  original: string,
  polished: string
): { text: string; type: "same" | "added" | "removed" }[] {
  const origWords = original.split(/(\s+)/);
  const polWords = polished.split(/(\s+)/);
  const m = origWords.length;
  const n = polWords.length;

  if (m * n > 50000) {
    return [
      { text: original, type: "removed" },
      { text: polished, type: "added" },
    ];
  }

  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (origWords[i - 1] === polWords[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  const segments: { text: string; type: "same" | "added" | "removed" }[] = [];
  let i = m, j = n;
  const rev: typeof segments = [];

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && origWords[i - 1] === polWords[j - 1]) {
      rev.push({ text: origWords[i - 1], type: "same" });
      i--; j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      rev.push({ text: polWords[j - 1], type: "added" });
      j--;
    } else {
      rev.push({ text: origWords[i - 1], type: "removed" });
      i--;
    }
  }

  const raw = rev.reverse();
  for (const seg of raw) {
    const last = segments[segments.length - 1];
    if (last && last.type === seg.type) {
      last.text += seg.text;
    } else {
      segments.push({ ...seg });
    }
  }
  return segments;
}

function countChanges(diff: { type: string }[]): number {
  return diff.filter((s) => s.type !== "same").length;
}

// ─── Component ─────────────────────────────────────────────

export function DaimonPolishPanel({
  original,
  polished,
  isClean,
  didTranslate,
  notes,
  onSendPolished,
  onSendOriginal,
  onCancel,
  onAcceptInPlace,
}: DaimonPolishPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const diff = isClean ? [] : computeWordDiff(original, polished);
  const changeCount = countChanges(diff);

  // Enter animation
  useEffect(() => {
    requestAnimationFrame(() => setMounted(true));
  }, []);

  // Escape to cancel
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onCancel]);

  useEffect(() => {
    panelRef.current?.focus();
  }, []);

  // Fetch correction history when expanded
  const loadHistory = useCallback(async () => {
    if (history.length > 0) return;
    setHistoryLoading(true);
    try {
      const res = await fetch("/api/atropos/correct/history?limit=10");
      if (res.ok) {
        const data = await res.json();
        setHistory(data.corrections || []);
      }
    } catch { /* silent */ }
    setHistoryLoading(false);
  }, [history.length]);

  // Header label
  const headerLabel = isClean
    ? "Text looks good"
    : didTranslate
      ? `Translated${changeCount > 0 ? ` with ${changeCount} fix${changeCount === 1 ? "" : "es"}` : ""}`
      : `${changeCount} correction${changeCount === 1 ? "" : "s"} suggested`;

  const HeaderIcon = isClean
    ? CheckCircle
    : didTranslate
      ? Languages
      : Sparkles;

  const headerColor = isClean
    ? "text-[var(--tartarus-success)]"
    : "text-[var(--tartarus-gold)]";

  return (
    <div
      ref={panelRef}
      tabIndex={-1}
      className="rounded-lg border border-[var(--tartarus-gold)]/30 bg-[var(--tartarus-surface)] overflow-hidden outline-none"
      style={{
        opacity: mounted ? 1 : 0,
        transform: mounted ? "translateY(0) scale(1)" : "translateY(6px) scale(0.98)",
        transition: "opacity 200ms cubic-bezier(0.23, 1, 0.32, 1), transform 200ms cubic-bezier(0.23, 1, 0.32, 1)",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--tartarus-border)]">
        <div className="flex items-center gap-2">
          <HeaderIcon className={`h-3.5 w-3.5 ${isClean ? "text-[var(--tartarus-success)]" : "text-[var(--tartarus-gold)]"}`} />
          <span className={`text-xs font-medium tracking-wide ${headerColor}`}>
            {headerLabel}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setShowHistory(!showHistory);
              if (!showHistory) loadHistory();
            }}
            className="flex items-center gap-1 text-[10px] text-[var(--tartarus-ivory-faded)] hover:text-[var(--tartarus-ivory-muted)] transition-colors duration-150"
          >
            <History className="h-3 w-3" />
            <span className="hidden md:inline">History</span>
            {showHistory ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
          {/* Visible cancel button */}
          <button
            onClick={onCancel}
            className="flex items-center justify-center h-5 w-5 rounded text-[var(--tartarus-ivory-faded)] hover:text-[var(--tartarus-ivory)] hover:bg-[var(--tartarus-ivory)]/10 transition-colors duration-150"
            title="Close (Esc)"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Diff view — only when there are changes */}
      {!isClean && (
        <div className="px-4 py-3 text-sm leading-relaxed text-[var(--tartarus-ivory)]">
          {diff.map((segment, i) => {
            if (segment.type === "same") {
              return <span key={i}>{segment.text}</span>;
            }
            if (segment.type === "removed") {
              return (
                <span key={i} className="line-through text-[var(--tartarus-ivory-muted)] opacity-60">
                  {segment.text}
                </span>
              );
            }
            return (
              <span key={i} className="text-[var(--tartarus-gold)] font-medium">
                {segment.text}
              </span>
            );
          })}
        </div>
      )}

      {/* Clean text message */}
      {isClean && (
        <div className="px-4 py-3 text-sm text-[var(--tartarus-ivory-muted)] italic">
          No corrections needed — your text is clean.
        </div>
      )}

      {/* AI notes (cultural context, translation notes, etc.) */}
      {notes && (
        <div className="px-4 pb-2 text-xs text-[var(--tartarus-ivory-faded)] italic">
          {notes}
        </div>
      )}

      {/* History panel */}
      {showHistory && (
        <div
          className="border-t border-[var(--tartarus-border)] max-h-[200px] overflow-y-auto"
          style={{
            opacity: mounted ? 1 : 0,
            transition: "opacity 150ms cubic-bezier(0.23, 1, 0.32, 1)",
          }}
        >
          {historyLoading ? (
            <div className="px-4 py-3 text-xs text-[var(--tartarus-ivory-faded)]">Loading...</div>
          ) : history.length === 0 ? (
            <div className="px-4 py-3 text-xs text-[var(--tartarus-ivory-faded)] italic">No corrections yet</div>
          ) : (
            <div className="divide-y divide-[var(--tartarus-border)]">
              {history.map((entry) => (
                <div key={entry.id} className="px-4 py-2.5 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className={entry.hadChanges ? "text-[var(--tartarus-gold)]" : "text-[var(--tartarus-success)]"}>
                      {entry.hadChanges ? "Corrected" : "Clean"}
                    </span>
                    <span className="text-[var(--tartarus-ivory-faded)]">
                      {new Date(entry.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  {entry.hadChanges ? (
                    <div className="space-y-0.5">
                      <div className="text-[var(--tartarus-ivory-muted)] line-through truncate">{entry.originalText}</div>
                      <div className="text-[var(--tartarus-ivory)] truncate">{entry.correctedText}</div>
                    </div>
                  ) : (
                    <div className="text-[var(--tartarus-ivory-muted)] truncate">{entry.originalText}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between px-4 py-2.5 border-t border-[var(--tartarus-border)] bg-[var(--tartarus-deep)]">
        <button
          onClick={onCancel}
          className="text-[11px] text-[var(--tartarus-ivory-faded)] hover:text-[var(--tartarus-ivory)] transition-colors duration-150"
        >
          Cancel
        </button>
        <div className="flex items-center gap-2">
          {isClean ? (
            <button
              onClick={onSendOriginal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-[var(--tartarus-teal)]/15 text-[var(--tartarus-teal)] hover:bg-[var(--tartarus-teal)]/25 border border-[var(--tartarus-teal)]/30 active:scale-[0.97] transition-[color,background-color,border-color,transform] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)]"
            >
              <Send className="h-3 w-3" />
              Send
            </button>
          ) : (
            <>
              <button
                onClick={onAcceptInPlace}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs text-[var(--tartarus-ivory-muted)] hover:text-[var(--tartarus-ivory)] hover:bg-[var(--tartarus-surface)] active:scale-[0.97] transition-[color,background-color,transform] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)]"
                title="Replace text in input — lets you edit before sending"
              >
                <Check className="h-3 w-3" />
                Accept
              </button>
              <button
                onClick={onSendOriginal}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs text-[var(--tartarus-ivory-muted)] hover:text-[var(--tartarus-ivory)] hover:bg-[var(--tartarus-surface)] active:scale-[0.97] transition-[color,background-color,transform] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)]"
              >
                Send as-is
              </button>
              <button
                onClick={onSendPolished}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-[var(--tartarus-gold)]/15 text-[var(--tartarus-gold)] hover:bg-[var(--tartarus-gold)]/25 border border-[var(--tartarus-gold)]/30 active:scale-[0.97] transition-[color,background-color,border-color,transform] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)]"
              >
                <Send className="h-3 w-3" />
                Send polished
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
