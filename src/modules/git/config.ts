/**
 * Git configuration interface
 */

export interface GitConfig {
  githubToken?: string; // Fine-grained PAT for GitHub
  gitlabToken?: string; // PAT for GitLab
  gitlabHost?: string; // Default: https://gitlab.com
  enableGitTools?: boolean; // Feature flag
}
