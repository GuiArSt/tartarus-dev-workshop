import type { ToolExecutor } from "./types";

export const gitExecutors: Record<string, ToolExecutor> = {
  git_parse_repo_url: async (args) => {
    const res = await fetch(
      `/api/git?action=parse_url&url=${encodeURIComponent(String(args.url))}`
    );
    const data = await res.json();
    if (!res.ok)
      throw new Error(data.error || "Failed to parse repository URL");
    return {
      output: `📦 **Parsed Repository URL**\n- Platform: ${data.platform}\n- Owner: ${data.owner}\n- Repo: ${data.repo}`,
    };
  },

  git_get_file_tree: async (args) => {
    const params = new URLSearchParams({
      action: "file_tree",
      platform: String(args.platform),
      owner: String(args.owner),
      repo: String(args.repo),
      ref: String(args.ref || "main"),
    });
    const res = await fetch(`/api/git?${params}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to get file tree");
    return {
      output: `🌳 **File Tree** (${data.count} files)\n\`\`\`\n${data.formatted}\n\`\`\``,
    };
  },

  git_read_file: async (args) => {
    const params = new URLSearchParams({
      action: "read_file",
      platform: String(args.platform),
      owner: String(args.owner),
      repo: String(args.repo),
      path: String(args.path),
      ref: String(args.ref || "main"),
    });
    const res = await fetch(`/api/git?${params}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to read file");

    const ext = args.path?.toString().split(".").pop() || "";
    const langMap: Record<string, string> = {
      ts: "typescript",
      tsx: "tsx",
      js: "javascript",
      jsx: "jsx",
      py: "python",
      rs: "rust",
      go: "go",
      rb: "ruby",
      json: "json",
      yaml: "yaml",
      yml: "yaml",
      md: "markdown",
      css: "css",
      scss: "scss",
      html: "html",
      sql: "sql",
    };
    const lang = langMap[ext] || ext;
    return {
      output: `📄 **${args.path}** (${data.size} bytes)\n\`\`\`${lang}\n${data.content}\n\`\`\``,
    };
  },
};
