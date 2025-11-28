import { LinearClient as LinearSDK } from '@linear/sdk';
import { LinearAPIError } from '../../shared/errors.js';
import { logger } from '../../shared/logger.js';
import type {
  LinearTeam,
  LinearProject,
  LinearIssue,
  CreateIssueInput,
  UpdateIssueInput,
} from './types.js';

/**
 * Linear API client wrapper using official SDK
 */
export class LinearClient {
  private sdk: LinearSDK;

  constructor(apiKey: string) {
    this.sdk = new LinearSDK({ apiKey });
    logger.debug('Linear client initialized');
  }

  async getViewer(): Promise<{
    id: string;
    name: string;
    email: string;
    teams: LinearTeam[];
    projects: LinearProject[];
  }> {
    try {
      logger.debug('Fetching viewer info (current user)');
      const viewer = await this.sdk.viewer;
      const teams = await viewer.teams();

      // Get all projects the user has access to
      const allProjects = await this.sdk.projects();

      return {
        id: viewer.id,
        name: viewer.name,
        email: viewer.email,
        teams: teams.nodes.map((team) => ({
          id: team.id,
          name: team.name,
          key: team.key,
        })),
        projects: allProjects.nodes.map((project) => ({
          id: project.id,
          name: project.name,
          description: project.description,
        })),
      };
    } catch (error) {
      throw new LinearAPIError(
        `Failed to get viewer: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error
      );
    }
  }

  async listTeams(): Promise<LinearTeam[]> {
    try {
      logger.debug('Fetching Linear teams');
      const teams = await this.sdk.teams();
      return teams.nodes.map((team) => ({
        id: team.id,
        name: team.name,
        key: team.key,
      }));
    } catch (error) {
      throw new LinearAPIError(
        `Failed to list teams: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error
      );
    }
  }

  async listProjects(teamId?: string): Promise<LinearProject[]> {
    try {
      logger.debug(`Fetching Linear projects${teamId ? ` for team ${teamId}` : ''}`);

      // Fetch all projects (Linear SDK doesn't support team filtering on projects easily)
      const projectsQuery = await this.sdk.projects();

      return projectsQuery.nodes.map((project) => ({
        id: project.id,
        name: project.name,
        description: project.description,
      }));
    } catch (error) {
      throw new LinearAPIError(
        `Failed to list projects: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error
      );
    }
  }

  async listIssues(options: {
    assigneeId?: string;
    stateId?: string;
    teamId?: string;
    projectId?: string;
    query?: string;
    limit?: number;
  } = {}): Promise<LinearIssue[]> {
    try {
      const { assigneeId, stateId, teamId, projectId, query, limit = 50 } = options;

      logger.debug(`Listing Linear issues with filters:`, options);

      // Build filter object
      const filter: any = {};

      if (assigneeId) {
        filter.assignee = { id: { eq: assigneeId } };
      }

      if (stateId) {
        filter.state = { id: { eq: stateId } };
      }

      if (teamId) {
        filter.team = { id: { eq: teamId } };
      }

      if (projectId) {
        filter.project = { id: { eq: projectId } };
      }

      if (query) {
        filter.or = [
          { title: { contains: query } },
          { description: { contains: query } },
          { identifier: { contains: query } },
        ];
      }

      const issues = await this.sdk.issues({
        filter: Object.keys(filter).length > 0 ? filter : undefined,
        first: limit
      });

      return await Promise.all(
        issues.nodes.map(async (issue) => {
          const state = await issue.state;
          const assignee = await issue.assignee;
          const team = await issue.team;
          const project = await issue.project;

          return {
            id: issue.id,
            identifier: issue.identifier,
            title: issue.title,
            description: issue.description,
            url: issue.url,
            priority: issue.priority,
            state: state ? { id: state.id, name: state.name } : undefined,
            assignee: assignee ? { id: assignee.id, name: assignee.name } : undefined,
            team: team ? { id: team.id, name: team.name, key: team.key } : undefined,
            project: project ? { id: project.id, name: project.name } : undefined,
          };
        })
      );
    } catch (error) {
      throw new LinearAPIError(
        `Failed to list issues: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error
      );
    }
  }

  async createIssue(input: CreateIssueInput): Promise<LinearIssue> {
    try {
      logger.debug(`Creating Linear issue: ${input.title}`);

      const issuePayload: any = {
        title: input.title,
        teamId: input.teamId,
      };

      if (input.description) issuePayload.description = input.description;
      if (input.projectId) issuePayload.projectId = input.projectId;
      if (input.priority !== undefined) issuePayload.priority = input.priority;
      if (input.assigneeId) issuePayload.assigneeId = input.assigneeId;
      if (input.parentId) issuePayload.parentId = input.parentId;

      const result = await this.sdk.createIssue(issuePayload);
      const issue = await result.issue;

      if (!issue) {
        throw new LinearAPIError('Failed to create issue: No issue returned');
      }

      return {
        id: issue.id,
        identifier: issue.identifier,
        title: issue.title,
        description: issue.description,
        url: issue.url,
        priority: issue.priority,
      };
    } catch (error) {
      throw new LinearAPIError(
        `Failed to create issue: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error
      );
    }
  }

  async updateIssue(input: UpdateIssueInput): Promise<LinearIssue> {
    try {
      logger.debug(`Updating Linear issue: ${input.issueId}`);

      const updatePayload: any = {};
      if (input.title) updatePayload.title = input.title;
      if (input.description !== undefined) updatePayload.description = input.description;
      if (input.priority !== undefined) updatePayload.priority = input.priority;
      if (input.stateId) updatePayload.stateId = input.stateId;
      if (input.assigneeId) updatePayload.assigneeId = input.assigneeId;

      const result = await this.sdk.updateIssue(input.issueId, updatePayload);
      const issue = await result.issue;

      if (!issue) {
        throw new LinearAPIError('Failed to update issue: No issue returned');
      }

      return {
        id: issue.id,
        identifier: issue.identifier,
        title: issue.title,
        description: issue.description,
        url: issue.url,
        priority: issue.priority,
      };
    } catch (error) {
      throw new LinearAPIError(
        `Failed to update issue: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error
      );
    }
  }
}
