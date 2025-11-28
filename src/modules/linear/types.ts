/**
 * Linear module types
 */

export interface LinearTeam {
  id: string;
  name: string;
  key: string;
}

export interface LinearProject {
  id: string;
  name: string;
  description?: string;
}

export interface LinearIssue {
  id: string;
  identifier: string;
  title: string;
  description?: string;
  url: string;
  priority?: number;
  state?: {
    id: string;
    name: string;
  };
  assignee?: {
    id: string;
    name: string;
  };
  team?: {
    id: string;
    name: string;
    key: string;
  };
  project?: {
    id: string;
    name: string;
  };
}

export interface CreateIssueInput {
  title: string;
  description?: string;
  teamId: string;
  projectId?: string;
  priority?: number;
  assigneeId?: string;
  parentId?: string;
}

export interface UpdateIssueInput {
  issueId: string;
  title?: string;
  description?: string;
  priority?: number;
  stateId?: string;
  assigneeId?: string;
}
