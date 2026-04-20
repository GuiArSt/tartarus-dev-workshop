"use client";

import { memo, useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { Check, X, ChevronUp, ChevronDown, Brain } from "lucide-react";
import { cn } from "@/lib/utils";

// Memoized markdown components - inherit font size from container
// Clear hierarchy: H1 > H2 > H3 with distinct visual treatment
const markdownComponents = {
  // H1: Primary header - large, bold, gold accent, clear visual break
  h1: ({ children }: any) => (
    <h1 className="mt-5 mb-2 border-b border-[var(--tartarus-gold)]/30 pb-1 text-[1.4em] font-bold text-[var(--tartarus-ivory)]">
      {children}
    </h1>
  ),
  // H2: Section header - medium size, teal accent with subtle underline
  h2: ({ children }: any) => (
    <h2 className="mt-5 mb-2 border-b border-[var(--tartarus-teal)]/20 pb-1 text-[1.25em] font-semibold text-[var(--tartarus-teal)]">
      {children}
    </h2>
  ),
  // H3: Subsection - smaller, muted teal, no underline
  h3: ({ children }: any) => (
    <h3 className="mt-4 mb-1.5 text-[1.1em] font-medium text-[var(--tartarus-teal-dim)]">
      {children}
    </h3>
  ),
  // H4-H6: Minor headers
  h4: ({ children }: any) => (
    <h4 className="mt-2 mb-0.5 font-semibold text-[var(--tartarus-ivory)]">{children}</h4>
  ),
  h5: ({ children }: any) => (
    <h5 className="mt-2 mb-0.5 font-medium text-[var(--tartarus-ivory-dim)]">{children}</h5>
  ),
  h6: ({ children }: any) => (
    <h6 className="mt-2 mb-0.5 text-[0.9em] font-medium text-[var(--tartarus-ivory-muted)]">
      {children}
    </h6>
  ),
  p: ({ children }: any) => (
    <p className="mb-3 break-words leading-relaxed [overflow-wrap:anywhere] text-[var(--tartarus-ivory-dim)]">
      {children}
    </p>
  ),
  ul: ({ children }: any) => (
    <ul className="mt-2 mb-3 ml-4 list-outside list-disc space-y-1.5 text-[var(--tartarus-ivory-dim)] md:ml-6">
      {children}
    </ul>
  ),
  ol: ({ children }: any) => (
    <ol className="mt-2 mb-3 ml-4 list-outside list-decimal space-y-2 text-[var(--tartarus-ivory-dim)] md:ml-6">
      {children}
    </ol>
  ),
  li: ({ children }: any) => (
    <li className="pl-1.5 break-words leading-relaxed [overflow-wrap:anywhere] marker:text-[var(--tartarus-teal)]">
      {children}
    </li>
  ),
  pre: ({ children }: any) => (
    <pre className="my-3 overflow-x-auto rounded-lg border border-[var(--tartarus-border)] bg-[var(--tartarus-deep)] p-4">
      {children}
    </pre>
  ),
  code: ({ children, className }: any) => {
    const isInline = !className;
    return isInline ? (
      <code className="rounded bg-[var(--tartarus-deep)] px-1.5 py-0.5 font-mono text-[0.85em] break-all text-[var(--tartarus-teal)]">
        {children}
      </code>
    ) : (
      <code
        className={cn(
          "block font-mono text-[0.9em] leading-relaxed whitespace-pre-wrap text-[var(--tartarus-teal)]",
          className
        )}
      >
        {children}
      </code>
    );
  },
  blockquote: ({ children }: any) => (
    <blockquote className="my-5 ml-0 rounded-r-md border-l-3 border-[var(--tartarus-teal)]/60 bg-[var(--tartarus-teal-soft)] py-3 pr-4 pl-4 break-words [overflow-wrap:anywhere] text-[var(--tartarus-ivory-muted)] italic md:ml-2 md:pl-6 [&>p]:mb-0 [&>p]:py-1">
      {children}
    </blockquote>
  ),
  // HR: Kronus uses --- heavily - breathing room between sections
  hr: () => <div className="my-4" />,
  strong: ({ children }: any) => (
    <strong className="font-semibold text-[var(--tartarus-ivory)]">{children}</strong>
  ),
  // em: Inline italic, NOT block - for emphasis within text
  em: ({ children }: any) => (
    <em className="text-[var(--tartarus-ivory-muted)] italic">{children}</em>
  ),
  a: ({ children, href }: any) => (
    <a
      href={href}
      className="text-[var(--tartarus-teal)] underline underline-offset-2 hover:text-[var(--tartarus-gold)]"
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
    </a>
  ),
  table: ({ children }: any) => <table className="my-2 w-full border-collapse">{children}</table>,
  th: ({ children }: any) => (
    <th className="border border-[var(--tartarus-border)] bg-[var(--tartarus-deep)] px-2 py-1.5 text-left font-semibold text-[var(--tartarus-ivory)]">
      {children}
    </th>
  ),
  td: ({ children }: any) => (
    <td className="border border-[var(--tartarus-border)] px-2 py-1.5 text-[var(--tartarus-ivory-dim)]">
      {children}
    </td>
  ),
  // Images - render inline images from media assets
  img: ({ src, alt }: any) => (
    <span className="my-3 block">
      <img
        src={src}
        alt={alt || "Image"}
        className="h-auto max-w-full rounded-lg border border-[var(--tartarus-border)] shadow-lg"
        style={{ maxHeight: "400px", objectFit: "contain" }}
        loading="lazy"
      />
      {alt && (
        <span className="mt-1 block text-xs text-[var(--tartarus-ivory-muted)] italic">{alt}</span>
      )}
    </span>
  ),
};

// Upgrade single-dollar LaTeX ($\lambda$) to double-dollar ($$\lambda$$)
// so remarkMath renders it, while keeping singleDollarTextMath:false to protect currency ($400,000)
function upgradeSingleDollarLatex(text: string): string {
  // Match $...$ where content contains LaTeX indicators (\ ^ _ { })
  return text.replace(/\$([^$]*?[\\^_{}][^$]*?)\$/g, '$$$$$1$$$$');
}

// Detect any XML-like tags that Kronus might use for persona/creative formatting
const XML_TAG_REGEX = /<([A-Z][A-Za-z0-9 _:\-]*?)>([\s\S]*?)<\/\1>/g;

// Color palette for dynamically detected tags - cycles through these
const TAG_COLORS = [
  { color: "var(--tartarus-gold)", bg: "rgba(212, 175, 55, 0.1)" },
  { color: "var(--tartarus-teal)", bg: "rgba(0, 128, 128, 0.1)" },
  { color: "var(--tartarus-ivory-muted)", bg: "rgba(30, 30, 35, 0.5)" },
  { color: "#a78bfa", bg: "rgba(167, 139, 250, 0.1)" },
  { color: "#f472b6", bg: "rgba(244, 114, 182, 0.1)" },
];

// Get consistent color for a tag name (same tag always gets same color)
function getTagColor(tagName: string): { color: string; bg: string } {
  let hash = 0;
  for (let i = 0; i < tagName.length; i++) {
    hash = (hash << 5) - hash + tagName.charCodeAt(i);
    hash = hash & hash;
  }
  return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length];
}

// Transform any XML-like persona tags into styled blocks
function processKronusTags(text: string): React.ReactNode[] {
  const elements: React.ReactNode[] = [];
  let lastIndex = 0;
  let keyIndex = 0;
  let match;

  XML_TAG_REGEX.lastIndex = 0;

  while ((match = XML_TAG_REGEX.exec(text)) !== null) {
    const [fullMatch, tagName, content] = match;
    const { color, bg } = getTagColor(tagName);

    if (match.index > lastIndex) {
      const beforeText = text.slice(lastIndex, match.index);
      if (beforeText.trim()) {
        elements.push(
          <div key={`md-${keyIndex++}`} className="kronus-content">
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkBreaks, [remarkMath, { singleDollarTextMath: false }]]}
              rehypePlugins={[rehypeKatex]}
              components={markdownComponents}
            >
              {upgradeSingleDollarLatex(beforeText)}
            </ReactMarkdown>
          </div>
        );
      }
    }

    elements.push(
      <div
        key={`tag-${keyIndex++}`}
        className="my-4 rounded-lg border-l-4 p-4"
        style={{ borderColor: color, backgroundColor: bg }}
      >
        <div
          className="mb-2 flex items-center gap-2 text-sm font-semibold tracking-wide uppercase"
          style={{ color }}
        >
          <span className="opacity-70">✦</span>
          <span>{tagName}</span>
        </div>
        <div className="text-[var(--tartarus-ivory-dim)] italic">
          <div className="kronus-content">
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkBreaks, [remarkMath, { singleDollarTextMath: false }]]}
              rehypePlugins={[rehypeKatex]}
              components={markdownComponents}
            >
              {upgradeSingleDollarLatex(content.trim())}
            </ReactMarkdown>
          </div>
        </div>
      </div>
    );

    lastIndex = match.index + fullMatch.length;
  }

  if (lastIndex < text.length) {
    const afterText = text.slice(lastIndex);
    if (afterText.trim()) {
      elements.push(
        <div key={`md-${keyIndex++}`} className="kronus-content">
          <ReactMarkdown
            remarkPlugins={[remarkGfm, remarkBreaks, [remarkMath, { singleDollarTextMath: false }]]}
            rehypePlugins={[rehypeKatex]}
            components={markdownComponents}
          >
            {upgradeSingleDollarLatex(afterText)}
          </ReactMarkdown>
        </div>
      );
    }
  }

  return elements.length > 0
    ? elements
    : [
        <div key="fallback" className="kronus-content">
          <ReactMarkdown
            remarkPlugins={[remarkGfm, remarkBreaks, [remarkMath, { singleDollarTextMath: false }]]}
            rehypePlugins={[rehypeKatex]}
            components={markdownComponents}
          >
            {upgradeSingleDollarLatex(text)}
          </ReactMarkdown>
        </div>,
      ];
}

// Memoized markdown renderer for completed messages
export const MemoizedMarkdown = memo(function MemoizedMarkdown({ text }: { text: string }) {
  const processed = upgradeSingleDollarLatex(text);
  const hasXmlTags = XML_TAG_REGEX.test(text);
  XML_TAG_REGEX.lastIndex = 0;

  if (hasXmlTags) {
    return <div className="kronus-content">{processKronusTags(text)}</div>;
  }

  return (
    <div className="kronus-content">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks, [remarkMath, { singleDollarTextMath: false }]]}
        rehypePlugins={[rehypeKatex]}
        components={markdownComponents}
      >
        {processed}
      </ReactMarkdown>
    </div>
  );
});

// Simple streaming text renderer (no markdown parsing during streaming)
export const StreamingText = memo(function StreamingText({ text }: { text: string }) {
  return <div className="whitespace-pre-wrap text-[var(--tartarus-ivory-dim)]">{text}</div>;
});

// Detect if text contains a confirmation request pattern
export function detectConfirmationRequest(text: string): {
  isConfirmation: boolean;
  proposedChanges?: string;
} {
  const confirmPatterns = [
    /\*\*Accept (?:these changes|this change)\?\*\*/i,
    /\*\*(?:Ready to |Should I )(?:create|update|save|edit|modify)\??\*\*/i,
    /(?:confirm|approve|proceed)\?\s*$/i,
    /\[Yes\/No\]/i,
  ];

  const isConfirmation = confirmPatterns.some((pattern) => pattern.test(text));

  let proposedChanges: string | undefined;
  const changesMatch = text.match(
    /📝\s*\*\*Proposed Changes[^*]*\*\*[:\s]*([\s\S]*?)(?:\*\*Accept|$)/i
  );
  if (changesMatch) {
    proposedChanges = changesMatch[1].trim();
  }

  return { isConfirmation, proposedChanges };
}

// Confirmation buttons component
export const ConfirmationButtons = memo(function ConfirmationButtons({
  onConfirm,
  onReject,
  onReview,
  proposedChanges,
  disabled,
}: {
  onConfirm: () => void;
  onReject: () => void;
  onReview?: () => void;
  proposedChanges?: string;
  disabled?: boolean;
}) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className="mt-4 rounded-lg border border-[var(--tartarus-border)] bg-[var(--tartarus-surface)] p-3">
      <div className="flex items-center gap-3">
        <button
          onClick={onConfirm}
          disabled={disabled}
          className="flex items-center gap-2 rounded-lg bg-[var(--tartarus-teal)] px-4 py-2 font-medium text-white transition-colors hover:bg-[var(--tartarus-teal)]/80 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Check className="h-4 w-4" />
          Yes, proceed
        </button>
        <button
          onClick={onReject}
          disabled={disabled}
          className="flex items-center gap-2 rounded-lg bg-[var(--tartarus-error)]/20 px-4 py-2 font-medium text-[var(--tartarus-error)] transition-colors hover:bg-[var(--tartarus-error)]/30 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <X className="h-4 w-4" />
          No, cancel
        </button>
        {proposedChanges && (
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center gap-2 rounded-lg bg-[var(--tartarus-gold)]/20 px-4 py-2 font-medium text-[var(--tartarus-gold)] transition-colors hover:bg-[var(--tartarus-gold)]/30"
          >
            {showDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            {showDetails ? "Hide details" : "Review changes"}
          </button>
        )}
      </div>
      {showDetails && proposedChanges && (
        <div className="mt-3 rounded border border-[var(--tartarus-border)] bg-[var(--tartarus-deep)] p-3 text-sm">
          <pre className="font-mono whitespace-pre-wrap text-[var(--tartarus-ivory-dim)]">
            {proposedChanges}
          </pre>
        </div>
      )}
    </div>
  );
});

// Thinking/Reasoning display component - shows model's thinking process
export const ThinkingDisplay = memo(function ThinkingDisplay({
  reasoning,
  isStreaming,
}: {
  reasoning: string;
  isStreaming: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(true);

  useEffect(() => {
    if (!isStreaming && reasoning) {
      const timer = setTimeout(() => setIsExpanded(false), 500);
      return () => clearTimeout(timer);
    }
  }, [isStreaming, reasoning]);

  if (!reasoning) return null;

  return (
    <div className="mb-3">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-[background-color,color] duration-150",
          isStreaming
            ? "animate-pulse bg-[var(--tartarus-purple)]/20 text-[var(--tartarus-purple)]"
            : "bg-[var(--tartarus-surface)] text-[var(--tartarus-ivory-muted)] hover:bg-[var(--tartarus-surface)]/80"
        )}
      >
        <Brain className="h-4 w-4" />
        <span>{isStreaming ? "Thinking..." : "View thinking"}</span>
        {isExpanded ? (
          <ChevronUp className="ml-1 h-3 w-3" />
        ) : (
          <ChevronDown className="ml-1 h-3 w-3" />
        )}
      </button>
      {isExpanded && (
        <div
          className={cn(
            "mt-2 max-h-[300px] overflow-x-auto overflow-y-auto rounded-lg border p-3 font-mono text-sm whitespace-pre-wrap",
            isStreaming
              ? "border-[var(--tartarus-purple)]/30 bg-[var(--tartarus-purple)]/5 text-[var(--tartarus-ivory-dim)]"
              : "border-[var(--tartarus-border)] bg-[var(--tartarus-deep)] text-[var(--tartarus-ivory-muted)]"
          )}
        >
          {reasoning}
          {isStreaming && (
            <span className="ml-1 inline-block h-4 w-2 animate-pulse bg-[var(--tartarus-purple)]" />
          )}
        </div>
      )}
    </div>
  );
});
