"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import EntryEditor from "@/components/EntryEditor";
import KronusChat from "@/components/KronusChat";

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
  raw_agent_report: string;
  created_at: string;
  attachments?: Array<{
    id: number;
    filename: string;
    mime_type: string;
    description: string | null;
    file_size: number;
  }>;
}

export default function EntryPage() {
  const router = useRouter();
  const params = useParams();
  const commitHash = params.commitHash as string;

  const [entry, setEntry] = useState<JournalEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState<"view" | "edit" | "kronus">("view");

  useEffect(() => {
    fetchEntry();
  }, [commitHash]);

  const fetchEntry = async () => {
    try {
      const response = await fetch(`/api/entries/${commitHash}`);
      if (response.ok) {
        const data = await response.json();
        setEntry(data);
      } else {
        router.push("/");
      }
    } catch (error) {
      console.error("Failed to fetch entry:", error);
      router.push("/");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (updates: Partial<JournalEntry>) => {
    try {
      const response = await fetch(`/api/entries/${commitHash}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        const updated = await response.json();
        setEntry(updated);
        setEditMode("view");
      }
    } catch (error) {
      console.error("Failed to update entry:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
          <p className="mt-4 text-slate-600">Loading entry...</p>
        </div>
      </div>
    );
  }

  if (!entry) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.push("/")}
              className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
            >
              ← Back to Journal
            </button>
            <div className="flex gap-2">
              <button
                onClick={() => setEditMode("view")}
                className={`rounded-lg px-4 py-2 transition-colors ${
                  editMode === "view"
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                View
              </button>
              <button
                onClick={() => setEditMode("edit")}
                className={`rounded-lg px-4 py-2 transition-colors ${
                  editMode === "edit"
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                Edit
              </button>
              <button
                onClick={() => setEditMode("kronus")}
                className={`rounded-lg px-4 py-2 transition-colors ${
                  editMode === "kronus"
                    ? "bg-purple-600 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                Kronus
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        {editMode === "view" && (
          <div className="rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
            <div className="mb-6">
              <div className="mb-2 flex items-center gap-3">
                <h1 className="text-2xl font-bold text-slate-900">{entry.repository}</h1>
                <span className="text-slate-500">/</span>
                <span className="text-slate-600">{entry.branch}</span>
              </div>
              <div className="flex items-center gap-4 text-sm text-slate-500">
                <span className="font-mono">{entry.commit_hash}</span>
                <span>•</span>
                <span>{entry.author}</span>
                <span>•</span>
                <span>{new Date(entry.date).toLocaleString()}</span>
              </div>
            </div>

            <div className="space-y-6">
              <section>
                <h2 className="mb-2 text-lg font-semibold text-slate-900">Why</h2>
                <div className="prose prose-sm max-w-none prose-headings:text-slate-900 prose-p:text-slate-700 prose-strong:text-slate-900 prose-code:text-slate-800 prose-code:bg-slate-100 prose-code:px-1 prose-code:rounded prose-pre:bg-slate-900 prose-pre:text-slate-100">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{entry.why}</ReactMarkdown>
                </div>
              </section>

              <section>
                <h2 className="mb-2 text-lg font-semibold text-slate-900">What Changed</h2>
                <div className="prose prose-sm max-w-none prose-headings:text-slate-900 prose-p:text-slate-700 prose-strong:text-slate-900 prose-code:text-slate-800 prose-code:bg-slate-100 prose-code:px-1 prose-code:rounded prose-pre:bg-slate-900 prose-pre:text-slate-100">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{entry.what_changed}</ReactMarkdown>
                </div>
              </section>

              <section>
                <h2 className="mb-2 text-lg font-semibold text-slate-900">Decisions</h2>
                <div className="prose prose-sm max-w-none prose-headings:text-slate-900 prose-p:text-slate-700 prose-strong:text-slate-900 prose-code:text-slate-800 prose-code:bg-slate-100 prose-code:px-1 prose-code:rounded prose-pre:bg-slate-900 prose-pre:text-slate-100">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{entry.decisions}</ReactMarkdown>
                </div>
              </section>

              <section>
                <h2 className="mb-2 text-lg font-semibold text-slate-900">Technologies</h2>
                <div className="prose prose-sm max-w-none prose-headings:text-slate-900 prose-p:text-slate-700 prose-strong:text-slate-900 prose-code:text-slate-800 prose-code:bg-slate-100 prose-code:px-1 prose-code:rounded prose-pre:bg-slate-900 prose-pre:text-slate-100">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{entry.technologies}</ReactMarkdown>
                </div>
              </section>

              {entry.kronus_wisdom && (
                <section className="rounded-lg border border-purple-200 bg-purple-50 p-4">
                  <h2 className="mb-2 text-lg font-semibold text-purple-900">Kronus Wisdom</h2>
                  <div className="prose prose-sm max-w-none prose-headings:text-purple-900 prose-p:text-purple-800 prose-p:italic prose-strong:text-purple-900 prose-code:text-purple-800 prose-code:bg-purple-100 prose-code:px-1 prose-code:rounded prose-pre:bg-purple-900 prose-pre:text-purple-100">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{entry.kronus_wisdom}</ReactMarkdown>
                  </div>
                </section>
              )}

              {entry.attachments && entry.attachments.length > 0 && (
                <section>
                  <h2 className="mb-2 text-lg font-semibold text-slate-900">Attachments</h2>
                  <div className="space-y-2">
                    {entry.attachments.map((att) => (
                      <div key={att.id} className="flex items-center gap-2 text-sm text-slate-600">
                        <span>📎</span>
                        <span>{att.filename}</span>
                        <span className="text-slate-400">
                          ({(att.file_size / 1024).toFixed(2)} KB)
                        </span>
                        {att.description && (
                          <span className="text-slate-500">- {att.description}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          </div>
        )}

        {editMode === "edit" && (
          <EntryEditor entry={entry} onUpdate={handleUpdate} onCancel={() => setEditMode("view")} />
        )}

        {editMode === "kronus" && <KronusChat entry={entry} onUpdate={handleUpdate} />}
      </main>
    </div>
  );
}
