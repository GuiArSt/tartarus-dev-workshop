"use client";

import {
  parsePromptContent,
  getRoleColorClass,
  extractPlaceholders,
  capitalizeRole,
  type ChatMessage,
  type PromptRole,
} from "@/lib/prompts/chat-format";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Code, Bot, User, AlertCircle } from "lucide-react";

interface PromptDisplayProps {
  content: string;
  className?: string;
}

/**
 * Display a prompt in chat format with role-based styling
 *
 * Renders prompts that use the standardized format:
 * ## System
 * ...
 * ## User
 * ...
 * ## Assistant
 * ...
 */
export function PromptDisplay({ content, className = "" }: PromptDisplayProps) {
  const messages = parsePromptContent(content);
  const placeholders = extractPlaceholders(content);

  // If no messages found (legacy format), fall back to raw display
  if (messages.length === 0) {
    return (
      <div className={`space-y-3 ${className}`}>
        <div className="flex items-center gap-2 text-xs text-[var(--tartarus-ivory-muted)]">
          <AlertCircle className="h-3 w-3" />
          <span>Legacy format - no role sections detected</span>
        </div>
        <pre className="rounded-lg border border-[var(--tartarus-border)] bg-[var(--tartarus-deep)] p-4 font-mono text-sm leading-relaxed break-words whitespace-pre-wrap text-[var(--tartarus-ivory)]">
          {content}
        </pre>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Placeholders indicator */}
      {placeholders.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Code className="h-3 w-3 text-[var(--tartarus-gold)]" />
          <span className="text-[var(--tartarus-ivory-muted)]">Placeholders:</span>
          {placeholders.map((placeholder) => (
            <Badge
              key={placeholder}
              variant="outline"
              className="border-[var(--tartarus-gold-dim)] font-mono text-xs text-[var(--tartarus-gold)]"
            >
              {`{{${placeholder}}}`}
            </Badge>
          ))}
        </div>
      )}

      {/* Messages */}
      <div className="space-y-3">
        {messages.map((message, index) => (
          <MessageBlock key={index} message={message} />
        ))}
      </div>
    </div>
  );
}

interface MessageBlockProps {
  message: ChatMessage;
}

function MessageBlock({ message }: MessageBlockProps) {
  const colors = getRoleColorClass(message.role);
  const Icon = getRoleIcon(message.role);

  return (
    <div className={`rounded-lg border ${colors.border} ${colors.bg} overflow-hidden`}>
      {/* Header */}
      <div className={`flex items-center gap-2 border-b px-3 py-2 ${colors.border}`}>
        <Icon className={`h-4 w-4 ${colors.text}`} />
        <span className={`text-sm font-medium ${colors.text}`}>{capitalizeRole(message.role)}</span>
      </div>

      {/* Content */}
      <div className="p-4">
        <pre className="font-mono text-sm leading-relaxed break-words whitespace-pre-wrap text-[var(--tartarus-ivory)]">
          <HighlightPlaceholders content={message.content} />
        </pre>
      </div>
    </div>
  );
}

function getRoleIcon(role: PromptRole) {
  switch (role) {
    case "system":
      return MessageSquare;
    case "user":
      return User;
    case "assistant":
      return Bot;
  }
}

interface HighlightPlaceholdersProps {
  content: string;
}

/**
 * Highlight {{placeholders}} in the content
 */
function HighlightPlaceholders({ content }: HighlightPlaceholdersProps) {
  const parts = content.split(/(\{\{\w+\}\})/g);

  return (
    <>
      {parts.map((part, index) => {
        if (part.match(/^\{\{\w+\}\}$/)) {
          return (
            <span
              key={index}
              className="inline-flex items-center rounded bg-[var(--tartarus-gold-dim)] px-1.5 py-0.5 font-semibold text-[var(--tartarus-gold)]"
            >
              {part}
            </span>
          );
        }
        return <span key={index}>{part}</span>;
      })}
    </>
  );
}

export default PromptDisplay;
