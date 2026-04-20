import type { ToolExecutor } from "./types";

export const linearExecutors: Record<string, ToolExecutor> = {
  linear_get_viewer: async () => {
    const res = await fetch("/api/integrations/linear/viewer");
    const data = await res.json();
    return { output: JSON.stringify(data, null, 2) };
  },

  linear_list_issues: async (args) => {
    const params = new URLSearchParams();
    if (args.assigneeId) params.set("assigneeId", String(args.assigneeId));
    if (args.teamId) params.set("teamId", String(args.teamId));
    if (args.projectId) params.set("projectId", String(args.projectId));
    if (args.query) params.set("query", String(args.query));
    if (args.limit) params.set("limit", String(args.limit));
    if (args.showAll) params.set("showAll", "true");

    const res = await fetch(`/api/integrations/linear/issues?${params}`);
    const data = await res.json();
    return {
      output: `Found ${data.issues?.length || 0} issues:\n${JSON.stringify(data.issues, null, 2)}`,
    };
  },

  linear_list_projects: async (args) => {
    const params = args.teamId ? `?teamId=${args.teamId}` : "";
    const res = await fetch(`/api/integrations/linear/projects${params}`);
    const data = await res.json();
    return {
      output: `Found ${data.projects?.length || 0} projects:\n${JSON.stringify(data.projects, null, 2)}`,
    };
  },

  linear_create_project: async (args) => {
    const res = await fetch("/api/integrations/linear/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(args),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || "Failed to create project");
    return { output: `✅ Created project: ${result.name}\nID: ${result.id}` };
  },

  linear_create_issue: async (args) => {
    const res = await fetch("/api/integrations/linear/issues", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(args),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || "Failed to create issue");
    return {
      output: `✅ Created issue: ${result.identifier} - ${result.title}\nURL: ${result.url}`,
    };
  },

  linear_update_issue: async (args) => {
    const { issueId, ...updates } = args;
    const res = await fetch(`/api/integrations/linear/issues/${issueId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || "Failed to update issue");
    return { output: `✅ Updated issue: ${result.identifier}` };
  },

  linear_update_project: async (args) => {
    const { projectId, ...updates } = args;
    const res = await fetch(`/api/integrations/linear/projects/${projectId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || "Failed to update project");
    return { output: `✅ Updated project: ${result.name}` };
  },

  linear_create_project_update: async (args) => {
    const { projectId, body: updateBody, health } = args;
    const res = await fetch(
      `/api/integrations/linear/projects/${projectId}/updates`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: updateBody, health }),
      }
    );
    const result = await res.json();
    if (!res.ok)
      throw new Error(result.error || "Failed to create project update");
    return {
      output: `✅ Posted project update (${result.health})\nID: ${result.id}`,
    };
  },

  linear_list_project_updates: async (args) => {
    const res = await fetch(
      `/api/integrations/linear/projects/${args.projectId}/updates`
    );
    const result = await res.json();
    if (!res.ok)
      throw new Error(result.error || "Failed to list project updates");
    return {
      output: `Found ${result.total} updates:\n${JSON.stringify(result.updates, null, 2)}`,
    };
  },

  // Cache tools (read from local DB)
  linear_get_issue: async (args) => {
    const res = await fetch(
      `/api/integrations/linear/cache/issues/${encodeURIComponent(args.identifier)}`
    );
    const result = await res.json();
    if (!res.ok)
      throw new Error(result.error || "Failed to fetch issue from cache");
    return { output: JSON.stringify(result, null, 2) };
  },

  linear_get_project: async (args) => {
    const res = await fetch(
      `/api/integrations/linear/cache/projects/${encodeURIComponent(args.projectId)}`
    );
    const result = await res.json();
    if (!res.ok)
      throw new Error(result.error || "Failed to fetch project from cache");
    return { output: JSON.stringify(result, null, 2) };
  },
};
