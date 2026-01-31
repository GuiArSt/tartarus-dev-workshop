/**
 * Git client types and interfaces
 */

export interface FileTreeNode {
  path: string;
  type: "blob" | "tree";
  size?: number;
}

export type GitPlatform = "github" | "gitlab";

export interface ParsedRepoUrl {
  platform: GitPlatform;
  owner: string;
  repo: string;
}

export interface GitClient {
  /**
   * Get raw file content from repository
   */
  getFileContent(
    owner: string,
    repo: string,
    path: string,
    ref?: string,
  ): Promise<string>;

  /**
   * Get complete file tree of repository
   */
  getFileTree(
    owner: string,
    repo: string,
    ref?: string,
  ): Promise<FileTreeNode[]>;
}

export class GitError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public platform?: GitPlatform,
  ) {
    super(message);
    this.name = "GitError";
  }
}
