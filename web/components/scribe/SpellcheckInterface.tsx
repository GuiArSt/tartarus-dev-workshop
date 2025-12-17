"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Sparkles,
  Copy,
  Check,
  Loader2,
  ChevronDown,
  ChevronUp,
  Brain,
  Trash2,
  Plus,
  X,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TypoPattern {
  mistake: string;
  correction: string;
  frequency: number;
}

interface ScribeMemory {
  typoPatterns: TypoPattern[];
  protectedTerms: string[];
  stylePreferences: Record<string, any>;
  totalChecks: number;
  totalCorrections: number;
}

interface MemoryStats {
  totalChecks: number;
  totalCorrections: number;
  patternsLearned: number;
  protectedTerms: number;
}

export function SpellcheckInterface() {
  const [draft, setDraft] = useState("");
  const [corrected, setCorrected] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Memory state
  const [memory, setMemory] = useState<ScribeMemory | null>(null);
  const [stats, setStats] = useState<MemoryStats | null>(null);
  const [showMemory, setShowMemory] = useState(false);
  const [isLoadingMemory, setIsLoadingMemory] = useState(false);
  const [newTerm, setNewTerm] = useState("");

  // Result metadata
  const [hadCorrections, setHadCorrections] = useState(false);
  const [patternsLearned, setPatternsLearned] = useState(0);

  const loadMemory = useCallback(async () => {
    setIsLoadingMemory(true);
    try {
      const res = await fetch("/api/scribe/memory");
      if (res.ok) {
        const data = await res.json();
        setMemory(data.memory);
        setStats(data.stats);
      }
    } catch (e) {
      console.error("Failed to load memory:", e);
    } finally {
      setIsLoadingMemory(false);
    }
  }, []);

  const checkSpelling = async () => {
    if (!draft.trim()) return;

    setIsChecking(true);
    setError(null);
    setCorrected("");

    try {
      const res = await fetch("/api/scribe/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: draft }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Spellcheck failed");
      }

      const data = await res.json();
      setCorrected(data.corrected);
      setHadCorrections(data.hadCorrections);
      setPatternsLearned(data.patternsLearned);

      // Refresh memory stats if panel is open
      if (showMemory) {
        loadMemory();
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsChecking(false);
    }
  };

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(corrected);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const addProtectedTerm = async () => {
    if (!newTerm.trim()) return;

    try {
      const res = await fetch("/api/scribe/memory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add", term: newTerm.trim() }),
      });

      if (res.ok) {
        const data = await res.json();
        setMemory((prev) =>
          prev ? { ...prev, protectedTerms: data.protectedTerms } : prev
        );
        setNewTerm("");
      }
    } catch (e) {
      console.error("Failed to add term:", e);
    }
  };

  const removeProtectedTerm = async (term: string) => {
    try {
      const res = await fetch("/api/scribe/memory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "remove", term }),
      });

      if (res.ok) {
        const data = await res.json();
        setMemory((prev) =>
          prev ? { ...prev, protectedTerms: data.protectedTerms } : prev
        );
      }
    } catch (e) {
      console.error("Failed to remove term:", e);
    }
  };

  const resetMemory = async () => {
    if (!confirm("Reset all learned patterns? This cannot be undone.")) return;

    try {
      const res = await fetch("/api/scribe/memory", { method: "DELETE" });
      if (res.ok) {
        loadMemory();
      }
    } catch (e) {
      console.error("Failed to reset memory:", e);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Main content area */}
      <div className="flex-1 p-6 space-y-6 overflow-auto">
        {/* Draft Input */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-[var(--tartarus-ivory)]">
            Draft Input
          </label>
          <Textarea
            placeholder="Paste or type your text here..."
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="min-h-[200px] resize-y bg-[var(--tartarus-surface)] border-[var(--tartarus-border)] text-[var(--tartarus-ivory)] placeholder:text-[var(--tartarus-ivory-faded)] focus:border-[var(--tartarus-teal)] focus:ring-[var(--tartarus-teal)]"
          />
          <div className="flex justify-between items-center">
            <span className="text-xs text-[var(--tartarus-ivory-faded)]">
              {draft.length.toLocaleString()} characters
            </span>
            <Button
              onClick={checkSpelling}
              disabled={isChecking || !draft.trim()}
              className="bg-[var(--tartarus-teal)] hover:bg-[var(--tartarus-teal-bright)] text-[var(--tartarus-deep)]"
            >
              {isChecking ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Checking...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Check Spelling
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Error display */}
        {error && (
          <div className="p-4 rounded-lg bg-[var(--tartarus-error)]/10 border border-[var(--tartarus-error)]/30 text-[var(--tartarus-error)]">
            {error}
          </div>
        )}

        {/* Corrected Output */}
        {corrected && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-[var(--tartarus-ivory)]">
                Corrected Output
              </label>
              {hadCorrections ? (
                <Badge className="bg-[var(--tartarus-teal)]/20 text-[var(--tartarus-teal)] border-[var(--tartarus-teal)]/30">
                  Corrections made
                </Badge>
              ) : (
                <Badge className="bg-[var(--tartarus-gold)]/20 text-[var(--tartarus-gold)] border-[var(--tartarus-gold)]/30">
                  No changes needed
                </Badge>
              )}
            </div>
            <div className="relative">
              <Textarea
                value={corrected}
                readOnly
                className="min-h-[200px] resize-y bg-[var(--tartarus-deep)] border-[var(--tartarus-border)] text-[var(--tartarus-ivory)] pr-12"
              />
              <Button
                size="icon"
                variant="ghost"
                onClick={copyToClipboard}
                className="absolute top-2 right-2 text-[var(--tartarus-ivory-dim)] hover:text-[var(--tartarus-ivory)] hover:bg-[var(--tartarus-surface)]"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-[var(--tartarus-teal)]" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            {patternsLearned > 0 && (
              <p className="text-xs text-[var(--tartarus-teal)]">
                +{patternsLearned} new pattern{patternsLearned > 1 ? "s" : ""}{" "}
                learned
              </p>
            )}
          </div>
        )}
      </div>

      {/* Memory Insights Panel */}
      <div className="border-t border-[var(--tartarus-border)]">
        <button
          onClick={() => {
            setShowMemory(!showMemory);
            if (!showMemory && !memory) {
              loadMemory();
            }
          }}
          className="w-full px-6 py-3 flex items-center justify-between text-[var(--tartarus-ivory-dim)] hover:text-[var(--tartarus-ivory)] hover:bg-[var(--tartarus-surface)] transition-colors"
        >
          <div className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            <span className="text-sm font-medium">Memory Insights</span>
            {stats && (
              <span className="text-xs text-[var(--tartarus-ivory-faded)]">
                {stats.patternsLearned} patterns ·{" "}
                {stats.totalChecks} checks
              </span>
            )}
          </div>
          {showMemory ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronUp className="h-4 w-4" />
          )}
        </button>

        {showMemory && (
          <div className="px-6 pb-4 space-y-4 bg-[var(--tartarus-deep)]/50">
            {isLoadingMemory ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-[var(--tartarus-teal)]" />
              </div>
            ) : memory ? (
              <>
                {/* Stats */}
                <div className="grid grid-cols-4 gap-4">
                  <div className="p-3 rounded-lg bg-[var(--tartarus-surface)] border border-[var(--tartarus-border)]">
                    <p className="text-2xl font-bold text-[var(--tartarus-teal)]">
                      {stats?.totalChecks || 0}
                    </p>
                    <p className="text-xs text-[var(--tartarus-ivory-faded)]">
                      Total Checks
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-[var(--tartarus-surface)] border border-[var(--tartarus-border)]">
                    <p className="text-2xl font-bold text-[var(--tartarus-gold)]">
                      {stats?.totalCorrections || 0}
                    </p>
                    <p className="text-xs text-[var(--tartarus-ivory-faded)]">
                      Corrections
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-[var(--tartarus-surface)] border border-[var(--tartarus-border)]">
                    <p className="text-2xl font-bold text-[var(--tartarus-ivory)]">
                      {memory.typoPatterns.length}
                    </p>
                    <p className="text-xs text-[var(--tartarus-ivory-faded)]">
                      Patterns Learned
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-[var(--tartarus-surface)] border border-[var(--tartarus-border)]">
                    <p className="text-2xl font-bold text-[var(--tartarus-ivory)]">
                      {memory.protectedTerms.length}
                    </p>
                    <p className="text-xs text-[var(--tartarus-ivory-faded)]">
                      Protected Terms
                    </p>
                  </div>
                </div>

                {/* Typo Patterns */}
                {memory.typoPatterns.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-[var(--tartarus-ivory)]">
                      Common Typos
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {memory.typoPatterns
                        .slice(0, 10)
                        .map((pattern, idx) => (
                          <Badge
                            key={idx}
                            variant="outline"
                            className="text-xs border-[var(--tartarus-border)] text-[var(--tartarus-ivory-dim)]"
                          >
                            <span className="line-through text-[var(--tartarus-error)]">
                              {pattern.mistake}
                            </span>
                            <span className="mx-1">→</span>
                            <span className="text-[var(--tartarus-teal)]">
                              {pattern.correction}
                            </span>
                            <span className="ml-1 text-[var(--tartarus-ivory-faded)]">
                              ({pattern.frequency}x)
                            </span>
                          </Badge>
                        ))}
                      {memory.typoPatterns.length > 10 && (
                        <Badge
                          variant="outline"
                          className="text-xs border-[var(--tartarus-border)] text-[var(--tartarus-ivory-faded)]"
                        >
                          +{memory.typoPatterns.length - 10} more
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                {/* Protected Terms */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-[var(--tartarus-ivory)]">
                    Protected Terms
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {memory.protectedTerms.map((term) => (
                      <Badge
                        key={term}
                        variant="outline"
                        className="text-xs border-[var(--tartarus-gold)]/30 text-[var(--tartarus-gold)] bg-[var(--tartarus-gold)]/10 group"
                      >
                        {term}
                        <button
                          onClick={() => removeProtectedTerm(term)}
                          className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2 mt-2">
                    <Input
                      placeholder="Add protected term..."
                      value={newTerm}
                      onChange={(e) => setNewTerm(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addProtectedTerm()}
                      className="h-8 text-sm bg-[var(--tartarus-surface)] border-[var(--tartarus-border)] text-[var(--tartarus-ivory)] placeholder:text-[var(--tartarus-ivory-faded)]"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={addProtectedTerm}
                      className="h-8 border-[var(--tartarus-border)] text-[var(--tartarus-ivory-dim)] hover:text-[var(--tartarus-ivory)]"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-between items-center pt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={loadMemory}
                    className="text-[var(--tartarus-ivory-dim)] hover:text-[var(--tartarus-ivory)]"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={resetMemory}
                    className="text-[var(--tartarus-error)] hover:text-[var(--tartarus-error)] hover:bg-[var(--tartarus-error)]/10"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clear Memory
                  </Button>
                </div>
              </>
            ) : (
              <p className="text-sm text-[var(--tartarus-ivory-faded)] py-4">
                No memory data available yet. Start checking text to build your
                writing memory.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
