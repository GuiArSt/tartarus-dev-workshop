"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Clock, Bot } from "lucide-react";
import type { KronusChat, ChatConversation } from "@/lib/types/repository";

interface ChatsTabProps {
  loading: boolean;
  conversations: ChatConversation[];
  conversationsPagination: { total: number } | null;
  kronusChats: KronusChat[];
  kronusChatsPagination: {
    total: number;
    limit: number;
    offset: number;
    has_more: boolean;
  } | null;
}

export function ChatsTab({
  loading,
  conversations,
  conversationsPagination,
  kronusChats,
  kronusChatsPagination,
}: ChatsTabProps) {
  return (
    <div className="space-y-8 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold text-[var(--tartarus-ivory)]">Chat History</h3>
          <p className="text-[var(--tartarus-ivory-muted)] text-sm">
            {conversationsPagination && kronusChatsPagination
              ? `${conversationsPagination.total} conversations, ${kronusChatsPagination.total} Kronus queries`
              : "Loading..."}
          </p>
        </div>
        <Link href="/chat">
          <Button className="bg-[var(--tartarus-gold)] text-[var(--tartarus-void)] hover:bg-[var(--tartarus-gold)]/90">
            <MessageSquare className="mr-2 h-4 w-4" />
            New Chat
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[var(--tartarus-gold)]" />
        </div>
      ) : (
        <>
          {/* SECTION 1: Main Chat Conversations (Admin UI) */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--tartarus-teal)]/10">
                <MessageSquare className="h-4 w-4 text-[var(--tartarus-teal)]" />
              </div>
              <div>
                <h4 className="font-semibold text-[var(--tartarus-ivory)]">Conversations</h4>
                <p className="text-[var(--tartarus-ivory-muted)] text-xs">
                  Chat sessions with Kronus assistant
                </p>
              </div>
              <Badge variant="secondary" className="ml-auto">
                {conversationsPagination?.total || 0}
              </Badge>
            </div>

            {conversations.length === 0 ? (
              <Card className="border-dashed border-[var(--tartarus-border)] bg-[var(--tartarus-surface)] p-6 text-center">
                <p className="text-[var(--tartarus-ivory-muted)] text-sm">
                  No chat conversations yet. Start a new chat to begin!
                </p>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {conversations.slice(0, 6).map((conv) => (
                  <Link key={conv.id} href={`/chat?id=${conv.id}`}>
                    <Card className="group relative h-full cursor-pointer overflow-hidden border-[var(--tartarus-border)] bg-[var(--tartarus-surface)] transition-[border-color,box-shadow] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:border-[var(--tartarus-teal-dim)] hover:shadow-[0_0_20px_rgba(0,206,209,0.1)]">
                      <div className="h-0.5 bg-gradient-to-r from-[var(--tartarus-gold)] to-[var(--tartarus-teal)]" />
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-[var(--tartarus-teal)]" />
                          <div className="min-w-0 flex-1">
                            <p className="line-clamp-1 font-medium text-[var(--tartarus-ivory)]">{conv.title}</p>
                            {conv.summary && (
                              <p className="text-[var(--tartarus-ivory-muted)] mt-1 line-clamp-2 text-sm">
                                {conv.summary}
                              </p>
                            )}
                            <p className="text-[var(--tartarus-ivory-faded)] mt-2 flex items-center gap-1 text-xs">
                              <Clock className="h-3 w-3" />
                              {new Date(conv.updated_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}

            {conversations.length > 6 && (
              <div className="flex justify-center">
                <Link href="/chat">
                  <Button variant="outline" size="sm" className="border-[var(--tartarus-border)] text-[var(--tartarus-ivory-muted)]">
                    View All Conversations
                  </Button>
                </Link>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[var(--tartarus-border)]" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-[var(--tartarus-void)] text-[var(--tartarus-ivory-faded)] px-3 text-xs uppercase tracking-wider">
                MCP Tool Queries
              </span>
            </div>
          </div>

          {/* SECTION 2: Kronus MCP Tool Queries (askKronus) */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--tartarus-gold)]/10">
                <Bot className="h-4 w-4 text-[var(--tartarus-gold)]" />
              </div>
              <div>
                <h4 className="font-semibold text-[var(--tartarus-ivory)]">Kronus Queries</h4>
                <p className="text-[var(--tartarus-ivory-muted)] text-xs">
                  Direct questions via kronus_ask MCP tool
                </p>
              </div>
              <Badge variant="secondary" className="ml-auto">
                {kronusChatsPagination?.total || 0}
              </Badge>
            </div>

            {/* Kronus Stats */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
              <Card className="group relative overflow-hidden border-[var(--tartarus-border)] bg-[var(--tartarus-surface)] transition-[border-color,box-shadow] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:border-[var(--tartarus-teal-dim)] hover:shadow-[0_0_20px_rgba(0,206,209,0.1)]">
                <div className="h-0.5 bg-gradient-to-r from-[var(--tartarus-gold)] to-[var(--tartarus-teal)]" />
                <CardContent className="p-3">
                  <div className="text-xl font-bold text-[var(--tartarus-gold)]">
                    {kronusChatsPagination?.total || 0}
                  </div>
                  <div className="text-[var(--tartarus-ivory-muted)] text-xs">Total Queries</div>
                </CardContent>
              </Card>
              <Card className="group relative overflow-hidden border-[var(--tartarus-border)] bg-[var(--tartarus-surface)] transition-[border-color,box-shadow] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:border-[var(--tartarus-teal-dim)] hover:shadow-[0_0_20px_rgba(0,206,209,0.1)]">
                <div className="h-0.5 bg-gradient-to-r from-[var(--tartarus-gold)] to-[var(--tartarus-teal)]" />
                <CardContent className="p-3">
                  <div className="text-xl font-bold text-[var(--tartarus-gold)]">
                    {kronusChats.filter((c) => c.depth === "deep").length}
                  </div>
                  <div className="text-[var(--tartarus-ivory-muted)] text-xs">Deep</div>
                </CardContent>
              </Card>
              <Card className="group relative overflow-hidden border-[var(--tartarus-border)] bg-[var(--tartarus-surface)] transition-[border-color,box-shadow] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:border-[var(--tartarus-teal-dim)] hover:shadow-[0_0_20px_rgba(0,206,209,0.1)]">
                <div className="h-0.5 bg-gradient-to-r from-[var(--tartarus-gold)] to-[var(--tartarus-teal)]" />
                <CardContent className="p-3">
                  <div className="text-xl font-bold text-[var(--tartarus-gold)]">
                    {kronusChats.filter((c) => c.has_summary).length}
                  </div>
                  <div className="text-[var(--tartarus-ivory-muted)] text-xs">Summarized</div>
                </CardContent>
              </Card>
              <Card className="group relative overflow-hidden border-[var(--tartarus-border)] bg-[var(--tartarus-surface)] transition-[border-color,box-shadow] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:border-[var(--tartarus-teal-dim)] hover:shadow-[0_0_20px_rgba(0,206,209,0.1)]">
                <div className="h-0.5 bg-gradient-to-r from-[var(--tartarus-gold)] to-[var(--tartarus-teal)]" />
                <CardContent className="p-3">
                  <div className="text-xl font-bold text-[var(--tartarus-gold)]">
                    {kronusChats
                      .reduce(
                        (acc, c) => acc + (c.input_tokens || 0) + (c.output_tokens || 0),
                        0
                      )
                      .toLocaleString()}
                  </div>
                  <div className="text-[var(--tartarus-ivory-muted)] text-xs">Tokens</div>
                </CardContent>
              </Card>
            </div>

            {kronusChats.length === 0 ? (
              <Card className="border-dashed border-[var(--tartarus-border)] bg-[var(--tartarus-surface)] p-6 text-center">
                <p className="text-[var(--tartarus-ivory-muted)] text-sm">
                  No Kronus MCP queries yet. Use kronus_ask in Claude Code to query your
                  projects.
                </p>
              </Card>
            ) : (
              <div className="space-y-2">
                {kronusChats.slice(0, 8).map((chat) => (
                  <Card
                    key={chat.id}
                    className="stagger-item group relative overflow-hidden border-[var(--tartarus-border)] bg-[var(--tartarus-surface)] transition-[border-color,box-shadow] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:border-[var(--tartarus-teal-dim)] hover:shadow-[0_0_20px_rgba(0,206,209,0.1)]"
                  >
                    <div className="h-0.5 bg-gradient-to-r from-[var(--tartarus-gold)] to-[var(--tartarus-teal)]" />
                    <CardContent className="p-3">
                      <div className="flex items-start gap-3">
                        <Bot className="mt-0.5 h-4 w-4 shrink-0 text-[var(--tartarus-gold)]" />
                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-1 text-sm font-medium text-[var(--tartarus-ivory)]">
                            {chat.question_preview}
                          </p>
                          <p className="text-[var(--tartarus-ivory-muted)] mt-0.5 line-clamp-1 text-xs">
                            {chat.summary || chat.answer_preview}
                          </p>
                          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                            <Badge
                              variant="outline"
                              className="border-[var(--tartarus-border)] px-1.5 py-0 text-[10px] text-[var(--tartarus-ivory-muted)]"
                            >
                              {chat.depth}
                            </Badge>
                            {chat.repository && (
                              <Badge
                                variant="secondary"
                                className="px-1.5 py-0 text-[10px]"
                              >
                                {chat.repository}
                              </Badge>
                            )}
                            <span className="text-[var(--tartarus-ivory-faded)] text-[10px]">
                              {new Date(chat.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {kronusChatsPagination?.has_more && (
              <div className="flex justify-center">
                <Link href="/kronus">
                  <Button variant="outline" size="sm" className="border-[var(--tartarus-border)] text-[var(--tartarus-ivory-muted)]">
                    View All Kronus Queries
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
