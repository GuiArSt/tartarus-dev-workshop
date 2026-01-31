"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Brain,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Check,
  X,
  Loader2,
  MessageSquare,
  Clock,
  Zap,
} from "lucide-react";

interface KronusChat {
  id: number;
  trace_id: string;
  question: string;
  answer: string;
  question_preview: string;
  answer_preview: string;
  repository: string | null;
  depth: string;
  status: string;
  has_summary: boolean;
  summary: string | null;
  summary_updated_at: string | null;
  input_tokens: number | null;
  output_tokens: number | null;
  latency_ms: number | null;
  cost_usd: number | null;
  created_at: string;
}

interface Pagination {
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
  page: number;
  total_pages: number;
}

export default function KronusPage() {
  const [chats, setChats] = useState<KronusChat[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generatingSummary, setGeneratingSummary] = useState<number | null>(null);
  const [expandedChat, setExpandedChat] = useState<number | null>(null);

  const fetchChats = useCallback(async (offset = 0) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/kronus/chats?limit=20&offset=${offset}`);
      if (!res.ok) throw new Error("Failed to fetch chats");
      const data = await res.json();
      setChats(data.chats);
      setPagination(data.pagination);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchChats();
  }, [fetchChats]);

  const generateSummary = async (chatId: number, force = false) => {
    setGeneratingSummary(chatId);
    try {
      const res = await fetch(`/api/kronus/chats/${chatId}/summary`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to generate summary");
      }
      const data = await res.json();

      // Update the chat in state
      setChats((prev) =>
        prev.map((chat) =>
          chat.id === chatId
            ? {
                ...chat,
                has_summary: true,
                summary: data.summary,
                summary_updated_at: data.summary_updated_at,
              }
            : chat
        )
      );
    } catch (err: any) {
      console.error("Failed to generate summary:", err);
      alert(`Error: ${err.message}`);
    } finally {
      setGeneratingSummary(null);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatCost = (cost: number | null) => {
    if (!cost) return "$0.00";
    return `$${cost.toFixed(4)}`;
  };

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Brain className="h-8 w-8 text-[var(--tartarus-gold)]" />
          <div>
            <h1 className="text-2xl font-bold text-[var(--tartarus-ivory)]">Kronus Chat History</h1>
            <p className="text-sm text-[var(--tartarus-ivory-muted)]">
              View and manage Kronus oracle conversations
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchChats(pagination?.offset || 0)}
          disabled={loading}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-red-400">
          {error}
        </div>
      )}

      {loading && chats.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--tartarus-gold)]" />
        </div>
      ) : chats.length === 0 ? (
        <div className="py-20 text-center text-[var(--tartarus-ivory-muted)]">
          <MessageSquare className="mx-auto mb-4 h-12 w-12 opacity-50" />
          <p>No Kronus conversations yet</p>
        </div>
      ) : (
        <>
          {/* Stats summary */}
          {pagination && (
            <div className="mb-6 flex items-center gap-6 text-sm text-[var(--tartarus-ivory-muted)]">
              <span>Total: {pagination.total} chats</span>
              <span>
                With summary: {chats.filter((c) => c.has_summary).length}/{chats.length} on this
                page
              </span>
            </div>
          )}

          {/* Chat list */}
          <div className="space-y-4">
            {chats.map((chat) => (
              <div
                key={chat.id}
                className="overflow-hidden rounded-lg border border-[var(--tartarus-border)] bg-[var(--tartarus-deep)]"
              >
                {/* Header */}
                <div
                  className="flex cursor-pointer items-start justify-between p-4 hover:bg-[var(--tartarus-border)]/10"
                  onClick={() => setExpandedChat(expandedChat === chat.id ? null : chat.id)}
                >
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex items-center gap-2">
                      <span className="text-xs text-[var(--tartarus-ivory-muted)]">#{chat.id}</span>
                      <Badge
                        variant="outline"
                        className={
                          chat.depth === "deep"
                            ? "border-purple-500/50 text-purple-400"
                            : "border-[var(--tartarus-gold-dim)] text-[var(--tartarus-gold)]"
                        }
                      >
                        {chat.depth}
                      </Badge>
                      {chat.repository && (
                        <Badge variant="secondary" className="text-xs">
                          {chat.repository}
                        </Badge>
                      )}
                      {chat.status !== "success" && (
                        <Badge variant="destructive" className="text-xs">
                          {chat.status}
                        </Badge>
                      )}
                    </div>

                    <p className="line-clamp-2 font-medium text-[var(--tartarus-ivory)]">
                      {chat.question_preview}
                    </p>

                    <div className="mt-2 flex items-center gap-4 text-xs text-[var(--tartarus-ivory-muted)]">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDate(chat.created_at)}
                      </span>
                      {chat.latency_ms && (
                        <span className="flex items-center gap-1">
                          <Zap className="h-3 w-3" />
                          {chat.latency_ms}ms
                        </span>
                      )}
                      {chat.input_tokens && chat.output_tokens && (
                        <span>
                          {chat.input_tokens}/{chat.output_tokens} tokens
                        </span>
                      )}
                      {chat.cost_usd && <span>{formatCost(chat.cost_usd)}</span>}
                    </div>
                  </div>

                  {/* Summary status & actions */}
                  <div className="ml-4 flex items-center gap-2">
                    {chat.has_summary ? (
                      <Badge
                        variant="outline"
                        className="flex items-center gap-1 border-green-500/50 text-green-400"
                      >
                        <Check className="h-3 w-3" />
                        Summary
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="flex items-center gap-1 border-orange-500/50 text-orange-400"
                      >
                        <X className="h-3 w-3" />
                        No Summary
                      </Badge>
                    )}

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        generateSummary(chat.id, chat.has_summary);
                      }}
                      disabled={generatingSummary === chat.id || chat.status !== "success"}
                      title={chat.has_summary ? "Regenerate summary" : "Generate summary"}
                    >
                      {generatingSummary === chat.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Sparkles
                          className={`h-4 w-4 ${
                            chat.has_summary
                              ? "text-[var(--tartarus-ivory-muted)]"
                              : "text-[var(--tartarus-gold)]"
                          }`}
                        />
                      )}
                    </Button>
                  </div>
                </div>

                {/* Expanded content */}
                {expandedChat === chat.id && (
                  <div className="space-y-4 border-t border-[var(--tartarus-border)] p-4">
                    {/* Summary */}
                    {chat.summary && (
                      <div className="rounded-lg bg-[var(--tartarus-surface)] p-3">
                        <div className="mb-2 flex items-center gap-2 text-xs text-[var(--tartarus-ivory-muted)]">
                          <Sparkles className="h-3 w-3 text-[var(--tartarus-gold)]" />
                          <span>Summary</span>
                          {chat.summary_updated_at && (
                            <span className="ml-auto">
                              Updated: {formatDate(chat.summary_updated_at)}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-[var(--tartarus-ivory)]">{chat.summary}</p>
                      </div>
                    )}

                    {/* Full question */}
                    <div>
                      <h4 className="mb-2 text-xs font-medium text-[var(--tartarus-ivory-muted)]">
                        Question
                      </h4>
                      <p className="text-sm whitespace-pre-wrap text-[var(--tartarus-ivory)]">
                        {chat.question}
                      </p>
                    </div>

                    {/* Full answer */}
                    <div>
                      <h4 className="mb-2 text-xs font-medium text-[var(--tartarus-ivory-muted)]">
                        Answer
                      </h4>
                      <div className="max-h-96 overflow-y-auto rounded-lg bg-[var(--tartarus-surface)] p-3 text-sm whitespace-pre-wrap text-[var(--tartarus-ivory)]">
                        {chat.answer}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Pagination */}
          {pagination && pagination.total_pages > 1 && (
            <div className="mt-8 flex items-center justify-between border-t border-[var(--tartarus-border)] pt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchChats(pagination.offset - pagination.limit)}
                disabled={pagination.page === 1 || loading}
              >
                <ChevronLeft className="mr-1 h-4 w-4" />
                Previous
              </Button>

              <span className="text-sm text-[var(--tartarus-ivory-muted)]">
                Page {pagination.page} of {pagination.total_pages}
              </span>

              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchChats(pagination.offset + pagination.limit)}
                disabled={!pagination.has_more || loading}
              >
                Next
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
