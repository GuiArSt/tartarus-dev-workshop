/**
 * GitHub client using Octokit
 */

import { Octokit } from "octokit";
import type { GitClient, FileTreeNode } from "./types.js";
import { GitError } from "./types.js";

export class GitHubClient implements GitClient {
  private octokit: Octokit;

  constructor(token?: string) {
    this.octokit = new Octokit({
      auth: token,
    });
  }

  /**
   * Get raw file content from GitHub repository
   */
  async getFileContent(
    owner: string,
    repo: string,
    path: string,
    ref: string = "main",
  ): Promise<string> {
    try {
      const { data } = await this.octokit.rest.repos.getContent({
        owner,
        repo,
        path,
        ref,
        mediaType: { format: "raw" }, // Get raw content, not base64
      });

      // Type guard: data should be string when using raw format
      if (typeof data !== "string") {
        throw new GitError("Unexpected response format from GitHub API");
      }

      return data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  /**
   * Get complete file tree of repository using GitHub Tree API
   */
  async getFileTree(
    owner: string,
    repo: string,
    ref: string = "main",
  ): Promise<FileTreeNode[]> {
    try {
      const { data } = await this.octokit.rest.git.getTree({
        owner,
        repo,
        tree_sha: ref,
        recursive: "true", // Get all files recursively
      });

      // Map GitHub tree format to our FileTreeNode format
      return data.tree.map((item) => ({
        path: item.path || "",
        type: item.type === "blob" ? "blob" : "tree",
        size: item.size,
      }));
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  /**
   * Handle GitHub API errors and convert to GitError
   */
  private handleError(error: any): GitError {
    const status = error.status || error.response?.status;
    const message = error.message || "GitHub API error";

    if (status === 401) {
      return new GitError(
        "Unauthorized: Invalid or missing GitHub token",
        401,
        "github",
      );
    }

    if (status === 403) {
      // Check if rate limited
      if (error.response?.headers?.["x-ratelimit-remaining"] === "0") {
        return new GitError("GitHub API rate limit exceeded", 403, "github");
      }
      return new GitError(
        "Forbidden: Insufficient permissions to access repository",
        403,
        "github",
      );
    }

    if (status === 404) {
      return new GitError(
        "Not found: Repository or file does not exist",
        404,
        "github",
      );
    }

    return new GitError(`GitHub API error: ${message}`, status, "github");
  }
}
