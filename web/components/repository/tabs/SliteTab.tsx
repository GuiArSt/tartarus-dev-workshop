"use client";

import { useState, useMemo, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ExternalLink,
  RefreshCw,
  BookOpen,
  CheckCircle,
  AlertTriangle,
  ChevronRight,
  ChevronDown,
  FolderOpen,
  FileText,
  User,
  Users,
  X,
} from "lucide-react";
import type { SliteCachedNote } from "@/lib/types/repository";

interface SliteTabProps {
  loading: boolean;
  sliteNotes: SliteCachedNote[];
  sliteLastSync: string | null;
  sliteSyncing: boolean;
  syncSliteData: () => void;
  currentUserId: string | null;
}

type OwnerFilter = "all" | "mine" | "others";

interface TreeNode {
  note: SliteCachedNote;
  children: TreeNode[];
}

function buildTree(notes: SliteCachedNote[]): TreeNode[] {
  const noteIds = new Set<string>();
  for (const note of notes) {
    noteIds.add(note.id);
  }

  const childrenMap = new Map<string, SliteCachedNote[]>();
  const rootNotes: SliteCachedNote[] = [];

  for (const note of notes) {
    if (note.parentNoteId && noteIds.has(note.parentNoteId)) {
      const siblings = childrenMap.get(note.parentNoteId) || [];
      siblings.push(note);
      childrenMap.set(note.parentNoteId, siblings);
    } else {
      rootNotes.push(note);
    }
  }

  function buildNode(note: SliteCachedNote): TreeNode {
    const children = (childrenMap.get(note.id) || [])
      .sort((a, b) => {
        const aHasChildren = childrenMap.has(a.id);
        const bHasChildren = childrenMap.has(b.id);
        if (aHasChildren !== bHasChildren) return aHasChildren ? -1 : 1;
        return new Date(b.lastEditedAt || 0).getTime() - new Date(a.lastEditedAt || 0).getTime();
      })
      .map(buildNode);
    return { note, children };
  }

  return rootNotes
    .sort((a, b) => {
      const aHasChildren = childrenMap.has(a.id);
      const bHasChildren = childrenMap.has(b.id);
      if (aHasChildren !== bHasChildren) return aHasChildren ? -1 : 1;
      return new Date(b.lastEditedAt || 0).getTime() - new Date(a.lastEditedAt || 0).getTime();
    })
    .map(buildNode);
}

function NoteRow({
  node,
  depth,
  expanded,
  toggleExpand,
  myOwnerId,
  selectedNoteId,
  onSelectNote,
}: {
  node: TreeNode;
  depth: number;
  expanded: Set<string>;
  toggleExpand: (id: string) => void;
  myOwnerId: string | null;
  selectedNoteId: string | null;
  onSelectNote: (id: string) => void;
}) {
  const { note, children } = node;
  const hasChildren = children.length > 0;
  const isExpanded = expanded.has(note.id);
  const isMine = myOwnerId && note.ownerId === myOwnerId;
  const isSelected = selectedNoteId === note.id;

  return (
    <>
      <div
        className={`group flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 transition-colors ${
          isSelected
            ? "bg-[var(--tartarus-teal)]/10 border-l-2 border-l-[var(--tartarus-teal)]"
            : "hover:bg-[var(--tartarus-teal)]/5"
        } ${depth === 0 ? "border-b border-[var(--tartarus-border)]" : ""}`}
        style={{ paddingLeft: `${depth * 20 + 8}px` }}
        onClick={() => {
          if (hasChildren) toggleExpand(note.id);
          if (note.content) onSelectNote(note.id);
        }}
      >
        {/* Expand/collapse toggle */}
        {hasChildren ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleExpand(note.id);
            }}
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded hover:bg-[var(--tartarus-teal)]/10"
          >
            {isExpanded ? (
              <ChevronDown className="h-3.5 w-3.5 text-[var(--tartarus-teal)]" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 text-[var(--tartarus-ivory-muted)]" />
            )}
          </button>
        ) : (
          <span className="w-5 shrink-0" />
        )}

        {/* Icon */}
        {hasChildren ? (
          <FolderOpen className="h-4 w-4 shrink-0 text-[var(--tartarus-teal)]" />
        ) : (
          <FileText className={`h-4 w-4 shrink-0 ${isSelected ? "text-[var(--tartarus-teal)]" : "text-[var(--tartarus-ivory-muted)]"}`} />
        )}

        {/* Title + badges */}
        <div className="flex min-w-0 flex-1 items-center gap-1.5">
          <span className={`truncate text-sm text-[var(--tartarus-ivory)] ${hasChildren || isSelected ? "font-medium" : ""}`}>
            {note.title}
          </span>
          {hasChildren && (
            <span className="shrink-0 text-xs text-[var(--tartarus-ivory-faded)]">
              ({children.length})
            </span>
          )}
          {note.reviewState === "Verified" && (
            <CheckCircle className="h-3 w-3 shrink-0 text-green-500" />
          )}
          {note.reviewState === "Outdated" && (
            <AlertTriangle className="h-3 w-3 shrink-0 text-orange-500" />
          )}
          {isMine && (
            <User className="h-3 w-3 shrink-0 text-[var(--tartarus-teal)]" />
          )}
        </div>

        {/* Summary preview */}
        {note.summary && !hasChildren && !isSelected && (
          <span className="hidden truncate text-xs text-[var(--tartarus-ivory-faded)] lg:block lg:max-w-[300px]">
            {note.summary}
          </span>
        )}

        {/* Date */}
        {note.lastEditedAt && (
          <span className="shrink-0 text-xs text-[var(--tartarus-ivory-faded)]">
            {new Date(note.lastEditedAt).toLocaleDateString()}
          </span>
        )}

        {/* External link */}
        {note.url && (
          <a
            href={note.url}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink className="h-3.5 w-3.5 text-[var(--tartarus-ivory-muted)] hover:text-[var(--tartarus-ivory)]" />
          </a>
        )}
      </div>

      {/* Children (collapsible) */}
      {isExpanded &&
        children.map((child) => (
          <NoteRow
            key={child.note.id}
            node={child}
            depth={depth + 1}
            expanded={expanded}
            toggleExpand={toggleExpand}
            myOwnerId={myOwnerId}
            selectedNoteId={selectedNoteId}
            onSelectNote={onSelectNote}
          />
        ))}
    </>
  );
}

/** Simple markdown-ish renderer: headers, bold, lists, links, code blocks */
function NoteContent({ content }: { content: string }) {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith("```")) {
      if (inCodeBlock) {
        elements.push(
          <pre key={`code-${i}`} className="my-2 overflow-x-auto rounded bg-[var(--tartarus-void)] p-3 text-xs">
            <code>{codeLines.join("\n")}</code>
          </pre>
        );
        codeLines = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeLines.push(line);
      continue;
    }

    if (line.startsWith("# ")) {
      elements.push(<h1 key={i} className="mt-4 mb-2 text-lg font-bold text-[var(--tartarus-ivory)]">{line.slice(2)}</h1>);
    } else if (line.startsWith("## ")) {
      elements.push(<h2 key={i} className="mt-3 mb-1.5 text-base font-semibold text-[var(--tartarus-ivory)]">{line.slice(3)}</h2>);
    } else if (line.startsWith("### ")) {
      elements.push(<h3 key={i} className="mt-2 mb-1 text-sm font-semibold text-[var(--tartarus-ivory)]">{line.slice(4)}</h3>);
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      elements.push(
        <div key={i} className="ml-4 flex gap-1.5 text-sm">
          <span className="text-[var(--tartarus-ivory-faded)]">•</span>
          <span className="text-[var(--tartarus-ivory-muted)]">{line.slice(2)}</span>
        </div>
      );
    } else if (line.trim() === "") {
      elements.push(<div key={i} className="h-2" />);
    } else {
      elements.push(<p key={i} className="text-sm leading-relaxed text-[var(--tartarus-ivory-muted)]">{line}</p>);
    }
  }

  // Flush remaining code block
  if (inCodeBlock && codeLines.length > 0) {
    elements.push(
      <pre key="code-end" className="my-2 overflow-x-auto rounded bg-[var(--tartarus-void)] p-3 text-xs">
        <code>{codeLines.join("\n")}</code>
      </pre>
    );
  }

  return <div className="space-y-0">{elements}</div>;
}

export function SliteTab({
  loading,
  sliteNotes,
  sliteLastSync,
  sliteSyncing,
  syncSliteData,
  currentUserId,
}: SliteTabProps) {
  const [ownerFilter, setOwnerFilter] = useState<OwnerFilter>("all");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);

  const myOwnerId = currentUserId;

  const filteredNotes = useMemo(() => {
    if (ownerFilter === "all") return sliteNotes;
    if (ownerFilter === "mine") return sliteNotes.filter((n) => n.ownerId === myOwnerId);
    return sliteNotes.filter((n) => n.ownerId !== myOwnerId);
  }, [sliteNotes, ownerFilter, myOwnerId]);

  const tree = useMemo(() => buildTree(filteredNotes), [filteredNotes]);

  const selectedNote = useMemo(
    () => selectedNoteId ? sliteNotes.find((n) => n.id === selectedNoteId) || null : null,
    [selectedNoteId, sliteNotes]
  );

  const verified = sliteNotes.filter((n) => n.reviewState === "Verified").length;
  const withSummaries = sliteNotes.filter((n) => n.summary).length;
  const myNotes = sliteNotes.filter((n) => n.ownerId === myOwnerId).length;

  const toggleExpand = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const onSelectNote = useCallback((id: string) => {
    setSelectedNoteId((prev) => (prev === id ? null : id));
  }, []);

  const expandAll = () => {
    const allParentIds = new Set<string>();
    for (const note of filteredNotes) {
      if (filteredNotes.some((n) => n.parentNoteId === note.id)) {
        allParentIds.add(note.id);
      }
    }
    setExpanded(allParentIds);
  };

  const collapseAll = () => setExpanded(new Set());

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold text-[var(--tartarus-ivory)]">Slite Knowledge Base</h3>
          <p className="text-[var(--tartarus-ivory-muted)] text-sm">
            {sliteLastSync
              ? `Last synced: ${new Date(sliteLastSync).toLocaleString()}`
              : "Not synced yet"}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={syncSliteData}
          disabled={sliteSyncing}
          className="bg-[var(--tartarus-teal)] text-[var(--tartarus-void)] hover:bg-[var(--tartarus-teal)]/90"
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${sliteSyncing ? "animate-spin" : ""}`} />
          {sliteSyncing ? "Syncing..." : "Sync Now"}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card className="group relative overflow-hidden border-[var(--tartarus-border)] bg-[var(--tartarus-surface)] transition-[border-color,box-shadow] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:border-[var(--tartarus-teal-dim)] hover:shadow-[0_0_20px_rgba(0,206,209,0.1)]">
          <div className="h-0.5 bg-[var(--tartarus-teal)]" />
          <CardContent className="p-3">
            <div className="text-2xl font-bold text-[var(--tartarus-teal)]">{sliteNotes.length}</div>
            <div className="text-[var(--tartarus-ivory-muted)] text-xs">Total Notes</div>
          </CardContent>
        </Card>
        <Card className="group relative overflow-hidden border-[var(--tartarus-border)] bg-[var(--tartarus-surface)] transition-[border-color,box-shadow] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:border-[var(--tartarus-teal-dim)] hover:shadow-[0_0_20px_rgba(0,206,209,0.1)]">
          <div className="h-0.5 bg-[var(--tartarus-teal)]" />
          <CardContent className="p-3">
            <div className="text-2xl font-bold text-[var(--tartarus-teal)]">{myNotes}</div>
            <div className="text-[var(--tartarus-ivory-muted)] text-xs">My Notes</div>
          </CardContent>
        </Card>
        <Card className="group relative overflow-hidden border-[var(--tartarus-border)] bg-[var(--tartarus-surface)] transition-[border-color,box-shadow] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:border-[var(--tartarus-teal-dim)] hover:shadow-[0_0_20px_rgba(0,206,209,0.1)]">
          <div className="h-0.5 bg-[var(--tartarus-teal)]" />
          <CardContent className="p-3">
            <div className="text-2xl font-bold text-green-500">{verified}</div>
            <div className="text-[var(--tartarus-ivory-muted)] text-xs">Verified</div>
          </CardContent>
        </Card>
        <Card className="group relative overflow-hidden border-[var(--tartarus-border)] bg-[var(--tartarus-surface)] transition-[border-color,box-shadow] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:border-[var(--tartarus-teal-dim)] hover:shadow-[0_0_20px_rgba(0,206,209,0.1)]">
          <div className="h-0.5 bg-[var(--tartarus-teal)]" />
          <CardContent className="p-3">
            <div className="text-2xl font-bold text-[var(--tartarus-gold)]">{withSummaries}</div>
            <div className="text-[var(--tartarus-ivory-muted)] text-xs">With Summaries</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        <div className="flex rounded-md border border-[var(--tartarus-border)]">
          <button
            onClick={() => setOwnerFilter("all")}
            className={`flex items-center gap-1.5 rounded-l-md px-3 py-1.5 text-xs transition-colors ${
              ownerFilter === "all"
                ? "bg-[var(--tartarus-teal)]/10 text-[var(--tartarus-teal)] font-medium"
                : "text-[var(--tartarus-ivory-muted)] hover:bg-[var(--tartarus-surface)]"
            }`}
          >
            <Users className="h-3 w-3" />
            All ({sliteNotes.length})
          </button>
          <button
            onClick={() => setOwnerFilter("mine")}
            className={`flex items-center gap-1.5 border-x border-[var(--tartarus-border)] px-3 py-1.5 text-xs transition-colors ${
              ownerFilter === "mine"
                ? "bg-[var(--tartarus-teal)]/10 text-[var(--tartarus-teal)] font-medium"
                : "text-[var(--tartarus-ivory-muted)] hover:bg-[var(--tartarus-surface)]"
            }`}
          >
            <User className="h-3 w-3" />
            Mine ({myNotes})
          </button>
          <button
            onClick={() => setOwnerFilter("others")}
            className={`flex items-center gap-1.5 rounded-r-md px-3 py-1.5 text-xs transition-colors ${
              ownerFilter === "others"
                ? "bg-[var(--tartarus-teal)]/10 text-[var(--tartarus-teal)] font-medium"
                : "text-[var(--tartarus-ivory-muted)] hover:bg-[var(--tartarus-surface)]"
            }`}
          >
            Others ({sliteNotes.length - myNotes})
          </button>
        </div>

        <div className="ml-auto flex gap-1">
          <Button variant="ghost" size="sm" onClick={expandAll} className="text-xs h-7 text-[var(--tartarus-ivory-muted)]">
            Expand all
          </Button>
          <Button variant="ghost" size="sm" onClick={collapseAll} className="text-xs h-7 text-[var(--tartarus-ivory-muted)]">
            Collapse
          </Button>
        </div>
      </div>

      {/* Main content area */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[var(--tartarus-teal)]" />
        </div>
      ) : filteredNotes.length === 0 ? (
        <Card className="border-dashed border-[var(--tartarus-border)] bg-[var(--tartarus-surface)] p-12 text-center">
          <BookOpen className="mx-auto mb-4 h-12 w-12 text-[var(--tartarus-ivory-faded)]" />
          <p className="mb-2 text-lg font-medium text-[var(--tartarus-ivory-muted)]">
            {ownerFilter === "mine"
              ? "No notes owned by you"
              : ownerFilter === "others"
                ? "No notes from others"
                : "No cached Slite notes"}
          </p>
          {ownerFilter === "all" && (
            <>
              <p className="mb-4 text-sm text-[var(--tartarus-ivory-muted)]">
                Sync your Slite workspace to see your knowledge base here.
              </p>
              <Button
                onClick={syncSliteData}
                disabled={sliteSyncing}
                className="bg-[var(--tartarus-teal)] text-[var(--tartarus-void)] hover:bg-[var(--tartarus-teal)]/90"
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${sliteSyncing ? "animate-spin" : ""}`} />
                Sync Slite Data
              </Button>
            </>
          )}
        </Card>
      ) : (
        <div className={`grid gap-4 ${selectedNote ? "grid-cols-1 lg:grid-cols-[1fr_1fr]" : "grid-cols-1"}`}>
          {/* Tree sidebar */}
          <Card className={`group relative overflow-hidden border-[var(--tartarus-border)] bg-[var(--tartarus-surface)] transition-[border-color,box-shadow] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:border-[var(--tartarus-teal-dim)] hover:shadow-[0_0_20px_rgba(0,206,209,0.1)] ${selectedNote ? "max-h-[70vh] overflow-y-auto" : ""}`}>
            <div className="h-0.5 bg-[var(--tartarus-teal)]" />
            <CardContent className="p-2">
              {tree.map((node) => (
                <NoteRow
                  key={node.note.id}
                  node={node}
                  depth={0}
                  expanded={expanded}
                  toggleExpand={toggleExpand}
                  myOwnerId={myOwnerId}
                  selectedNoteId={selectedNoteId}
                  onSelectNote={onSelectNote}
                />
              ))}
            </CardContent>
          </Card>

          {/* Content reader panel */}
          {selectedNote && (
            <Card className="group relative max-h-[70vh] overflow-hidden overflow-y-auto border-[var(--tartarus-border)] bg-[var(--tartarus-surface)] transition-[border-color,box-shadow] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:border-[var(--tartarus-teal-dim)] hover:shadow-[0_0_20px_rgba(0,206,209,0.1)]">
              <div className="h-0.5 bg-[var(--tartarus-teal)]" />
              <CardContent className="p-4">
                {/* Note header */}
                <div className="mb-4 flex items-start justify-between gap-2">
                  <div>
                    <h2 className="text-lg font-semibold text-[var(--tartarus-ivory)]">{selectedNote.title}</h2>
                    <div className="mt-1 flex items-center gap-3 text-xs text-[var(--tartarus-ivory-faded)]">
                      {selectedNote.lastEditedAt && (
                        <span>Edited {new Date(selectedNote.lastEditedAt).toLocaleDateString()}</span>
                      )}
                      {selectedNote.reviewState && (
                        <span className={
                          selectedNote.reviewState === "Verified"
                            ? "text-green-500"
                            : selectedNote.reviewState === "Outdated"
                              ? "text-orange-500"
                              : ""
                        }>
                          {selectedNote.reviewState}
                        </span>
                      )}
                      {selectedNote.url && (
                        <a
                          href={selectedNote.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-[var(--tartarus-teal)] hover:underline"
                        >
                          Open in Slite <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedNoteId(null)}
                    className="h-7 w-7 p-0 shrink-0 text-[var(--tartarus-ivory-muted)]"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {/* Summary */}
                {selectedNote.summary && (
                  <div className="mb-4 rounded-md border border-[var(--tartarus-teal-dim)] bg-[var(--tartarus-teal)]/5 p-3">
                    <p className="text-xs font-medium text-[var(--tartarus-teal)] mb-1">AI Summary</p>
                    <p className="text-sm text-[var(--tartarus-ivory-muted)]">{selectedNote.summary}</p>
                  </div>
                )}

                {/* Content */}
                {selectedNote.content ? (
                  <NoteContent content={selectedNote.content} />
                ) : (
                  <p className="text-sm text-[var(--tartarus-ivory-muted)] italic">
                    No content cached. Re-sync to fetch content.
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
