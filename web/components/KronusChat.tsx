"use client";

import { useState } from "react";

interface JournalEntry {
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
}

interface KronusChatProps {
  entry: JournalEntry;
  onUpdate: (updates: Partial<JournalEntry>) => Promise<void>;
}

export default function KronusChat({ entry, onUpdate }: KronusChatProps) {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Partial<JournalEntry> | null>(null);
  const [error, setError] = useState("");

  const handleGenerate = async (editMode: boolean = false) => {
    if (!message.trim() && editMode) {
      setError("Please provide context or instructions for Kronus");
      return;
    }

    setLoading(true);
    setError("");
    setSuggestions(null);

    try {
      const response = await fetch("/api/kronus/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          commit_hash: entry.commit_hash,
          repository: entry.repository,
          branch: entry.branch,
          author: entry.author,
          date: entry.date,
          raw_agent_report: message || entry.raw_agent_report,
          existing_entry: editMode ? entry : undefined,
          edit_mode: editMode,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setSuggestions(data);
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Failed to generate entry");
      }
    } catch (err) {
      setError("Failed to communicate with Kronus");
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async () => {
    if (!suggestions) return;

    setLoading(true);
    try {
      await onUpdate(suggestions);
      setSuggestions(null);
      setMessage("");
    } catch (err) {
      setError("Failed to apply changes");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
      <div className="mb-6">
        <h2 className="mb-2 text-2xl font-bold text-slate-900">Chat with Kronus</h2>
        <p className="text-slate-600">
          Ask Kronus to regenerate or refine this journal entry. Provide new context, ask questions,
          or request improvements.
        </p>
      </div>

      <div className="mb-6 space-y-4">
        <div>
          <label htmlFor="message" className="mb-2 block text-sm font-medium text-slate-700">
            New Context or Instructions
          </label>
          <textarea
            id="message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={6}
            className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-purple-500"
            placeholder="Provide new context, ask Kronus to refine specific sections, or describe what you'd like improved..."
          />
        </div>

        <div className="flex gap-4">
          <button
            onClick={() => handleGenerate(false)}
            disabled={loading}
            className="rounded-lg bg-purple-600 px-6 py-2 text-white transition-colors hover:bg-purple-700 focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Generating..." : "Regenerate Entry"}
          </button>
          <button
            onClick={() => handleGenerate(true)}
            disabled={loading || !message.trim()}
            className="rounded-lg bg-purple-500 px-6 py-2 text-white transition-colors hover:bg-purple-600 focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Generating..." : "Edit with Context"}
          </button>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">
            {error}
          </div>
        )}
      </div>

      {suggestions && (
        <div className="border-t border-slate-200 pt-6">
          <h3 className="mb-4 text-lg font-semibold text-slate-900">Kronus Suggestions</h3>

          <div className="mb-6 space-y-4">
            <div>
              <h4 className="mb-1 text-sm font-medium text-slate-700">Why</h4>
              <p className="rounded-lg bg-slate-50 p-3 whitespace-pre-wrap text-slate-700">
                {suggestions.why}
              </p>
            </div>
            <div>
              <h4 className="mb-1 text-sm font-medium text-slate-700">What Changed</h4>
              <p className="rounded-lg bg-slate-50 p-3 whitespace-pre-wrap text-slate-700">
                {suggestions.what_changed}
              </p>
            </div>
            <div>
              <h4 className="mb-1 text-sm font-medium text-slate-700">Decisions</h4>
              <p className="rounded-lg bg-slate-50 p-3 whitespace-pre-wrap text-slate-700">
                {suggestions.decisions}
              </p>
            </div>
            <div>
              <h4 className="mb-1 text-sm font-medium text-slate-700">Technologies</h4>
              <p className="rounded-lg bg-slate-50 p-3 whitespace-pre-wrap text-slate-700">
                {suggestions.technologies}
              </p>
            </div>
            {suggestions.kronus_wisdom && (
              <div>
                <h4 className="mb-1 text-sm font-medium text-slate-700">Kronus Wisdom</h4>
                <p className="rounded-lg bg-purple-50 p-3 whitespace-pre-wrap text-purple-800 italic">
                  {suggestions.kronus_wisdom}
                </p>
              </div>
            )}
          </div>

          <div className="flex gap-4">
            <button
              onClick={handleApply}
              disabled={loading}
              className="rounded-lg bg-green-600 px-6 py-2 text-white transition-colors hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            >
              Apply Changes
            </button>
            <button
              onClick={() => setSuggestions(null)}
              className="rounded-lg bg-slate-100 px-6 py-2 text-slate-700 transition-colors hover:bg-slate-200 focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 focus:outline-none"
            >
              Discard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}







