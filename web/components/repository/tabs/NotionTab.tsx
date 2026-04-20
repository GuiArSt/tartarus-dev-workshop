"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ExternalLink,
  RefreshCw,
  FileText,
  Clock,
  ChevronDown,
  ChevronUp,
  Search,
} from "lucide-react";
import type { NotionCachedPage } from "@/lib/types/repository";

interface NotionTabProps {
  loading: boolean;
  notionPages: NotionCachedPage[];
  notionLastSync: string | null;
  notionSyncing: boolean;
  syncNotionData: () => void;
}

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return "Unknown";
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function truncateContent(content: string | null, maxLen = 200): string {
  if (!content) return "";
  const cleaned = content.replace(/[#*_~`>\-|[\]()]/g, " ").replace(/\s+/g, " ").trim();
  return cleaned.length > maxLen ? cleaned.substring(0, maxLen) + "..." : cleaned;
}

export function NotionTab({
  loading,
  notionPages,
  notionLastSync,
  notionSyncing,
  syncNotionData,
}: NotionTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showAll, setShowAll] = useState(false);

  const filteredPages = useMemo(() => {
    if (!searchQuery.trim()) return notionPages;
    const q = searchQuery.toLowerCase();
    return notionPages.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.summary?.toLowerCase().includes(q) ||
        p.content?.toLowerCase().includes(q)
    );
  }, [notionPages, searchQuery]);

  const displayedPages = showAll ? filteredPages : filteredPages.slice(0, 12);
  const hasMore = filteredPages.length > 12 && !showAll;

  const stats = useMemo(
    () => ({
      total: notionPages.length,
      withSummary: notionPages.filter((p) => p.summary).length,
      archived: notionPages.filter((p) => p.archived).length,
    }),
    [notionPages]
  );

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="border-[var(--tartarus-border)] bg-[var(--tartarus-surface)]">
              <CardContent className="p-4">
                <Skeleton className="mb-2 h-4 w-20" />
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="border-[var(--tartarus-border)] bg-[var(--tartarus-surface)]">
              <CardContent className="p-4">
                <Skeleton className="mb-2 h-5 w-3/4" />
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header: Stats + Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--tartarus-teal-soft)]">
            <FileText className="h-5 w-5 text-[var(--tartarus-teal)]" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[var(--tartarus-ivory)]">
              Notion Workspace
            </h3>
            <p className="text-xs text-[var(--tartarus-ivory-muted)]">
              {stats.total} pages cached
              {notionLastSync && ` · Synced ${formatRelativeTime(notionLastSync)}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-[var(--tartarus-ivory-faded)]" />
            <input
              type="text"
              placeholder="Search pages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 w-48 rounded-md border border-[var(--tartarus-border)] bg-[var(--tartarus-deep)] pl-8 pr-3 text-xs text-[var(--tartarus-ivory)] placeholder:text-[var(--tartarus-ivory-faded)] focus:border-[var(--tartarus-teal)] focus:outline-none"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={syncNotionData}
            disabled={notionSyncing}
            className="h-8 gap-1.5 text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${notionSyncing ? "animate-spin" : ""}`} />
            {notionSyncing ? "Syncing..." : "Sync"}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="border-[var(--tartarus-border)] bg-[var(--tartarus-surface)]">
          <CardContent className="flex items-center gap-3 p-3">
            <FileText className="h-4 w-4 text-[var(--tartarus-teal)]" />
            <div>
              <p className="text-lg font-bold text-[var(--tartarus-ivory)]">{stats.total}</p>
              <p className="text-[10px] text-[var(--tartarus-ivory-muted)]">Total Pages</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-[var(--tartarus-border)] bg-[var(--tartarus-surface)]">
          <CardContent className="flex items-center gap-3 p-3">
            <FileText className="h-4 w-4 text-[var(--tartarus-gold)]" />
            <div>
              <p className="text-lg font-bold text-[var(--tartarus-ivory)]">{stats.withSummary}</p>
              <p className="text-[10px] text-[var(--tartarus-ivory-muted)]">With Summaries</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-[var(--tartarus-border)] bg-[var(--tartarus-surface)]">
          <CardContent className="flex items-center gap-3 p-3">
            <Clock className="h-4 w-4 text-[var(--tartarus-ivory-muted)]" />
            <div>
              <p className="text-lg font-bold text-[var(--tartarus-ivory)]">
                {notionLastSync ? formatRelativeTime(notionLastSync) : "Never"}
              </p>
              <p className="text-[10px] text-[var(--tartarus-ivory-muted)]">Last Sync</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Empty State */}
      {notionPages.length === 0 ? (
        <div className="py-12 text-center">
          <div className="flex flex-col items-center gap-3">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--tartarus-teal-soft)]">
              <FileText className="h-8 w-8 text-[var(--tartarus-teal)]" />
            </div>
            <p className="text-[var(--tartarus-ivory-muted)]">No Notion pages cached yet</p>
            <p className="text-sm text-[var(--tartarus-ivory-faded)]">
              Click Sync to fetch pages from your Notion workspace.
            </p>
            <Button variant="outline" size="sm" onClick={syncNotionData} disabled={notionSyncing}>
              <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${notionSyncing ? "animate-spin" : ""}`} />
              Sync Now
            </Button>
          </div>
        </div>
      ) : filteredPages.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-[var(--tartarus-ivory-muted)]">
            No pages match &ldquo;{searchQuery}&rdquo;
          </p>
        </div>
      ) : (
        <>
          {/* Pages Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {displayedPages.map((page) => (
              <Card
                key={page.id}
                className="stagger-item group relative flex flex-col overflow-hidden border-[var(--tartarus-border)] bg-[var(--tartarus-surface)] transition-[border-color,box-shadow] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:border-[var(--tartarus-teal-dim)] hover:shadow-[0_0_20px_rgba(0,206,209,0.1)]"
              >
                <div className="h-0.5 bg-gradient-to-r from-[var(--tartarus-teal)] to-[var(--tartarus-gold)]" />
                <CardHeader className="pb-2">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--tartarus-teal-soft)] text-lg">
                      {page.icon || "📄"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <CardTitle className="line-clamp-2 text-base font-semibold text-[var(--tartarus-ivory)]">
                        {page.title}
                      </CardTitle>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        {page.archived && (
                          <Badge variant="secondary" className="text-[10px]">
                            Archived
                          </Badge>
                        )}
                        {page.lastEditedByName && (
                          <span className="text-[10px] text-[var(--tartarus-ivory-faded)]">
                            {page.lastEditedByName}
                          </span>
                        )}
                        <span className="text-[10px] text-[var(--tartarus-ivory-faded)]">
                          {formatRelativeTime(page.lastEditedAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 pt-0">
                  {page.summary ? (
                    <p className="line-clamp-3 text-xs leading-relaxed text-[var(--tartarus-ivory-muted)]">
                      {page.summary}
                    </p>
                  ) : page.content ? (
                    <p className="line-clamp-3 text-xs leading-relaxed text-[var(--tartarus-ivory-faded)]">
                      {truncateContent(page.content)}
                    </p>
                  ) : (
                    <p className="text-xs italic text-[var(--tartarus-ivory-faded)]">
                      No content preview
                    </p>
                  )}
                </CardContent>
                {page.url && (
                  <div className="border-t border-[var(--tartarus-border)] px-4 py-2">
                    <a
                      href={page.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-[11px] text-[var(--tartarus-teal)] transition-colors hover:text-[var(--tartarus-teal-bright)]"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Open in Notion
                    </a>
                  </div>
                )}
              </Card>
            ))}
          </div>

          {/* Show More */}
          {hasMore && (
            <div className="flex justify-center pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAll(true)}
                className="gap-1.5 text-xs text-[var(--tartarus-ivory-muted)]"
              >
                <ChevronDown className="h-3.5 w-3.5" />
                Show all {filteredPages.length} pages
              </Button>
            </div>
          )}
          {showAll && filteredPages.length > 12 && (
            <div className="flex justify-center pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAll(false)}
                className="gap-1.5 text-xs text-[var(--tartarus-ivory-muted)]"
              >
                <ChevronUp className="h-3.5 w-3.5" />
                Show less
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
