import type { ToolExecutor } from "./types";

export const journalExecutors: Record<string, ToolExecutor> = {
  journal_create_entry: async (args) => {
    const res = await fetch("/api/kronus/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(args),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    return {
      output: `Created journal entry for ${args.repository}/${args.branch} (${String(args.commit_hash).substring(0, 7)})`,
    };
  },

  journal_get_entry: async (args) => {
    const res = await fetch(`/api/entries/${args.commit_hash}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Entry not found");
    return { output: JSON.stringify(data, null, 2) };
  },

  journal_list_by_repository: async (args) => {
    const params = new URLSearchParams({
      repository: String(args.repository),
      limit: String(args.limit || 20),
      offset: String(args.offset || 0),
    });
    const res = await fetch(`/api/entries?${params}`);
    const data = await res.json();
    return {
      output: `Found ${data.total} entries for ${args.repository}:\n${JSON.stringify(data.entries, null, 2)}`,
    };
  },

  journal_list_by_branch: async (args) => {
    const params = new URLSearchParams({
      repository: String(args.repository),
      branch: String(args.branch),
      limit: String(args.limit || 20),
      offset: String(args.offset || 0),
    });
    const res = await fetch(`/api/entries?${params}`);
    const data = await res.json();
    return {
      output: `Found ${data.total} entries for ${args.repository}/${args.branch}:\n${JSON.stringify(data.entries, null, 2)}`,
    };
  },

  journal_list_repositories: async () => {
    const res = await fetch("/api/repositories");
    const data = await res.json();
    return { output: `Repositories: ${JSON.stringify(data)}` };
  },

  journal_list_branches: async (args) => {
    const res = await fetch(`/api/repositories?repo=${args.repository}`);
    const data = await res.json();
    return {
      output: `Branches in ${args.repository}: ${JSON.stringify(data)}`,
    };
  },

  journal_edit_entry: async (args) => {
    const { commit_hash, ...updates } = args;
    const res = await fetch(`/api/entries/${commit_hash}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Update failed");
    return {
      output: `Updated entry ${String(commit_hash).substring(0, 7)}`,
    };
  },

  journal_regenerate_entry: async (args) => {
    const res = await fetch("/api/kronus/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        commit_hash: args.commit_hash,
        new_context: args.new_context,
        edit_mode: true,
      }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    return {
      output: `Regenerated entry ${String(args.commit_hash).substring(0, 7)}`,
    };
  },

  journal_get_project_summary: async (args) => {
    const res = await fetch(
      `/api/entries?repository=${args.repository}&summary=true`
    );
    const data = await res.json();
    return { output: JSON.stringify(data, null, 2) };
  },

  journal_list_project_summaries: async () => {
    const res = await fetch(`/api/repositories?summaries=true`);
    const data = await res.json();
    return { output: JSON.stringify(data, null, 2) };
  },

  journal_upsert_project_summary: async (args) => {
    const res = await fetch(
      `/api/repositories/${encodeURIComponent(String(args.repository))}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          git_url: args.git_url,
          summary: args.summary,
          purpose: args.purpose,
          architecture: args.architecture,
          key_decisions: args.key_decisions,
          technologies: args.technologies,
          status: args.status,
        }),
      }
    );
    const data = await res.json();
    if (!res.ok)
      throw new Error(data.error || "Failed to upsert project summary");
    return {
      output: `✅ Project summary for **${args.repository}** has been ${data.created ? "created" : "updated"}`,
    };
  },

  journal_list_attachments: async (args) => {
    const res = await fetch(`/api/entries/${args.commit_hash}`);
    const data = await res.json();
    return {
      output: `Attachments: ${JSON.stringify(data.attachments || [], null, 2)}`,
    };
  },

  journal_backup: async () => {
    const res = await fetch("/api/db/backup", { method: "POST" });
    const data = await res.json();
    return { output: data.message || "Backup completed" };
  },
};
