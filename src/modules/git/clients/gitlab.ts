/**
 * GitLab client using Gitbeaker
 */

import { Gitlab } from "@gitbeaker/rest";
import type { GitClient, FileTreeNode } from "./types.js";
import { GitError } from "./types.js";

export class GitLabClient implements GitClient {
  private gitlab: InstanceType<typeof Gitlab>;

  constructor(token?: string, host: string = "https://gitlab.com") {
    this.gitlab = new Gitlab({
      host,
      token,
    });
  }

  /**
   * Get raw file content from GitLab repository
   */
  async getFileContent(
    owner: string,
    repo: string,
    path: string,
    ref: string = "main",
  ): Promise<string> {
    try {
      const projectId = `${owner}/${repo}`;

      // GitLab API returns raw file content
      const content = await this.gitlab.RepositoryFiles.showRaw(
        projectId,
        path,
        ref,
      );

      // Content should be a string
      if (typeof content !== "string") {
        throw new GitError("Unexpected response format from GitLab API");
      }

      return content;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  /**
   * Get complete file tree of repository using GitLab Repository Tree API
   */
  async getFileTree(
    owner: string,
    repo: string,
    ref: string = "main",
  ): Promise<FileTreeNode[]> {
    try {
      const projectId = `${owner}/${repo}`;

      // Get repository tree recursively
      const tree = await this.gitlab.Repositories.allRepositoryTrees(
        projectId,
        {
          ref,
          recursive: true,
          perPage: 100, // GitLab pagination
        },
      );

      // Map GitLab tree format to our FileTreeNode format
      return tree.map((item: any) => ({
        path: item.path || "",
        type: item.type === "blob" ? "blob" : "tree",
      }));
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  /**
   * Handle GitLab API errors and convert to GitError
   */
  private handleError(error: any): GitError {
    const status = error.response?.status || error.statusCode;
    const message = error.message || "GitLab API error";

    if (status === 401) {
      return new GitError(
        "Unauthorized: Invalid or missing GitLab token",
        401,
        "gitlab",
      );
    }

    if (status === 403) {
      return new GitError(
        "Forbidden: Insufficient permissions to access repository",
        403,
        "gitlab",
      );
    }

    if (status === 404) {
      return new GitError(
        "Not found: Repository or file does not exist",
        404,
        "gitlab",
      );
    }

    if (status === 429) {
      return new GitError("GitLab API rate limit exceeded", 429, "gitlab");
    }

    return new GitError(`GitLab API error: ${message}`, status, "gitlab");
  }
}
