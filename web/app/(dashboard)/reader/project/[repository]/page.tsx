"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  GitBranch,
  Calendar,
  Paperclip,
  Sparkles,
  ChevronRight,
  Layers,
} from "lucide-react";
import { formatDateShort } from "@/lib/utils";

interface JournalEntry {
  id: number;
  commit_hash: string;
  repository: string;
  branch: string;
  author: string;
  date: string;
  why: string;
  summary: string | null;
  kronus_wisdom: string | null;
  technologies: string;
  attachment_count: number;
}

const PAGE_SIZE = 100;

export default function ProjectEntriesPage() {
  const params = useParams();
  const router = useRouter();
  const raw = params.repository;
  const repositoryParam = typeof raw === "string" ? decodeURIComponent(raw) : "";

  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  const loadPage = useCallback(
    async (nextOffset: number, append: boolean) => {
      if (!repositoryParam) return;
      setLoading(true);
      try {
        const sp = new URLSearchParams({
          repository: repositoryParam,
          limit: String(PAGE_SIZE),
          offset: String(nextOffset),
        });
        const response = await fetch(`/api/entries?${sp}`);
        const data = await response.json();
        const batch: JournalEntry[] = data.entries || [];
        setTotal(typeof data.total === "number" ? data.total : batch.length);
        setHasMore(!!data.has_more);
        setOffset(nextOffset + batch.length);
        setEntries((prev) => (append ? [...prev, ...batch] : batch));
      } catch (e) {
        console.error("Failed to load entries:", e);
      } finally {
        setLoading(false);
      }
    },
    [repositoryParam]
  );

  useEffect(() => {
    setOffset(0);
    loadPage(0, false);
  }, [repositoryParam, loadPage]);

  const editEntryWithKronus = (entry: JournalEntry, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const context = `I want to UPDATE this journal entry. Please help me modify it:

**Commit Hash:** ${entry.commit_hash}
**Repository:** ${entry.repository}/${entry.branch}
**Date:** ${formatDateShort(entry.date)}

**Why:**
${entry.why}

What changes would you like to make? You can update any field using the journal_edit_entry tool.`;

    sessionStorage.setItem("kronusPrefill", context);
    router.push("/chat");
  };

  return (
    <div className="flex h-full flex-col bg-[var(--tartarus-void)]">
      <header className="flex min-h-14 flex-col gap-2 border-b border-[var(--tartarus-border)] px-3 py-2 md:flex-row md:items-center md:justify-between md:px-6 md:py-3">
        <div className="flex min-w-0 items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="shrink-0 text-[var(--tartarus-teal)] hover:bg-[var(--tartarus-teal-soft)]"
            asChild
          >
            <Link href="/reader">
              <ArrowLeft className="mr-1 h-4 w-4" />
              Journal
            </Link>
          </Button>
          <Layers className="h-5 w-5 shrink-0 text-[var(--tartarus-teal)]" />
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold capitalize text-[var(--tartarus-ivory)]">
              {repositoryParam || "Project"}
            </h1>
            <p className="text-xs text-[var(--tartarus-ivory-muted)]">
              {total > 0 ? `${total} journal ${total === 1 ? "entry" : "entries"}` : " "}
            </p>
          </div>
        </div>
      </header>

      <ScrollArea className="flex-1">
        <div className="space-y-2 p-3 md:p-6">
          {loading && entries.length === 0 ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full bg-[var(--tartarus-elevated)]" />
              ))}
            </div>
          ) : entries.length === 0 ? (
            <div className="py-16 text-center text-sm text-[var(--tartarus-ivory-muted)]">
              No entries for this project yet.
            </div>
          ) : (
            <>
              {entries.map((entry) => (
                <Link key={entry.id} href={`/reader/${entry.commit_hash}`}>
                  <div className="group mb-2 flex cursor-pointer items-start gap-3 rounded-lg border border-[var(--tartarus-border)] bg-[var(--tartarus-elevated)] p-3 transition-colors hover:bg-[var(--tartarus-deep)]">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--tartarus-ivory-muted)]">
                        <span className="font-mono">{entry.commit_hash.substring(0, 7)}</span>
                        <span className="flex items-center gap-1">
                          <GitBranch className="h-3 w-3" />
                          {entry.branch}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDateShort(entry.date)}
                        </span>
                        {entry.attachment_count > 0 && (
                          <span className="flex items-center gap-1">
                            <Paperclip className="h-3 w-3" />
                            {entry.attachment_count}
                          </span>
                        )}
                      </div>
                      {entry.summary ? (
                        <p className="mt-1 line-clamp-3 text-sm italic text-[var(--tartarus-ivory)]">
                          {entry.summary}
                        </p>
                      ) : (
                        <p className="mt-1 line-clamp-3 text-sm text-[var(--tartarus-ivory)]">
                          {entry.why.replace(/[#*`]/g, "").substring(0, 220)}
                          {entry.why.length > 220 ? "…" : ""}
                        </p>
                      )}
                      {entry.kronus_wisdom && (
                        <div className="mt-1 flex items-center gap-1 text-xs text-[var(--tartarus-teal)]">
                          <Sparkles className="h-3 w-3 shrink-0" />
                          <span className="line-clamp-2 italic">{entry.kronus_wisdom}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs text-[var(--tartarus-gold)] hover:bg-[var(--tartarus-gold-soft)]"
                        onClick={(e) => editEntryWithKronus(entry, e)}
                      >
                        <img
                          src="/chronus-logo.png"
                          alt="Kronus"
                          className="mr-1 h-3.5 w-3.5 rounded-full object-cover"
                        />
                        Edit
                      </Button>
                      <ChevronRight className="h-4 w-4 text-[var(--tartarus-ivory-muted)]" />
                    </div>
                  </div>
                </Link>
              ))}

              {hasMore && (
                <div className="flex justify-center pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={loading}
                    onClick={() => loadPage(offset, true)}
                    className="border-[var(--tartarus-border)] text-[var(--tartarus-teal)]"
                  >
                    {loading ? "Loading…" : "Load more"}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
