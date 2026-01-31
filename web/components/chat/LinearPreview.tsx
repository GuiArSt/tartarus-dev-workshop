"use client";

import { memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import { AlertCircle, Calendar, Flag, FolderKanban, User, FileText } from "lucide-react";

// Tartarus-themed colors for Linear previews
const COLORS = {
  bg: "var(--tartarus-surface)",
  surface: "var(--tartarus-deep)",
  border: "var(--tartarus-border)",
  text: "var(--tartarus-ivory)",
  muted: "var(--tartarus-ivory-muted)",
  // Using Tartarus palette instead of Linear purple
  accent: "var(--tartarus-teal)",
  accentDim: "var(--tartarus-teal-dim)",
  blue: "var(--tartarus-teal)",
  green: "var(--tartarus-success)",
  yellow: "var(--tartarus-warning)",
  orange: "var(--tartarus-warning)",
  red: "var(--tartarus-error)",
};

// Priority colors and labels (Linear style)
const PRIORITY_CONFIG: Record<number, { label: string; color: string; icon: string }> = {
  0: { label: "No priority", color: COLORS.muted, icon: "○" },
  1: { label: "Urgent", color: COLORS.red, icon: "🔴" },
  2: { label: "High", color: COLORS.orange, icon: "🟠" },
  3: { label: "Medium", color: COLORS.yellow, icon: "🟡" },
  4: { label: "Low", color: COLORS.green, icon: "🟢" },
};

interface LinearIssuePreviewProps {
  title: string;
  description?: string;
  priority?: number;
  teamId?: string;
  projectId?: string;
  assigneeId?: string;
}

interface LinearProjectPreviewProps {
  name: string;
  description?: string;
  content?: string;
  teamIds?: string[];
  leadId?: string;
  targetDate?: string;
  startDate?: string;
}

// Markdown components for Linear-style rendering
const linearMarkdownComponents = {
  h1: ({ children }: any) => (
    <h1 className="mt-4 mb-2 border-b border-white/10 pb-2 text-xl font-semibold text-white">
      {children}
    </h1>
  ),
  h2: ({ children }: any) => (
    <h2 className="mt-4 mb-2 text-lg font-semibold text-white/90">{children}</h2>
  ),
  h3: ({ children }: any) => (
    <h3 className="mt-3 mb-1 text-base font-semibold text-white/80">{children}</h3>
  ),
  p: ({ children }: any) => <p className="my-2 leading-relaxed text-white/70">{children}</p>,
  ul: ({ children }: any) => (
    <ul className="my-2 ml-4 list-disc space-y-1 text-white/70">{children}</ul>
  ),
  ol: ({ children }: any) => (
    <ol className="my-2 ml-4 list-decimal space-y-1 text-white/70">{children}</ol>
  ),
  li: ({ children }: any) => <li className="text-white/70">{children}</li>,
  code: ({ inline, children }: any) =>
    inline ? (
      <code className="rounded bg-[var(--tartarus-elevated)] px-1.5 py-0.5 font-mono text-sm text-[var(--tartarus-teal)]">
        {children}
      </code>
    ) : (
      <code className="block overflow-x-auto rounded bg-[var(--tartarus-void)] p-3 font-mono text-sm text-[var(--tartarus-ivory-dim)]">
        {children}
      </code>
    ),
  pre: ({ children }: any) => (
    <pre className="my-3 overflow-x-auto rounded-lg bg-[var(--tartarus-void)]">{children}</pre>
  ),
  blockquote: ({ children }: any) => (
    <blockquote className="my-3 border-l-2 border-[var(--tartarus-teal-dim)] pl-4 text-[var(--tartarus-ivory-muted)] italic">
      {children}
    </blockquote>
  ),
  a: ({ href, children }: any) => (
    <a
      href={href}
      className="text-[var(--tartarus-teal)] underline underline-offset-2 hover:text-[var(--tartarus-gold)]"
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
    </a>
  ),
  img: ({ src, alt }: any) => (
    <div className="my-3">
      <img
        src={src}
        alt={alt || "Image"}
        className="max-w-full rounded-lg border border-white/10"
        style={{ maxHeight: "300px", objectFit: "contain" }}
      />
      {alt && <p className="mt-1 text-xs text-white/40">{alt}</p>}
    </div>
  ),
  hr: () => <hr className="my-4 border-white/10" />,
  table: ({ children }: any) => (
    <div className="my-3 overflow-x-auto">
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  ),
  th: ({ children }: any) => (
    <th className="border border-white/10 bg-white/5 px-3 py-2 text-left font-medium text-white/80">
      {children}
    </th>
  ),
  td: ({ children }: any) => (
    <td className="border border-white/10 px-3 py-2 text-white/70">{children}</td>
  ),
};

/**
 * Linear Issue Preview - renders an issue like Linear would display it
 */
export const LinearIssuePreview = memo(function LinearIssuePreview({
  title,
  description,
  priority,
  teamId,
  projectId,
  assigneeId,
}: LinearIssuePreviewProps) {
  const priorityConfig = PRIORITY_CONFIG[priority ?? 0];

  return (
    <div
      className="overflow-hidden rounded-lg"
      style={{ backgroundColor: COLORS.bg, border: `1px solid ${COLORS.border}` }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-3"
        style={{ backgroundColor: COLORS.surface, borderBottom: `1px solid ${COLORS.border}` }}
      >
        <div className="flex h-6 w-6 items-center justify-center rounded bg-[var(--tartarus-teal-soft)]">
          <AlertCircle className="h-4 w-4 text-[var(--tartarus-teal)]" />
        </div>
        <span className="text-xs font-medium tracking-wide text-white/40 uppercase">
          New Issue Preview
        </span>
      </div>

      {/* Content */}
      <div className="space-y-4 p-4">
        {/* Title */}
        <h2 className="text-lg font-semibold text-white">{title}</h2>

        {/* Metadata row */}
        <div className="flex flex-wrap gap-3 text-sm">
          {/* Priority badge */}
          <div
            className="flex items-center gap-1.5 rounded px-2 py-1"
            style={{ backgroundColor: `${priorityConfig.color}20` }}
          >
            <span>{priorityConfig.icon}</span>
            <span style={{ color: priorityConfig.color }}>{priorityConfig.label}</span>
          </div>

          {/* Team */}
          {teamId && (
            <div className="flex items-center gap-1.5 rounded bg-white/5 px-2 py-1 text-white/60">
              <FolderKanban className="h-3.5 w-3.5" />
              <span className="font-mono text-xs">{teamId.substring(0, 8)}...</span>
            </div>
          )}

          {/* Project */}
          {projectId && (
            <div className="flex items-center gap-1.5 rounded bg-[var(--tartarus-teal-soft)] px-2 py-1 text-[var(--tartarus-teal)]">
              <FileText className="h-3.5 w-3.5" />
              <span className="font-mono text-xs">{projectId.substring(0, 8)}...</span>
            </div>
          )}

          {/* Assignee */}
          {assigneeId && (
            <div className="flex items-center gap-1.5 rounded bg-white/5 px-2 py-1 text-white/60">
              <User className="h-3.5 w-3.5" />
              <span className="font-mono text-xs">{assigneeId.substring(0, 8)}...</span>
            </div>
          )}
        </div>

        {/* Description */}
        {description && (
          <div className="border-t border-white/10 pt-3">
            <p className="mb-2 text-xs font-medium tracking-wide text-white/40 uppercase">
              Description
            </p>
            <div className="prose prose-invert prose-sm max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={linearMarkdownComponents}>
                {description}
              </ReactMarkdown>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

/**
 * Linear Project Preview - renders a project like Linear would display it
 */
export const LinearProjectPreview = memo(function LinearProjectPreview({
  name,
  description,
  content,
  teamIds,
  leadId,
  targetDate,
  startDate,
}: LinearProjectPreviewProps) {
  return (
    <div
      className="overflow-hidden rounded-lg"
      style={{ backgroundColor: COLORS.bg, border: `1px solid ${COLORS.border}` }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-3"
        style={{ backgroundColor: COLORS.surface, borderBottom: `1px solid ${COLORS.border}` }}
      >
        <div className="flex h-6 w-6 items-center justify-center rounded bg-[var(--tartarus-teal-soft)]">
          <FolderKanban className="h-4 w-4 text-[var(--tartarus-teal)]" />
        </div>
        <span className="text-xs font-medium tracking-wide text-white/40 uppercase">
          New Project Preview
        </span>
      </div>

      {/* Content */}
      <div className="space-y-4 p-4">
        {/* Name */}
        <h2 className="text-lg font-semibold text-white">{name}</h2>

        {/* Metadata row */}
        <div className="flex flex-wrap gap-3 text-sm">
          {/* Teams */}
          {teamIds && teamIds.length > 0 && (
            <div className="flex items-center gap-1.5 rounded bg-white/5 px-2 py-1 text-white/60">
              <FolderKanban className="h-3.5 w-3.5" />
              <span>
                {teamIds.length} team{teamIds.length > 1 ? "s" : ""}
              </span>
            </div>
          )}

          {/* Lead */}
          {leadId && (
            <div className="flex items-center gap-1.5 rounded bg-white/5 px-2 py-1 text-white/60">
              <User className="h-3.5 w-3.5" />
              <span className="font-mono text-xs">{leadId.substring(0, 8)}...</span>
            </div>
          )}

          {/* Start date */}
          {startDate && (
            <div className="flex items-center gap-1.5 rounded bg-[var(--tartarus-success-soft)] px-2 py-1 text-[var(--tartarus-success)]">
              <Calendar className="h-3.5 w-3.5" />
              <span>Start: {startDate}</span>
            </div>
          )}

          {/* Target date */}
          {targetDate && (
            <div className="flex items-center gap-1.5 rounded bg-[var(--tartarus-warning-soft)] px-2 py-1 text-[var(--tartarus-warning)]">
              <Flag className="h-3.5 w-3.5" />
              <span>Target: {targetDate}</span>
            </div>
          )}
        </div>

        {/* Description (plain text) */}
        {description && (
          <div className="border-t border-white/10 pt-3">
            <p className="mb-2 text-xs font-medium tracking-wide text-white/40 uppercase">
              Description
            </p>
            <p className="text-sm text-white/70">{description}</p>
          </div>
        )}

        {/* Content (rich text/markdown) */}
        {content && (
          <div className="border-t border-white/10 pt-3">
            <p className="mb-2 text-xs font-medium tracking-wide text-white/40 uppercase">
              Content
            </p>
            <div className="prose prose-invert prose-sm max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={linearMarkdownComponents}>
                {content}
              </ReactMarkdown>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

/**
 * Check if a tool is a Linear tool that should use rich preview
 */
export function isLinearTool(toolName: string): boolean {
  return toolName.startsWith("linear_");
}

/**
 * Get the appropriate Linear preview component for a tool
 */
export function getLinearPreview(
  toolName: string,
  args: Record<string, any>
): React.ReactNode | null {
  switch (toolName) {
    case "linear_create_issue":
    case "linear_update_issue":
      return (
        <LinearIssuePreview
          title={args.title || "(No title)"}
          description={args.description}
          priority={args.priority}
          teamId={args.teamId}
          projectId={args.projectId}
          assigneeId={args.assigneeId}
        />
      );
    case "linear_create_project":
    case "linear_update_project":
      return (
        <LinearProjectPreview
          name={args.name || "(No name)"}
          description={args.description}
          content={args.content}
          teamIds={args.teamIds}
          leadId={args.leadId}
          targetDate={args.targetDate}
          startDate={args.startDate}
        />
      );
    default:
      return null;
  }
}
