/**
 * Git tools for AI SDK (Kronus deep mode)
 */

import { tool } from "ai";
import { z } from "zod";
import { GitHubClient } from "./clients/github.js";
import { GitLabClient } from "./clients/gitlab.js";
import type { GitConfig } from "./config.js";
import { formatFileTree } from "./utils.js";

/**
 * Create Git tools for AI SDK agentic exploration
 */
export function createGitTools(gitConfig?: GitConfig) {
  if (!gitConfig?.enableGitTools) {
    return {};
  }

  // Initialize clients
  const githubClient = new GitHubClient(gitConfig.githubToken);
  const gitlabClient = new GitLabClient(
    gitConfig.gitlabToken,
    gitConfig.gitlabHost,
  );

  return {
    readRepositoryFile: tool({
      description:
        "Read raw file contents from a GitHub or GitLab repository. Use this when you need to examine specific code files to understand implementation details.",
      parameters: z.object({
        platform: z
          .enum(["github", "gitlab"])
          .describe(
            'Git platform - use "github" for GitHub repositories, "gitlab" for GitLab repositories',
          ),
        owner: z
          .string()
          .describe(
            'Repository owner or namespace (e.g., "facebook" for facebook/react)',
          ),
        repo: z
          .string()
          .describe('Repository name (e.g., "react" for facebook/react)'),
        path: z
          .string()
          .describe('File path within repository (e.g., "src/index.ts")'),
        ref: z
          .string()
          .optional()
          .default("main")
          .describe('Branch name or commit SHA to read from (default: "main")'),
      }),
      execute: async ({ platform, owner, repo, path, ref }) => {
        try {
          const client = platform === "github" ? githubClient : gitlabClient;
          const content = await client.getFileContent(owner, repo, path, ref);

          return content;
        } catch (error: any) {
          return `Error reading file: ${error.message}`;
        }
      },
    }),

    getRepositoryFileTree: tool({
      description:
        "Get the complete file tree structure of a GitHub or GitLab repository. Use this to explore repository organization and find relevant files.",
      parameters: z.object({
        platform: z
          .enum(["github", "gitlab"])
          .describe(
            'Git platform - use "github" for GitHub repositories, "gitlab" for GitLab repositories',
          ),
        owner: z
          .string()
          .describe(
            'Repository owner or namespace (e.g., "vercel" for vercel/next.js)',
          ),
        repo: z
          .string()
          .describe('Repository name (e.g., "next.js" for vercel/next.js)'),
        ref: z
          .string()
          .optional()
          .default("main")
          .describe('Branch name or commit SHA (default: "main")'),
      }),
      execute: async ({ platform, owner, repo, ref }) => {
        try {
          const client = platform === "github" ? githubClient : gitlabClient;
          const tree = await client.getFileTree(owner, repo, ref);

          // Format as ASCII tree
          const formatted = formatFileTree(tree);
          return formatted;
        } catch (error: any) {
          return `Error fetching file tree: ${error.message}`;
        }
      },
    }),
  };
}
