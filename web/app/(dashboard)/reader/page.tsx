"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search,
  GitBranch,
  Calendar,
  User,
  Paperclip,
  Sparkles,
  FolderGit2,
  ChevronRight,
} from "lucide-react";

interface JournalEntry {
  id: number;
  commit_hash: string;
  repository: string;
  branch: string;
  author: string;
  date: string;
  why: string;
  what_changed: string;
  decisions: string;
  technologies: string;
  kronus_wisdom: string | null;
  created_at: string;
  attachment_count: number;
}

export default function ReaderPage() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [repositories, setRepositories] = useState<string[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetchRepositories();
  }, []);

  useEffect(() => {
    fetchEntries();
  }, [selectedRepo, page]);

  const fetchRepositories = async () => {
    try {
      const response = await fetch("/api/repositories");
      const data = await response.json();
      setRepositories(data);
    } catch (error) {
      console.error("Failed to fetch repositories:", error);
    }
  };

  const fetchEntries = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: "20",
        offset: String(page * 20),
      });
      if (selectedRepo && selectedRepo !== "all") {
        params.set("repository", selectedRepo);
      }

      const response = await fetch(`/api/entries?${params}`);
      const data = await response.json();
      setEntries(data.entries || []);
      setHasMore(data.has_more || false);
      setTotal(data.total || 0);
    } catch (error) {
      console.error("Failed to fetch entries:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredEntries = searchQuery
    ? entries.filter(
        (e) =>
          e.why.toLowerCase().includes(searchQuery.toLowerCase()) ||
          e.repository.toLowerCase().includes(searchQuery.toLowerCase()) ||
          e.commit_hash.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : entries;

  return (
    <div className="journal-page flex h-full flex-col">
      {/* Header */}
      <header className="journal-header flex h-14 items-center justify-between px-6">
        <h1 className="journal-title text-lg">Journal Reader</h1>
        <div className="text-muted-foreground flex items-center gap-2 text-sm">
          <span>{total} entries</span>
        </div>
      </header>

      {/* Filters */}
      <div className="journal-tabs flex items-center gap-4 px-6 py-3">
        <div className="relative max-w-sm flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <Input
            placeholder="Search entries..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          value={selectedRepo}
          onValueChange={(v) => {
            setSelectedRepo(v);
            setPage(0);
          }}
        >
          <SelectTrigger className="w-[200px]">
            <FolderGit2 className="mr-2 h-4 w-4" />
            <SelectValue placeholder="All Repositories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Repositories</SelectItem>
            {repositories.map((repo) => (
              <SelectItem key={repo} value={repo}>
                {repo}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Entry List */}
      <ScrollArea className="flex-1 bg-[var(--journal-paper)]">
        <div className="space-y-4 p-6">
          {loading ? (
            // Loading skeletons
            Array.from({ length: 5 }).map((_, i) => (
              <Card key={i}>
                <CardHeader className="pb-3">
                  <Skeleton className="h-5 w-1/3" />
                  <Skeleton className="h-4 w-1/4" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="mb-2 h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </CardContent>
              </Card>
            ))
          ) : filteredEntries.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-muted-foreground">No journal entries found.</p>
            </div>
          ) : (
            filteredEntries.map((entry) => (
              <Link key={entry.id} href={`/reader/${entry.commit_hash}`}>
                <Card className="hover:bg-accent/50 group cursor-pointer transition-colors">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2 text-base">
                          <FolderGit2 className="text-primary h-4 w-4" />
                          {entry.repository}
                          <span className="text-muted-foreground font-normal">/</span>
                          <span className="text-muted-foreground flex items-center gap-1 font-normal">
                            <GitBranch className="h-3 w-3" />
                            {entry.branch}
                          </span>
                        </CardTitle>
                        <div className="text-muted-foreground mt-1 flex items-center gap-3 text-xs">
                          <span className="font-mono">{entry.commit_hash.substring(0, 7)}</span>
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {entry.author}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(entry.date).toLocaleDateString()}
                          </span>
                          {entry.attachment_count > 0 && (
                            <span className="flex items-center gap-1">
                              <Paperclip className="h-3 w-3" />
                              {entry.attachment_count}
                            </span>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="text-muted-foreground h-5 w-5 opacity-0 transition-opacity group-hover:opacity-100" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-muted-foreground line-clamp-2 text-sm prose prose-sm max-w-none prose-p:m-0 prose-p:text-muted-foreground">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{entry.why}</ReactMarkdown>
                    </div>
                    {entry.kronus_wisdom && (
                      <div className="mt-3 flex items-start gap-2 text-xs">
                        <Sparkles className="text-primary mt-0.5 h-3 w-3" />
                        <div className="text-primary/80 line-clamp-1 italic prose prose-sm max-w-none prose-p:m-0 prose-p:text-primary/80 prose-p:italic">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{entry.kronus_wisdom}</ReactMarkdown>
                        </div>
                      </div>
                    )}
                    {entry.technologies && (
                      <div className="mt-3 flex flex-wrap gap-1">
                        {entry.technologies
                          .split(",")
                          .slice(0, 5)
                          .map((tech) => (
                            <Badge key={tech.trim()} variant="secondary" className="text-xs">
                              {tech.trim()}
                            </Badge>
                          ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))
          )}
        </div>

        {/* Pagination */}
        {!loading && filteredEntries.length > 0 && (
          <div className="flex items-center justify-center gap-4 pb-6">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
            >
              Previous
            </Button>
            <span className="text-muted-foreground text-sm">Page {page + 1}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page + 1)}
              disabled={!hasMore}
            >
              Next
            </Button>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
