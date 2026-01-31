/**
 * Git MCP tool registrations
 */

import type { Server as McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { GitHubClient } from "./clients/github.js";
import { GitLabClient } from "./clients/gitlab.js";
import type { GitConfig } from "./config.js";
import { parseRepoUrl, formatFileTree } from "./utils.js";
import { toMcpError } from "../../shared/errors.js";
import { logger } from "../../shared/logger.js";

/**
 * Register Git tools with MCP server
 */
export async function registerGitTools(
  server: McpServer,
  gitConfig?: GitConfig,
): Promise<void> {
  if (!gitConfig?.enableGitTools) {
    logger.info("Git tools disabled - skipping registration");
    return;
  }

  logger.info("Registering Git tools...");

  // Initialize clients
  const githubClient = new GitHubClient(gitConfig.githubToken);
  const gitlabClient = new GitLabClient(
    gitConfig.gitlabToken,
    gitConfig.gitlabHost,
  );

  /**
   * Tool: git_parse_repo_url
   * Parse GitHub/GitLab URL to extract platform, owner, repo
   */
  server.registerTool(
    "git_parse_repo_url",
    {
      title: "Parse Repository URL",
      description:
        "Parse a GitHub or GitLab repository URL to extract platform, owner, and repository name",
      inputSchema: z.object({
        url: z
          .string()
          .url()
          .describe("Repository URL (e.g., https://github.com/user/repo)"),
      }),
    },
    async ({ url }) => {
      try {
        const parsed = parseRepoUrl(url);

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(parsed, null, 2),
            },
          ],
        };
      } catch (error) {
        throw toMcpError(error);
      }
    },
  );

  /**
   * Tool: git_read_file
   * Read raw file contents from GitHub/GitLab repository
   */
  server.registerTool(
    "git_read_file",
    {
      title: "Read Repository File",
      description:
        "Read raw contents of a file from a GitHub or GitLab repository",
      inputSchema: z.object({
        platform: z
          .enum(["github", "gitlab"])
          .describe("Git platform (github or gitlab)"),
        owner: z.string().describe("Repository owner or namespace"),
        repo: z.string().describe("Repository name"),
        path: z.string().describe("File path within repository"),
        ref: z
          .string()
          .optional()
          .default("main")
          .describe("Branch name or commit SHA (default: main)"),
      }),
    },
    async ({ platform, owner, repo, path, ref }) => {
      try {
        const client = platform === "github" ? githubClient : gitlabClient;
        const content = await client.getFileContent(owner, repo, path, ref);

        return {
          content: [
            {
              type: "text" as const,
              text: content,
            },
          ],
        };
      } catch (error) {
        throw toMcpError(error);
      }
    },
  );

  /**
   * Tool: git_get_file_tree
   * Get complete file tree/map of repository
   */
  server.registerTool(
    "git_get_file_tree",
    {
      title: "Get Repository File Tree",
      description:
        "Get the complete file tree structure of a GitHub or GitLab repository",
      inputSchema: z.object({
        platform: z
          .enum(["github", "gitlab"])
          .describe("Git platform (github or gitlab)"),
        owner: z.string().describe("Repository owner or namespace"),
        repo: z.string().describe("Repository name"),
        ref: z
          .string()
          .optional()
          .default("main")
          .describe("Branch name or commit SHA (default: main)"),
      }),
    },
    async ({ platform, owner, repo, ref }) => {
      try {
        const client = platform === "github" ? githubClient : gitlabClient;
        const tree = await client.getFileTree(owner, repo, ref);

        // Format as ASCII tree
        const formatted = formatFileTree(tree);

        return {
          content: [
            {
              type: "text" as const,
              text: formatted,
            },
          ],
        };
      } catch (error) {
        throw toMcpError(error);
      }
    },
  );

  logger.info("Git tools registered successfully");
}
