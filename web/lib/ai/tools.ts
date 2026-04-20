import { z } from "zod";
import { normalizeRepository } from "@/lib/utils";

/**
 * Tool definitions for Kronus chat — SINGLE SOURCE OF TRUTH
 * Following the Vercel AI SDK pattern: server defines schemas, client executes
 */

export const toolSpecs = {
  // ===== Journal Entry Tools =====
  journal_create_entry: {
    description:
      "Create a new journal entry for a git commit. Use this when the user provides a commit report or asks to document their work.",
    inputSchema: z.object({
      commit_hash: z.string().min(7).describe("Git commit SHA (minimum 7 chars)"),
      repository: z.string().min(1).transform(normalizeRepository).describe("Repository/project name"),
      branch: z.string().min(1).describe("Git branch name"),
      author: z.string().min(1).describe("Git commit author"),
      date: z.string().describe("Commit date (ISO 8601 format)"),
      raw_agent_report: z.string().min(10).describe("Full context of the work done"),
    }),
  },

  journal_get_entry: {
    description:
      "Retrieve a journal entry by its commit hash. Use this to look up details about a specific commit.",
    inputSchema: z.object({
      commit_hash: z.string().min(7).describe("Git commit SHA to look up"),
    }),
  },

  journal_list_by_repository: {
    description:
      "List all journal entries for a repository. Use this to browse development history.",
    inputSchema: z.object({
      repository: z.string().min(1).transform(normalizeRepository).describe("Repository name to search"),
      limit: z.number().optional().default(20).describe("Max entries to return"),
      offset: z.number().optional().default(0).describe("Pagination offset"),
    }),
  },

  journal_list_by_branch: {
    description: "List journal entries for a specific branch in a repository.",
    inputSchema: z.object({
      repository: z.string().min(1).transform(normalizeRepository).describe("Repository name"),
      branch: z.string().min(1).describe("Branch name"),
      limit: z.number().optional().default(20).describe("Max entries to return"),
      offset: z.number().optional().default(0).describe("Pagination offset"),
    }),
  },

  journal_list_repositories: {
    description:
      "List all repositories that have journal entries. Use this to discover available projects.",
    inputSchema: z.object({}),
  },

  journal_list_branches: {
    description: "List all branches in a repository that have journal entries.",
    inputSchema: z.object({
      repository: z.string().min(1).transform(normalizeRepository).describe("Repository name"),
    }),
  },

  journal_edit_entry: {
    description:
      "Update fields in an existing journal entry. Use this to correct or enhance documentation.",
    inputSchema: z.object({
      commit_hash: z.string().min(7).describe("Commit hash of entry to update"),
      why: z.string().optional().describe("Updated 'why' field"),
      what_changed: z.string().optional().describe("Updated 'what changed' field"),
      decisions: z.string().optional().describe("Updated 'decisions' field"),
      technologies: z
        .string()
        .optional()
        .describe(
          "Comma-separated list of technologies used. NO markdown, just names: 'React, TypeScript, PostgreSQL'"
        ),
      kronus_wisdom: z.string().nullable().optional().describe("Updated wisdom/reflection"),
    }),
  },

  journal_regenerate_entry: {
    description: "Use AI to regenerate or refine an existing journal entry with new context.",
    inputSchema: z.object({
      commit_hash: z.string().min(7).describe("Commit hash of entry to regenerate"),
      new_context: z.string().optional().describe("New context or instructions for regeneration"),
      use_existing_as_context: z
        .boolean()
        .optional()
        .default(false)
        .describe("Consider existing entry when regenerating"),
    }),
  },

  // ===== Project Summary Tools =====
  journal_get_project_summary: {
    description:
      "Get the high-level project summary for a repository. Contains architecture, purpose, and key decisions.",
    inputSchema: z.object({
      repository: z.string().min(1).transform(normalizeRepository).describe("Repository name"),
    }),
  },

  journal_upsert_project_summary: {
    description: "Create or update the project summary for a repository.",
    inputSchema: z.object({
      repository: z.string().min(1).transform(normalizeRepository).describe("Repository name"),
      git_url: z.string().url().describe("Git repository URL"),
      summary: z.string().min(10).describe("High-level project summary"),
      purpose: z.string().min(10).describe("Why this project exists"),
      architecture: z.string().min(10).describe("Overall architecture"),
      key_decisions: z.string().min(10).describe("Major decisions"),
      technologies: z
        .string()
        .min(3)
        .describe(
          "Comma-separated list of technologies. NO markdown formatting, NO labels like 'Frontend:' or 'Backend:'. Just technology names separated by commas. Example: 'Next.js, React, TypeScript, PostgreSQL, Tailwind CSS'"
        ),
      status: z
        .string()
        .min(3)
        .describe(
          "Current project status - a short phrase like 'Production-ready', 'In development', 'Beta', etc."
        ),
    }),
  },

  journal_list_project_summaries: {
    description: "List all project summaries across repositories.",
    inputSchema: z.object({
      limit: z.number().optional().default(30).describe("Max summaries to return"),
      offset: z.number().optional().default(0).describe("Pagination offset"),
    }),
  },

  // ===== Attachment Tools =====
  journal_list_attachments: {
    description: "List attachments for a journal entry by commit hash.",
    inputSchema: z.object({
      commit_hash: z.string().min(7).describe("Commit hash"),
    }),
  },

  journal_get_attachment: {
    description: "Get details about a specific attachment by ID.",
    inputSchema: z.object({
      attachment_id: z.number().positive().describe("Attachment ID"),
    }),
  },

  // ===== Database Tools =====
  journal_backup: {
    description: "Manually trigger a database backup to SQL file.",
    inputSchema: z.object({}),
  },

  // ===== Linear Integration Tools (API) =====
  linear_get_viewer: {
    description: "Get the authenticated user's Linear profile, including their teams and team IDs. Useful for discovering team context before querying team-wide issues or projects.",
    inputSchema: z.object({}),
  },

  linear_list_issues: {
    description:
      "List issues from the Linear API. By default returns only issues assigned to the user (cached locally). Set showAll=true to query the full workspace/team — use this when the user asks about teammates' work, team progress, or issues not assigned to them.",
    inputSchema: z.object({
      assigneeId: z.string().optional().describe("Filter by assignee user ID"),
      teamId: z.string().optional().describe("Filter by team ID"),
      projectId: z.string().optional().describe("Filter by project ID"),
      query: z.string().optional().describe("Search in title/description"),
      limit: z.number().optional().default(50).describe("Max results"),
      showAll: z.boolean().optional().default(false).describe("Show all workspace issues, not just the user's. Use for team-wide queries."),
    }),
  },

  linear_create_issue: {
    description: "Create a new issue in Linear.",
    inputSchema: z.object({
      title: z.string().min(1).describe("Issue title"),
      description: z.string().optional().describe("Issue description (markdown)"),
      teamId: z.string().describe("Team ID (required)"),
      projectId: z.string().optional().describe("Project ID"),
      priority: z
        .number()
        .min(0)
        .max(4)
        .optional()
        .describe("Priority: 0=None, 1=Urgent, 2=High, 3=Medium, 4=Low"),
      assigneeId: z.string().optional().describe("Assignee user ID"),
    }),
  },

  linear_update_issue: {
    description: "Update an existing Linear issue.",
    inputSchema: z.object({
      issueId: z.string().describe("Issue ID to update"),
      title: z.string().optional().describe("New title"),
      description: z.string().optional().describe("New description"),
      priority: z.number().min(0).max(4).optional().describe("New priority"),
      stateId: z.string().optional().describe("New state ID"),
      assigneeId: z.string().optional().describe("New assignee ID"),
    }),
  },

  linear_list_projects: {
    description:
      "List projects from the Linear API. Returns all accessible workspace projects (not just the user's). Use teamId to narrow by team. The local cache only stores projects the user is a member of — this tool queries beyond the cache.",
    inputSchema: z.object({
      teamId: z.string().optional().describe("Filter by team ID"),
    }),
  },

  linear_create_project: {
    description:
      "Create a new project in Linear. Projects help organize related issues and track progress toward goals.",
    inputSchema: z.object({
      name: z.string().min(1).describe("Project name"),
      teamIds: z
        .array(z.string())
        .min(1)
        .describe("Array of team IDs to associate with the project (at least one required)"),
      description: z.string().optional().describe("Project description (plain text)"),
      content: z.string().optional().describe("Project content (rich text markdown)"),
      leadId: z.string().optional().describe("User ID for the project lead"),
      targetDate: z.string().optional().describe("Target completion date (ISO 8601 format)"),
      startDate: z.string().optional().describe("Project start date (ISO 8601 format)"),
    }),
  },

  linear_update_project: {
    description: "Update an existing Linear project.",
    inputSchema: z.object({
      projectId: z.string().describe("Project ID to update"),
      name: z.string().optional().describe("New name"),
      description: z.string().optional().describe("New description"),
      content: z.string().optional().describe("New content (rich text)"),
      leadId: z.string().optional().describe("User ID for the project lead"),
      targetDate: z
        .string()
        .optional()
        .describe('Target completion date (ISO 8601 format, e.g., "2026-03-01")'),
      startDate: z
        .string()
        .optional()
        .describe('Project start date (ISO 8601 format, e.g., "2026-01-15")'),
    }),
  },

  linear_create_project_update: {
    description:
      "Post a status update on a Linear project. Use this to communicate project progress, blockers, or health changes. The update appears on the project's timeline in Linear.",
    inputSchema: z.object({
      projectId: z.string().describe("Linear project ID"),
      body: z
        .string()
        .min(1)
        .describe("Update content in markdown format. Include progress, blockers, next steps."),
      health: z
        .enum(["onTrack", "atRisk", "offTrack"])
        .describe("Project health status: onTrack, atRisk, or offTrack"),
    }),
  },

  linear_list_project_updates: {
    description:
      "List recent status updates for a Linear project. Shows the project timeline with health changes and progress notes.",
    inputSchema: z.object({
      projectId: z.string().describe("Linear project ID"),
    }),
  },

  // ===== Linear Cache Tools (read from local DB, not API) =====
  linear_get_issue: {
    description:
      "Get full issue details from local cache by identifier (e.g., 'ENG-1234') or ID. Use this to read complete issue descriptions. Does NOT hit Linear API - reads from synced local database.",
    inputSchema: z.object({
      identifier: z.string().describe("Issue identifier (e.g., 'ENG-1234') or Linear issue ID"),
    }),
  },

  linear_get_project: {
    description:
      "Get full project details from local cache by ID. Use this to read complete project descriptions and content. Does NOT hit Linear API - reads from synced local database.",
    inputSchema: z.object({
      projectId: z.string().describe("Linear project ID"),
    }),
  },

  // ===== Slite Integration Tools =====
  slite_search_notes: {
    description:
      "Search notes in the Slite knowledge base. Returns matching notes with highlights. Use this to find documentation, processes, or team knowledge.",
    inputSchema: z.object({
      query: z.string().min(1).describe("Search query"),
      parentNoteId: z.string().optional().describe("Filter to children of this note"),
      hitsPerPage: z.number().optional().default(10).describe("Max results per page"),
    }),
  },

  slite_get_note: {
    description:
      "Get the full content of a Slite note by ID. Returns markdown content. Use after searching to read a specific note.",
    inputSchema: z.object({
      noteId: z.string().describe("Slite note ID"),
    }),
  },

  slite_create_note: {
    description:
      "Create a new note in Slite. Content should be markdown. Use parentNoteId to nest under an existing note.",
    inputSchema: z.object({
      title: z.string().min(1).describe("Note title"),
      markdown: z.string().optional().describe("Note content in markdown"),
      parentNoteId: z.string().optional().describe("Parent note ID for nesting"),
    }),
  },

  slite_update_note: {
    description: "Update an existing Slite note's title or content.",
    inputSchema: z.object({
      noteId: z.string().describe("Note ID to update"),
      title: z.string().optional().describe("New title"),
      markdown: z.string().optional().describe("New content in markdown"),
    }),
  },

  slite_ask: {
    description:
      "Ask Slite AI a question about the workspace knowledge base. Returns an AI-generated answer with source references. Great for finding information across all team documentation.",
    inputSchema: z.object({
      question: z.string().min(1).describe("Question to ask about the knowledge base"),
    }),
  },

  // ===== Notion Integration Tools =====
  notion_search_pages: {
    description:
      "Search pages in the Notion workspace. Returns matching pages with titles and URLs. Use this to find documentation, meeting notes, or team knowledge.",
    inputSchema: z.object({
      query: z.string().min(1).describe("Search query"),
      pageSize: z
        .number()
        .optional()
        .default(10)
        .describe("Max results to return"),
    }),
  },

  notion_get_page: {
    description:
      "Get the full content of a Notion page by ID. Returns markdown content converted from Notion blocks. Use after searching to read a specific page.",
    inputSchema: z.object({
      pageId: z.string().describe("Notion page ID"),
    }),
  },

  notion_create_page: {
    description:
      "Create a new page in Notion. Content should be plain text or simple markdown. Requires a parent page ID or database ID.",
    inputSchema: z.object({
      title: z.string().min(1).describe("Page title"),
      markdown: z.string().optional().describe("Page content as text"),
      parentPageId: z
        .string()
        .optional()
        .describe("Parent page ID (for nested pages)"),
      parentDatabaseId: z
        .string()
        .optional()
        .describe("Parent database ID (for database entries)"),
    }),
  },

  notion_update_page: {
    description:
      "Update an existing Notion page's title or append content. Cannot replace existing content — only append new blocks.",
    inputSchema: z.object({
      pageId: z.string().describe("Page ID to update"),
      title: z.string().optional().describe("New title"),
      markdown: z
        .string()
        .optional()
        .describe("Content to append (added as new blocks)"),
      archived: z.boolean().optional().describe("Archive or unarchive the page"),
    }),
  },

  // ===== Gemini Search Grounding =====
  gemini_search: {
    description:
      "Search the web using Google Search grounding via Gemini. Returns a synthesized answer with cited sources and confidence scores. Use this for current events, real-time data, factual lookups, or any query requiring up-to-date web information.",
    inputSchema: z.object({
      query: z
        .string()
        .min(1)
        .describe("Search query - be specific for better grounded results"),
    }),
  },

  // ===== Image Generation =====
  replicate_generate_image: {
    description:
      "Generate an image using Gemini 3 Pro Image (Nano Banana Pro), FLUX, or other models. Gemini 3 Pro has 4K support and excellent text rendering. Use this when the user wants to create images from text prompts.",
    inputSchema: z.object({
      prompt: z.string().min(1).describe("Text prompt describing the image to generate"),
      model: z
        .string()
        .optional()
        .default("gemini-3-pro-image-preview")
        .describe(
          "Model identifier. " +
            "Gemini 3 Pro Image (default): 'gemini-3-pro-image-preview' or 'nano-banana-pro' (4K, best text rendering). " +
            "Gemini 2.5 Flash: 'gemini-2.5-flash-image-preview' (fast). " +
            "FLUX.2: 'black-forest-labs/flux-2-pro' (best quality), 'black-forest-labs/flux-schnell' (fastest). " +
            "Imagen: 'imagen-3.0-generate-002'. " +
            "Stable Diffusion: 'stability-ai/stable-diffusion-3.5-large', 'stability-ai/sdxl'."
        ),
      width: z.number().optional().default(1024).describe("Image width in pixels"),
      height: z.number().optional().default(1024).describe("Image height in pixels"),
      num_outputs: z.number().optional().default(1).describe("Number of images to generate"),
      guidance_scale: z
        .number()
        .optional()
        .describe(
          "Guidance scale (Replicate models only, usually 3.5-7.5 for FLUX, 1-20 for SDXL)"
        ),
      num_inference_steps: z
        .number()
        .optional()
        .describe(
          "Number of inference steps (Replicate models only, more steps = higher quality but slower)"
        ),
    }),
  },

  // ===== Media/Image Storage Tools =====
  save_image: {
    description:
      "Save an image to the Media library. Images are stored centrally and can be linked to Journal entries and/or Repository documents. Use this after generating an image to permanently store it.",
    inputSchema: z.object({
      url: z.string().url().describe("URL of the image to download and save"),
      filename: z
        .string()
        .min(1)
        .describe("Filename for the saved image (e.g., 'architecture-diagram.png')"),
      description: z.string().optional().describe("Description of what the image shows"),
      prompt: z
        .string()
        .optional()
        .describe("The prompt used to generate the image (if AI-generated)"),
      model: z
        .string()
        .optional()
        .describe("The model used to generate the image (if AI-generated)"),
      tags: z.array(z.string()).optional().default([]).describe("Tags for categorizing the image"),
      commit_hash: z.string().optional().describe("Link to a journal entry by commit hash"),
      document_id: z.number().optional().describe("Link to a repository document by ID"),
    }),
  },

  list_media: {
    description:
      "List saved media assets from the Media library. Can filter by linked journal entry or document.",
    inputSchema: z.object({
      commit_hash: z.string().optional().describe("Filter by linked journal entry commit hash"),
      document_id: z.number().optional().describe("Filter by linked repository document ID"),
      limit: z.number().optional().default(20).describe("Maximum number of results"),
    }),
  },

  get_media: {
    description:
      "Get a specific media asset by ID and display it inline. Use this to show an image in the chat.",
    inputSchema: z.object({
      id: z.number().describe("Media asset ID to fetch and display"),
    }),
  },

  update_media: {
    description:
      "Update metadata for a saved media asset. Use this to add descriptions, tags, or link images to journal entries or documents.",
    inputSchema: z.object({
      id: z.number().describe("Media asset ID to update"),
      filename: z.string().optional().describe("New filename"),
      description: z.string().optional().describe("New description"),
      tags: z.array(z.string()).optional().describe("New tags array"),
      commit_hash: z.string().optional().describe("Link to journal entry by commit hash"),
      document_id: z.number().optional().describe("Link to repository document by ID"),
    }),
  },

  // ===== Repository Tools =====
  repository_search_documents: {
    description:
      "Search and query documents from the Repository. Can filter by type (writing, prompt, note), search by keywords, and control pagination.",
    inputSchema: z.object({
      type: z.enum(["writing", "prompt", "note"]).optional().describe("Filter by document type"),
      search: z.string().optional().describe("Search in title and content"),
      limit: z.number().optional().default(50).describe("Maximum results"),
      offset: z.number().optional().default(0).describe("Pagination offset"),
    }),
  },

  repository_get_document: {
    description: "Get a specific document from the Repository by slug or ID",
    inputSchema: z.object({
      slug: z.string().optional().describe("Document slug"),
      id: z.number().optional().describe("Document ID"),
    }),
  },

  repository_create_document: {
    description: "Create a new document in the Repository",
    inputSchema: z.object({
      title: z.string().min(1).describe("Document title"),
      content: z.string().min(1).describe("Document content (markdown supported)"),
      type: z.enum(["writing", "prompt", "note"]).default("writing").describe("Document type"),
      tags: z.array(z.string()).optional().describe("Tags for categorization"),
      metadata: z
        .record(z.string(), z.any())
        .optional()
        .describe("Additional metadata (year, language, etc.)"),
    }),
  },

  repository_update_document: {
    description: "Update an existing document in the Repository",
    inputSchema: z.object({
      id: z.number().describe("Document ID to update"),
      title: z.string().optional().describe("New title"),
      content: z.string().optional().describe("New content"),
      tags: z.array(z.string()).optional().describe("New tags"),
      metadata: z.record(z.string(), z.any()).optional().describe("Updated metadata"),
    }),
  },

  repository_list_skills: {
    description: "List all skills from the CV/Repository",
    inputSchema: z.object({
      category: z.string().optional().describe("Filter by category"),
    }),
  },

  repository_update_skill: {
    description: "Update a skill entry",
    inputSchema: z.object({
      id: z.string().describe("Skill ID"),
      name: z.string().optional(),
      category: z.string().optional(),
      magnitude: z.number().min(1).max(5).optional(),
      description: z.string().optional(),
      tags: z.array(z.string()).optional(),
    }),
  },

  repository_create_skill: {
    description:
      "Create a new skill entry in the CV. Categories: 'AI & Development', 'Languages & Frameworks', 'Data & Analytics', 'Infrastructure & DevOps', 'Design & UX', 'Leadership & Collaboration'. Magnitude is 1-5 (5=expert).",
    inputSchema: z.object({
      id: z.string().describe("Unique skill ID (lowercase, no spaces, e.g. 'react-native')"),
      name: z.string().describe("Display name (e.g. 'React Native')"),
      category: z
        .string()
        .describe(
          "One of: 'AI & Development', 'Languages & Frameworks', 'Data & Analytics', 'Infrastructure & DevOps', 'Design & UX', 'Leadership & Collaboration'"
        ),
      magnitude: z.number().min(1).max(5).describe("Proficiency level 1-5 (5=expert)"),
      description: z.string().describe("Brief description of expertise"),
      icon: z.string().optional().describe("Icon identifier (optional)"),
      color: z.string().optional().describe("Color hex code (optional)"),
      url: z.string().optional().describe("Reference URL (optional)"),
      tags: z.array(z.string()).optional().describe("Tags for categorization"),
      firstUsed: z.string().optional().describe("Year first used (e.g. '2020')"),
      lastUsed: z.string().optional().describe("Year last used or 'Present'"),
    }),
  },

  repository_list_experience: {
    description: "List work experience entries",
    inputSchema: z.object({}),
  },

  repository_create_experience: {
    description: "Create a new work experience entry in the CV",
    inputSchema: z.object({
      id: z.string().describe("Unique ID (lowercase, no spaces, e.g. 'company-role-2024')"),
      title: z.string().describe("Job title"),
      company: z.string().describe("Company name"),
      department: z.string().optional().describe("Department (optional)"),
      location: z.string().describe("Location (e.g. 'Helsinki, Finland')"),
      dateStart: z.string().describe("Start date (e.g. '2022-01')"),
      dateEnd: z.string().optional().describe("End date or leave empty for current"),
      tagline: z.string().describe("Brief role description/tagline"),
      note: z.string().optional().describe("Additional notes (optional)"),
      achievements: z.array(z.string()).optional().describe("List of key achievements"),
    }),
  },

  repository_update_experience: {
    description: "Update an existing work experience entry",
    inputSchema: z.object({
      id: z.string().describe("Experience ID to update"),
      title: z.string().optional().describe("Updated job title"),
      company: z.string().optional().describe("Updated company name"),
      tagline: z.string().optional().describe("Updated tagline"),
      achievements: z.array(z.string()).optional().describe("Updated achievements"),
      dateStart: z.string().optional().describe("Updated start date (YYYY-MM)"),
      dateEnd: z
        .string()
        .nullable()
        .optional()
        .describe("Updated end date (YYYY-MM or null for current)"),
    }),
  },

  repository_list_education: {
    description: "List education entries",
    inputSchema: z.object({}),
  },

  repository_create_education: {
    description: "Create a new education entry in the CV",
    inputSchema: z.object({
      id: z.string().describe("Unique ID (lowercase, no spaces, e.g. 'university-degree-2020')"),
      degree: z.string().describe("Degree type (e.g. 'Bachelor of Science')"),
      field: z.string().describe("Field of study (e.g. 'Computer Science')"),
      institution: z.string().describe("Institution name"),
      location: z.string().describe("Location (e.g. 'Helsinki, Finland')"),
      dateStart: z.string().describe("Start date (e.g. '2016-09')"),
      dateEnd: z.string().describe("End date (e.g. '2020-06')"),
      tagline: z.string().describe("Brief description/tagline"),
      note: z.string().optional().describe("Additional notes (optional)"),
      focusAreas: z.array(z.string()).optional().describe("Areas of focus/specialization"),
      achievements: z.array(z.string()).optional().describe("Key achievements/honors"),
    }),
  },

  repository_update_education: {
    description: "Update an existing education entry",
    inputSchema: z.object({
      id: z.string().describe("Education ID to update"),
      degree: z.string().optional().describe("Updated degree"),
      field: z.string().optional().describe("Updated field of study"),
      institution: z.string().optional().describe("Updated institution"),
      tagline: z.string().optional().describe("Updated tagline"),
      focusAreas: z.array(z.string()).optional().describe("Updated focus areas"),
      achievements: z.array(z.string()).optional().describe("Updated achievements"),
    }),
  },

  // ===== Portfolio Projects Tools =====
  repository_list_portfolio_projects: {
    description: "List portfolio projects",
    inputSchema: z.object({
      featured: z.boolean().optional().describe("Filter by featured status"),
      status: z.string().optional().describe("Filter by status (active, completed, archived)"),
    }),
  },

  repository_get_portfolio_project: {
    description: "Get a specific portfolio project by ID",
    inputSchema: z.object({
      id: z.number().describe("Portfolio project ID"),
    }),
  },

  repository_create_portfolio_project: {
    description: "Create a new portfolio project",
    inputSchema: z.object({
      title: z.string().describe("Project title"),
      category: z.string().describe("Project category (e.g. 'AI/ML', 'Web App', 'Mobile')"),
      company: z.string().optional().describe("Company/client name"),
      role: z.string().optional().describe("Your role in the project"),
      status: z.string().default("active").describe("Project status (active, completed, archived)"),
      featured: z.boolean().default(false).describe("Whether this is a featured project"),
      technologies: z.array(z.string()).optional().describe("Technologies used"),
      tags: z.array(z.string()).optional().describe("Tags for categorization"),
      description: z.string().optional().describe("Project description (markdown)"),
      image_url: z.string().optional().describe("URL of project image"),
    }),
  },

  repository_update_portfolio_project: {
    description: "Update an existing portfolio project",
    inputSchema: z.object({
      id: z.number().describe("Portfolio project ID to update"),
      title: z.string().optional().describe("Updated title"),
      category: z.string().optional().describe("Updated category"),
      company: z.string().optional().describe("Updated company"),
      role: z.string().optional().describe("Updated role"),
      status: z.string().optional().describe("Updated status"),
      featured: z.boolean().optional().describe("Updated featured status"),
      technologies: z.array(z.string()).optional().describe("Updated technologies"),
      tags: z.array(z.string()).optional().describe("Updated tags"),
      description: z.string().optional().describe("Updated description"),
      image_url: z.string().optional().describe("Updated image URL"),
    }),
  },

  // ===== Git Tools (GitHub/GitLab) =====
  git_parse_repo_url: {
    description:
      "Parse a GitHub or GitLab repository URL to extract platform, owner, and repo name",
    inputSchema: z.object({
      url: z.string().url().describe("Repository URL (e.g., https://github.com/user/repo)"),
    }),
  },

  git_read_file: {
    description: "Read raw file contents from a GitHub or GitLab repository",
    inputSchema: z.object({
      platform: z.enum(["github", "gitlab"]).describe("Git platform (github or gitlab)"),
      owner: z.string().min(1).describe("Repository owner/organization"),
      repo: z.string().min(1).describe("Repository name"),
      path: z.string().min(1).describe("File path within repository"),
      ref: z
        .string()
        .optional()
        .default("main")
        .describe("Branch, tag, or commit SHA (default: main)"),
    }),
  },

  git_get_file_tree: {
    description: "Get complete file tree/structure of a GitHub or GitLab repository",
    inputSchema: z.object({
      platform: z.enum(["github", "gitlab"]).describe("Git platform (github or gitlab)"),
      owner: z.string().min(1).describe("Repository owner/organization"),
      repo: z.string().min(1).describe("Repository name"),
      ref: z
        .string()
        .optional()
        .default("main")
        .describe("Branch, tag, or commit SHA (default: main)"),
    }),
  },

  // ===== Web Search Tools (Perplexity) =====
  perplexity_search: {
    description:
      "Search the web using Perplexity. Returns ranked search results with metadata. Best for finding current information, news, documentation.",
    inputSchema: z.object({
      query: z.string().min(1).describe("Search query"),
    }),
  },

  perplexity_ask: {
    description:
      "Ask a question with real-time web search using Perplexity sonar-pro model. Great for quick questions, factual lookups, and conversational research.",
    inputSchema: z.object({
      question: z.string().min(1).describe("Question to ask"),
    }),
  },

  perplexity_research: {
    description:
      "Deep, comprehensive research using Perplexity sonar-deep-research model. Use for thorough analysis, detailed reports, complex topics. Takes longer but provides exhaustive results.",
    inputSchema: z.object({
      topic: z.string().min(1).describe("Topic to research in depth"),
      strip_thinking: z
        .boolean()
        .optional()
        .default(true)
        .describe("Remove thinking tags to save tokens"),
    }),
  },

  perplexity_reason: {
    description:
      "Advanced reasoning and problem-solving using Perplexity sonar-reasoning-pro model. Perfect for complex analytical tasks, multi-step problems, logical analysis.",
    inputSchema: z.object({
      problem: z.string().min(1).describe("Problem or question requiring reasoning"),
      strip_thinking: z
        .boolean()
        .optional()
        .default(true)
        .describe("Remove thinking tags to save tokens"),
    }),
  },

  // ===== Google Workspace Tools =====
  google_drive_list_files: {
    description:
      "List files from Google Drive. Supports search queries, filtering by folder or MIME type. Use Drive query syntax (e.g., \"name contains 'report'\", \"mimeType='application/vnd.google-apps.spreadsheet'\").",
    inputSchema: z.object({
      query: z
        .string()
        .optional()
        .describe("Drive search query (e.g., \"name contains 'budget'\")"),
      folderId: z.string().optional().describe("Parent folder ID to list contents of"),
      mimeType: z.string().optional().describe("Filter by MIME type"),
      pageSize: z.number().optional().default(20).describe("Max results (default 20)"),
    }),
  },

  google_drive_get_file: {
    description:
      "Get details about a specific Google Drive file by ID. Returns metadata, sharing links, and owner info.",
    inputSchema: z.object({
      fileId: z.string().min(1).describe("Google Drive file ID"),
    }),
  },

  google_drive_search: {
    description:
      "Search Google Drive for files matching a text query. Searches file names and content.",
    inputSchema: z.object({
      query: z.string().min(1).describe("Search query text"),
      pageSize: z.number().optional().default(20).describe("Max results"),
    }),
  },

  google_drive_create_file: {
    description:
      "Create a new file in Google Drive. Can create Google Docs, Sheets, Slides, or plain files.",
    inputSchema: z.object({
      name: z.string().min(1).describe("File name"),
      mimeType: z
        .string()
        .describe(
          "MIME type (e.g., 'application/vnd.google-apps.document' for Doc, 'application/vnd.google-apps.spreadsheet' for Sheet)"
        ),
      parentFolderId: z.string().optional().describe("Parent folder ID"),
      content: z.string().optional().describe("Text content for the file"),
    }),
  },

  google_gmail_list_messages: {
    description:
      "List recent Gmail messages. Supports Gmail search syntax (from:, subject:, is:unread, after:, before:, has:attachment, label:, etc.).",
    inputSchema: z.object({
      query: z
        .string()
        .optional()
        .describe("Gmail search query (e.g., 'from:boss@company.com is:unread after:2026/03/01')"),
      maxResults: z.number().optional().default(20).describe("Max messages to return"),
      labelIds: z
        .array(z.string())
        .optional()
        .describe("Filter by label IDs (e.g., ['INBOX', 'UNREAD'])"),
    }),
  },

  google_gmail_get_message: {
    description:
      "Get the full content of a Gmail message by ID. Returns subject, sender, body text, and attachments list.",
    inputSchema: z.object({
      messageId: z.string().min(1).describe("Gmail message ID"),
    }),
  },

  google_gmail_send: {
    description: "Send an email via Gmail.",
    inputSchema: z.object({
      to: z.string().min(1).describe("Recipient email address"),
      subject: z.string().min(1).describe("Email subject line"),
      body: z.string().min(1).describe("Email body (plain text)"),
      cc: z.string().optional().describe("CC email address"),
      bcc: z.string().optional().describe("BCC email address"),
    }),
  },

  google_gmail_get_thread: {
    description:
      "Get all messages in a Gmail thread by thread ID. Returns the full conversation chain. Use after listing messages to see the complete email thread.",
    inputSchema: z.object({
      threadId: z.string().min(1).describe("Gmail thread ID (from message listing)"),
    }),
  },

  google_gmail_reply: {
    description:
      "Reply to a Gmail message. Automatically preserves threading (In-Reply-To, References headers). Use replyAll to include all original recipients.",
    inputSchema: z.object({
      messageId: z.string().min(1).describe("Gmail message ID to reply to"),
      body: z.string().min(1).describe("Reply body (plain text)"),
      replyAll: z
        .boolean()
        .optional()
        .default(false)
        .describe("Reply to all recipients (true) or just sender (false)"),
    }),
  },

  google_gmail_modify: {
    description:
      "Modify labels on a Gmail message. Use this to mark read/unread, star, archive, trash, or apply custom labels. Common label IDs: UNREAD, STARRED, IMPORTANT, INBOX, SPAM, TRASH, DRAFT.",
    inputSchema: z.object({
      messageId: z.string().min(1).describe("Gmail message ID to modify"),
      addLabelIds: z
        .array(z.string())
        .optional()
        .describe("Label IDs to add (e.g., ['STARRED', 'IMPORTANT'])"),
      removeLabelIds: z
        .array(z.string())
        .optional()
        .describe("Label IDs to remove (e.g., ['UNREAD', 'INBOX'] to archive and mark read)"),
    }),
  },

  google_gmail_create_draft: {
    description:
      "Create a draft email without sending it. The user can review and send it later from Gmail.",
    inputSchema: z.object({
      to: z.string().min(1).describe("Recipient email address"),
      subject: z.string().min(1).describe("Email subject line"),
      body: z.string().min(1).describe("Email body (plain text)"),
      cc: z.string().optional().describe("CC email address"),
      bcc: z.string().optional().describe("BCC email address"),
    }),
  },

  google_calendar_list_events: {
    description:
      "List upcoming Google Calendar events. Defaults to the next 7 days on the primary calendar.",
    inputSchema: z.object({
      calendarId: z.string().optional().describe("Calendar ID (default: 'primary')"),
      timeMin: z.string().optional().describe("Start time filter (ISO 8601, default: now)"),
      timeMax: z
        .string()
        .optional()
        .describe("End time filter (ISO 8601, default: 7 days from now)"),
      maxResults: z.number().optional().default(10).describe("Max events to return"),
    }),
  },

  google_calendar_get_event: {
    description: "Get details of a specific Google Calendar event by ID.",
    inputSchema: z.object({
      eventId: z.string().min(1).describe("Calendar event ID"),
      calendarId: z.string().optional().describe("Calendar ID (default: 'primary')"),
    }),
  },

  google_calendar_create_event: {
    description: "Create a new Google Calendar event with optional attendees and location.",
    inputSchema: z.object({
      summary: z.string().min(1).describe("Event title"),
      start: z.string().describe("Start time (ISO 8601, e.g., '2026-03-10T10:00:00+02:00')"),
      end: z.string().describe("End time (ISO 8601)"),
      description: z.string().optional().describe("Event description"),
      location: z.string().optional().describe("Event location"),
      attendees: z.array(z.string()).optional().describe("Attendee email addresses"),
      calendarId: z.string().optional().describe("Calendar ID (default: 'primary')"),
    }),
  },

  google_calendar_update_event: {
    description: "Update an existing Google Calendar event.",
    inputSchema: z.object({
      eventId: z.string().min(1).describe("Event ID to update"),
      summary: z.string().optional().describe("New title"),
      start: z.string().optional().describe("New start time (ISO 8601)"),
      end: z.string().optional().describe("New end time (ISO 8601)"),
      description: z.string().optional().describe("New description"),
      location: z.string().optional().describe("New location"),
      attendees: z.array(z.string()).optional().describe("Updated attendee list"),
      calendarId: z.string().optional().describe("Calendar ID (default: 'primary')"),
    }),
  },

  // ===== Skill Management Tools (always available) =====
  activate_skill: {
    description:
      "Activate a Kronus skill by slug. Skills load additional context and tools on demand. You can activate multiple skills — they stack additively. IMPORTANT: Check the Available Skills section in your system prompt first — skills marked [ACTIVE] are already loaded. Do NOT call this for skills that are already active.",
    inputSchema: z.object({
      slug: z
        .string()
        .min(1)
        .describe("The skill slug to activate (e.g., 'skill-developer')"),
    }),
  },

  deactivate_skill: {
    description:
      "Deactivate a currently active Kronus skill. This removes its context and tools from the next message, reducing token usage. Use this when the user wants to switch focus or reduce context.",
    inputSchema: z.object({
      slug: z
        .string()
        .min(1)
        .describe("The skill slug to deactivate (e.g., 'skill-developer')"),
    }),
  },
} as const;

// Server-side definitions for streamText (converts inputSchema → parameters)
export const serverToolDefinitions = Object.fromEntries(
  Object.entries(toolSpecs).map(([key, spec]) => [
    key,
    {
      description: spec.description,
      parameters: spec.inputSchema,
    },
  ])
);

export type ToolName = keyof typeof toolSpecs;

/**
 * Tool-to-category mapping for buildTools in route.ts
 * Maps each ToolsConfig category to the tool names it controls
 */
export const toolCategories: Record<string, ToolName[]> = {
  journal: [
    "journal_create_entry",
    "journal_get_entry",
    "journal_list_by_repository",
    "journal_list_by_branch",
    "journal_list_repositories",
    "journal_list_branches",
    "journal_edit_entry",
    "journal_regenerate_entry",
    "journal_get_project_summary",
    "journal_list_project_summaries",
    "journal_upsert_project_summary",
    "journal_list_attachments",
    "journal_get_attachment",
    "journal_backup",
  ],
  linear: [
    "linear_get_viewer",
    "linear_list_issues",
    "linear_create_issue",
    "linear_update_issue",
    "linear_list_projects",
    "linear_create_project",
    "linear_update_project",
    "linear_create_project_update",
    "linear_list_project_updates",
    "linear_get_issue",
    "linear_get_project",
  ],
  slite: [
    "slite_search_notes",
    "slite_get_note",
    "slite_create_note",
    "slite_update_note",
    "slite_ask",
  ],
  notion: [
    "notion_search_pages",
    "notion_get_page",
    "notion_create_page",
    "notion_update_page",
  ],
  repository: [
    "repository_search_documents",
    "repository_get_document",
    "repository_create_document",
    "repository_update_document",
    "repository_list_skills",
    "repository_update_skill",
    "repository_create_skill",
    "repository_list_experience",
    "repository_create_experience",
    "repository_update_experience",
    "repository_list_education",
    "repository_create_education",
    "repository_update_education",
    "repository_list_portfolio_projects",
    "repository_get_portfolio_project",
    "repository_create_portfolio_project",
    "repository_update_portfolio_project",
  ],
  git: [
    "git_parse_repo_url",
    "git_read_file",
    "git_get_file_tree",
  ],
  media: [
    "save_image",
    "list_media",
    "get_media",
    "update_media",
  ],
  imageGeneration: [
    "replicate_generate_image",
  ],
  webSearch: [
    "gemini_search",
    "perplexity_search",
    "perplexity_ask",
    "perplexity_research",
    "perplexity_reason",
  ],
  google: [
    "google_drive_list_files",
    "google_drive_get_file",
    "google_drive_search",
    "google_drive_create_file",
    "google_gmail_list_messages",
    "google_gmail_get_message",
    "google_gmail_send",
    "google_gmail_get_thread",
    "google_gmail_reply",
    "google_gmail_modify",
    "google_gmail_create_draft",
    "google_calendar_list_events",
    "google_calendar_get_event",
    "google_calendar_create_event",
    "google_calendar_update_event",
  ],
  // Skill management tools are always included (not gated by config)
  _alwaysOn: [
    "activate_skill",
    "deactivate_skill",
  ],
};
