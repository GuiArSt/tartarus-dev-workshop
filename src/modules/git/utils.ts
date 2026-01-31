/**
 * Git utility functions
 */

import type { ParsedRepoUrl, FileTreeNode } from "./clients/types.js";
import { GitError } from "./clients/types.js";

/**
 * Parse GitHub/GitLab URL to extract platform, owner, and repo
 *
 * Supported formats:
 * - https://github.com/owner/repo
 * - https://gitlab.com/namespace/project
 * - https://custom-gitlab.com/group/subgroup/repo
 */
export function parseRepoUrl(url: string): ParsedRepoUrl {
  try {
    const parsedUrl = new URL(url);
    const hostname = parsedUrl.hostname.toLowerCase();
    const pathParts = parsedUrl.pathname.split("/").filter(Boolean);

    // Determine platform
    let platform: "github" | "gitlab";
    if (hostname === "github.com" || hostname === "www.github.com") {
      platform = "github";
    } else if (hostname.includes("gitlab")) {
      platform = "gitlab";
    } else {
      throw new GitError(`Unsupported Git platform: ${hostname}`);
    }

    // Extract owner and repo
    // For both GitHub and GitLab, format is: /{owner}/{repo}
    // GitLab can have nested groups, but we'll use the last two parts
    if (pathParts.length < 2) {
      throw new GitError("Invalid repository URL format");
    }

    // For GitHub: owner/repo
    // For GitLab: Can be namespace/project or group/subgroup/project
    // We'll take the last two segments for simplicity
    const repo = pathParts[pathParts.length - 1].replace(/\.git$/, ""); // Remove .git suffix if present
    const owner =
      pathParts.length === 2 ? pathParts[0] : pathParts.slice(0, -1).join("/"); // Join all parts except last for nested GitLab groups

    return { platform, owner, repo };
  } catch (error: any) {
    if (error instanceof GitError) throw error;
    throw new GitError(`Failed to parse repository URL: ${error.message}`);
  }
}

/**
 * Format file tree as ASCII tree structure
 */
export function formatFileTree(nodes: FileTreeNode[]): string {
  // Sort nodes by path
  const sorted = [...nodes].sort((a, b) => a.path.localeCompare(b.path));

  // Build tree structure
  const lines: string[] = [];
  const pathMap = new Map<string, FileTreeNode[]>();

  // Group nodes by directory
  for (const node of sorted) {
    const parts = node.path.split("/");
    const dir = parts.slice(0, -1).join("/");

    if (!pathMap.has(dir)) {
      pathMap.set(dir, []);
    }
    pathMap.get(dir)!.push(node);
  }

  // Recursive function to build tree lines
  function buildTree(prefix: string, dirPath: string, isLast: boolean) {
    const children = pathMap.get(dirPath) || [];

    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      const isLastChild = i === children.length - 1;
      const parts = child.path.split("/");
      const name = parts[parts.length - 1];

      const connector = isLastChild ? "└── " : "├── ";
      const icon = child.type === "tree" ? "📁 " : "📄 ";
      lines.push(`${prefix}${connector}${icon}${name}`);

      // If it's a directory, recurse
      if (child.type === "tree") {
        const newPrefix = prefix + (isLastChild ? "    " : "│   ");
        buildTree(newPrefix, child.path, isLastChild);
      }
    }
  }

  // Start with root
  lines.push("📦 Repository");
  buildTree("", "", true);

  return lines.join("\n");
}
