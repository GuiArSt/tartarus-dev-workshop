import type { ToolExecutor } from "./types";

export const notionExecutors: Record<string, ToolExecutor> = {
  notion_search_pages: async (args) => {
    const params = new URLSearchParams();
    params.set("query", String(args.query));
    if (args.pageSize) params.set("pageSize", String(args.pageSize));
    const res = await fetch(`/api/integrations/notion/search?${params}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Notion search failed");
    return {
      output: `Found ${data.results?.length || 0} pages:\n${JSON.stringify(data.results, null, 2)}`,
    };
  },

  notion_get_page: async (args) => {
    const res = await fetch(
      `/api/integrations/notion/pages/${args.pageId}`
    );
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to get Notion page");
    return { output: JSON.stringify(data, null, 2) };
  },

  notion_create_page: async (args) => {
    const res = await fetch("/api/integrations/notion/pages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(args),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to create Notion page");
    return {
      output: `Created page: "${data.properties?.title?.title?.[0]?.plain_text || "Untitled"}"\nID: ${data.id}\nURL: ${data.url}`,
    };
  },

  notion_update_page: async (args) => {
    const { pageId, ...updates } = args;
    const res = await fetch(`/api/integrations/notion/pages/${pageId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    const data = await res.json();
    if (!res.ok)
      throw new Error(data.error || "Failed to update Notion page");
    return { output: `Updated page: "${data.title}"\nURL: ${data.url}` };
  },
};
