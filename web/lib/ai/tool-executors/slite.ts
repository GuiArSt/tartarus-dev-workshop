import type { ToolExecutor } from "./types";

export const sliteExecutors: Record<string, ToolExecutor> = {
  slite_search_notes: async (args) => {
    const params = new URLSearchParams();
    params.set("query", String(args.query));
    if (args.parentNoteId)
      params.set("parentNoteId", String(args.parentNoteId));
    if (args.hitsPerPage) params.set("hitsPerPage", String(args.hitsPerPage));
    const res = await fetch(`/api/integrations/slite/search?${params}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Slite search failed");
    return {
      output: `Found ${data.hits?.length || 0} notes:\n${JSON.stringify(data.hits, null, 2)}`,
    };
  },

  slite_get_note: async (args) => {
    const res = await fetch(
      `/api/integrations/slite/notes/${args.noteId}`
    );
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to get Slite note");
    return { output: JSON.stringify(data, null, 2) };
  },

  slite_create_note: async (args) => {
    const res = await fetch("/api/integrations/slite/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(args),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to create Slite note");
    return {
      output: `Created note: "${data.title}"\nID: ${data.id}\nURL: ${data.url}`,
    };
  },

  slite_update_note: async (args) => {
    const { noteId, ...updates } = args;
    const res = await fetch(`/api/integrations/slite/notes/${noteId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to update Slite note");
    return { output: `Updated note: "${data.title}"` };
  },

  slite_ask: async (args) => {
    const params = new URLSearchParams({
      question: String(args.question),
    });
    const res = await fetch(`/api/integrations/slite/ask?${params}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Slite ask failed");
    const sources =
      data.sources?.map((s: any) => `- ${s.title}: ${s.url}`).join("\n") || "";
    return { output: `${data.answer}\n\nSources:\n${sources}` };
  },
};
