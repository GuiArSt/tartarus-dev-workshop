import type { ToolExecutor } from "./types";

export const searchExecutors: Record<string, ToolExecutor> = {
  gemini_search: async (args) => {
    const res = await fetch("/api/gemini-search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: args.query }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Gemini search failed");
    return { output: `🔍 **Google Search Results**\n\n${data.result}` };
  },

  perplexity_search: async (args) => {
    const res = await fetch("/api/perplexity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "search", query: args.query }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Perplexity search failed");
    return { output: `🔍 **Search Results**\n\n${data.result}` };
  },

  perplexity_ask: async (args) => {
    const res = await fetch("/api/perplexity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "ask", question: args.question }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Perplexity ask failed");
    return { output: `💬 **Answer**\n\n${data.result}` };
  },

  perplexity_research: async (args) => {
    const res = await fetch("/api/perplexity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "research",
        topic: args.topic,
        strip_thinking: args.strip_thinking ?? true,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Perplexity research failed");
    return { output: `📚 **Research Report**\n\n${data.result}` };
  },

  perplexity_reason: async (args) => {
    const res = await fetch("/api/perplexity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "reason",
        problem: args.problem,
        strip_thinking: args.strip_thinking ?? true,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Perplexity reasoning failed");
    return { output: `🧠 **Reasoning Analysis**\n\n${data.result}` };
  },
};
