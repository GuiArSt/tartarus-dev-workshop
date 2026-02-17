import { NextResponse } from "next/server";
import { Octokit } from "octokit";
import { Gitlab } from "@gitbeaker/rest";

/**
 * Git API Routes
 *
 * Provides read-only access to GitHub and GitLab repositories
 * for Kronus to explore codebases when creating Entry 0 or answering questions.
 *
 * Supported operations:
 * - GET ?action=parse_url&url=... - Parse repo URL to extract platform/owner/repo
 * - GET ?action=file_tree&platform=...&owner=...&repo=...&ref=... - Get file tree
 * - GET ?action=read_file&platform=...&owner=...&repo=...&path=...&ref=... - Read file
 */

// Initialize clients lazily
let githubClient: Octokit | null = null;
let gitlabClient: InstanceType<typeof Gitlab> | null = null;

function getGitHubClient(): Octokit | null {
  if (!process.env.GITHUB_TOKEN) return null;
  if (!githubClient) {
    githubClient = new Octokit({ auth: process.env.GITHUB_TOKEN });
  }
  return githubClient;
}

function getGitLabClient(): InstanceType<typeof Gitlab> | null {
  if (!process.env.GITLAB_TOKEN) return null;
  if (!gitlabClient) {
    gitlabClient = new Gitlab({
      token: process.env.GITLAB_TOKEN,
      host: process.env.GITLAB_HOST || "https://gitlab.com",
    });
  }
  return gitlabClient;
}

/**
 * Parse a GitHub or GitLab URL to extract platform, owner, and repo
 */
function parseRepoUrl(url: string): { platform: "github" | "gitlab"; owner: string; repo: string } {
  const githubMatch = url.match(/github\.com[/:]([^/]+)\/([^/.\s]+)/);
  if (githubMatch) {
    return {
      platform: "github",
      owner: githubMatch[1],
      repo: githubMatch[2].replace(/\.git$/, ""),
    };
  }

  const gitlabMatch = url.match(/gitlab\.com[/:]([^/]+)\/([^/.\s]+)/);
  if (gitlabMatch) {
    return {
      platform: "gitlab",
      owner: gitlabMatch[1],
      repo: gitlabMatch[2].replace(/\.git$/, ""),
    };
  }

  throw new Error(`Unsupported repository URL format: ${url}`);
}

/**
 * Get file tree from GitHub
 */
async function getGitHubFileTree(owner: string, repo: string, ref: string = "main") {
  const client = getGitHubClient();
  if (!client) throw new Error("GitHub token not configured");

  try {
    const { data } = await client.rest.git.getTree({
      owner,
      repo,
      tree_sha: ref,
      recursive: "true",
    });

    return data.tree.map((item) => ({
      path: item.path || "",
      type: item.type === "blob" ? "file" : "directory",
      size: item.size,
    }));
  } catch (error: any) {
    if (error.status === 404) {
      throw new Error(`Repository not found: ${owner}/${repo}`);
    }
    if (error.status === 401 || error.status === 403) {
      throw new Error("GitHub authentication failed or insufficient permissions");
    }
    throw error;
  }
}

/**
 * Get file tree from GitLab
 */
async function getGitLabFileTree(owner: string, repo: string, ref: string = "main") {
  const client = getGitLabClient();
  if (!client) throw new Error("GitLab token not configured");

  const projectId = `${owner}/${repo}`;

  try {
    const tree = await client.Repositories.allRepositoryTrees(projectId, {
      ref,
      recursive: true,
      perPage: 100,
    });

    return tree.map((item: any) => ({
      path: item.path || "",
      type: item.type === "blob" ? "file" : "directory",
    }));
  } catch (error: any) {
    if (error.cause?.response?.status === 404) {
      throw new Error(`Repository not found: ${projectId}`);
    }
    throw error;
  }
}

/**
 * Read file from GitHub
 */
async function readGitHubFile(owner: string, repo: string, path: string, ref: string = "main") {
  const client = getGitHubClient();
  if (!client) throw new Error("GitHub token not configured");

  try {
    const { data } = await client.rest.repos.getContent({
      owner,
      repo,
      path,
      ref,
      mediaType: { format: "raw" },
    });

    return data as unknown as string;
  } catch (error: any) {
    if (error.status === 404) {
      throw new Error(`File not found: ${path}`);
    }
    throw error;
  }
}

/**
 * Read file from GitLab
 */
async function readGitLabFile(owner: string, repo: string, path: string, ref: string = "main") {
  const client = getGitLabClient();
  if (!client) throw new Error("GitLab token not configured");

  const projectId = `${owner}/${repo}`;

  try {
    const content = await client.RepositoryFiles.showRaw(projectId, path, ref);
    return content as string;
  } catch (error: any) {
    if (error.cause?.response?.status === 404) {
      throw new Error(`File not found: ${path}`);
    }
    throw error;
  }
}

/**
 * Format file tree as ASCII tree structure
 */
function formatFileTree(nodes: { path: string; type: string; size?: number }[]): string {
  // Sort by path for consistent ordering
  const sorted = [...nodes].sort((a, b) => a.path.localeCompare(b.path));

  // Build tree structure
  const lines: string[] = [];
  for (const node of sorted) {
    const depth = node.path.split("/").length - 1;
    const indent = "  ".repeat(depth);
    const name = node.path.split("/").pop() || node.path;
    const suffix = node.type === "directory" ? "/" : "";
    lines.push(`${indent}${name}${suffix}`);
  }

  return lines.join("\n");
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");

  try {
    switch (action) {
      case "parse_url": {
        const url = searchParams.get("url");
        if (!url) {
          return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
        }
        const result = parseRepoUrl(url);
        return NextResponse.json(result);
      }

      case "file_tree": {
        const platform = searchParams.get("platform") as "github" | "gitlab";
        const owner = searchParams.get("owner");
        const repo = searchParams.get("repo");
        const ref = searchParams.get("ref") || "main";

        if (!platform || !owner || !repo) {
          return NextResponse.json({ error: "Missing platform, owner, or repo" }, { status: 400 });
        }

        let tree;
        if (platform === "github") {
          tree = await getGitHubFileTree(owner, repo, ref);
        } else if (platform === "gitlab") {
          tree = await getGitLabFileTree(owner, repo, ref);
        } else {
          return NextResponse.json({ error: "Invalid platform" }, { status: 400 });
        }

        return NextResponse.json({
          tree,
          formatted: formatFileTree(tree),
          count: tree.length,
        });
      }

      case "read_file": {
        const platform = searchParams.get("platform") as "github" | "gitlab";
        const owner = searchParams.get("owner");
        const repo = searchParams.get("repo");
        const path = searchParams.get("path");
        const ref = searchParams.get("ref") || "main";

        if (!platform || !owner || !repo || !path) {
          return NextResponse.json(
            { error: "Missing platform, owner, repo, or path" },
            { status: 400 }
          );
        }

        let content;
        if (platform === "github") {
          content = await readGitHubFile(owner, repo, path, ref);
        } else if (platform === "gitlab") {
          content = await readGitLabFile(owner, repo, path, ref);
        } else {
          return NextResponse.json({ error: "Invalid platform" }, { status: 400 });
        }

        return NextResponse.json({
          content,
          path,
          ref,
          size: content.length,
        });
      }

      case "status": {
        // Check which Git providers are configured
        return NextResponse.json({
          github: !!process.env.GITHUB_TOKEN,
          gitlab: !!process.env.GITLAB_TOKEN,
        });
      }

      default:
        return NextResponse.json(
          {
            error: "Invalid action. Use: parse_url, file_tree, read_file, status",
          },
          { status: 400 }
        );
    }
  } catch (error: any) {
    console.error("[Git API Error]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
