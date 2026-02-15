/**
 * Kronus Agent - Knowledge Oracle for the Developer Journal
 *
 * Provides intelligent answers about projects, work history, and repository data
 * without polluting the main conversation context.
 *
 * Architecture:
 * - Quick mode (Sonnet 4.5): Summaries-only index, recommends MCP resources for more detail
 * - Deep mode (Opus 4.6): Full context from local DB (like Tartarus chat), no tool calling
 * - All data loaded directly from shared SQLite DB - no HTTP calls to Tartarus
 */

import { anthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";
import { generateText } from "ai";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

import { logger } from "../../shared/logger.js";
import type { JournalConfig } from "../../shared/types.js";
import {
  startTrace,
  startSpan,
  endSpan,
  endTrace,
  storeKronusChat,
  calculateCost,
} from "../../shared/observability.js";
import type {
  KronusAskInput,
  KronusResponse,
  SummariesIndex,
  ProjectSummaryIndex,
  JournalEntryIndex,
  LinearIssueIndex,
  LinearProjectIndex,
  DocumentIndex,
  AttachmentIndex,
  SkillIndex,
  WorkExperienceIndex,
  EducationIndex,
  PortfolioProjectIndex,
  ConversationIndex,
} from "./types.js";
import {
  getEntriesByRepositoryPaginated,
  listAllProjectSummariesPaginated,
  getAttachmentMetadataByCommit,
  listLinearProjects,
  listLinearIssues,
  listDocuments,
  listSkills,
  listWorkExperience,
  listEducation,
  listPortfolioProjects,
  listConversationsWithSummaries,
} from "../journal/db/database.js";

/**
 * Get project root for Soul.xml loading
 */
function getProjectRoot(): string {
  const soulPathEnv = process.env.SOUL_XML_PATH;
  if (soulPathEnv) {
    const resolved = path.resolve(soulPathEnv.replace(/^~/, os.homedir()));
    const dir = path.dirname(resolved);
    if (fs.existsSync(path.join(dir, "package.json"))) {
      return dir;
    }
  }

  const cwd = process.cwd();
  if (
    fs.existsSync(path.join(cwd, "Soul.xml")) ||
    fs.existsSync(path.join(cwd, "package.json"))
  ) {
    return cwd;
  }

  return cwd;
}

/**
 * Load Agent Soul (personality) - minimal version for oracle mode
 */
function loadKronusSoulMinimal(): string {
  const projectRoot = getProjectRoot();
  const agentName = process.env.AGENT_NAME || "Kronus";
  const soulPathEnv =
    process.env.SOUL_XML_PATH || process.env.AGENT_SOUL_PATH || "Soul.xml";
  const soulPath =
    soulPathEnv.startsWith("/") || soulPathEnv.startsWith("~")
      ? path.resolve(soulPathEnv.replace(/^~/, os.homedir()))
      : path.join(projectRoot, soulPathEnv);

  try {
    const soulContent = fs.readFileSync(soulPath, "utf-8");
    const coreMatch = soulContent.match(/<soul[^>]*>([\s\S]*?)<\/soul>/i);
    if (coreMatch) {
      return `You are ${agentName}, a knowledge oracle from the Developer Journal system.
Your voice is wise, empathetic, with subtle humor. You speak with precision.`;
    }
    return soulContent.substring(0, 500);
  } catch {
    return `You are ${agentName}, a knowledge oracle for the Developer Journal system.`;
  }
}

/**
 * Build the summaries index from local DB (no HTTP calls)
 *
 * Quick mode: summaries only (slug, title, type - no full content)
 * Deep mode: full content included (like Tartarus chat context)
 */
export function buildSummariesIndex(
  repository?: string,
  deep = false,
): SummariesIndex {
  // Project summaries (Entry 0s)
  const { summaries } = listAllProjectSummariesPaginated(50, 0);
  const projectSummaries: ProjectSummaryIndex[] = summaries
    .filter((s) => !repository || s.repository === repository)
    .map((s) => ({
      repository: s.repository,
      summary: s.summary,
      status: s.status,
      technologies: s.technologies,
      updated_at: s.updated_at,
      entry_count: s.entry_count,
    }));

  // Journal entries
  let journalEntries: JournalEntryIndex[] = [];
  if (repository) {
    const { entries } = getEntriesByRepositoryPaginated(repository, 30, 0);
    journalEntries = entries.map((e) => ({
      commit_hash: e.commit_hash,
      repository: e.repository,
      branch: e.branch,
      date: e.date,
      summary: e.summary || null,
      why: e.why,
    }));
  } else {
    for (const ps of projectSummaries.slice(0, 5)) {
      const { entries } = getEntriesByRepositoryPaginated(ps.repository, 10, 0);
      journalEntries.push(
        ...entries.map((e) => ({
          commit_hash: e.commit_hash,
          repository: e.repository,
          branch: e.branch,
          date: e.date,
          summary: e.summary || null,
          why: e.why,
        })),
      );
    }
  }

  // Linear cache - direct from local DB
  const { projects: linearProjectRows } = listLinearProjects({ includeDeleted: false });
  const linearProjects: LinearProjectIndex[] = linearProjectRows.map((p) => ({
    id: p.id,
    name: p.name,
    summary: p.summary || null,
    state: p.state || null,
    progress: p.progress ?? null,
  }));

  const { issues: linearIssueRows } = listLinearIssues({ includeDeleted: false });
  const linearIssues: LinearIssueIndex[] = linearIssueRows.map((i) => ({
    identifier: i.identifier,
    title: i.title,
    summary: i.summary || null,
    stateName: i.state_name || null,
    priority: i.priority ?? null,
    projectName: i.project_name || null,
  }));

  // Documents - direct from local DB
  const docRows = listDocuments(50);
  const documents: DocumentIndex[] = docRows.map((d) => ({
    slug: d.slug,
    type: d.type,
    title: d.title,
    summary: d.summary || null,
    language: d.language || null,
    // Deep mode includes full content
    ...(deep ? { content: d.content } : {}),
  }));

  // Attachments from recent entries
  let attachments: AttachmentIndex[] = [];
  for (const entry of journalEntries.slice(0, 10)) {
    const entryAttachments = getAttachmentMetadataByCommit(entry.commit_hash);
    attachments.push(
      ...entryAttachments.map((a) => ({
        id: a.id,
        commit_hash: entry.commit_hash,
        filename: a.filename,
        mime_type: a.mime_type,
        description: a.description,
      })),
    );
  }

  // Skills - direct from local DB
  const skillRows = listSkills();
  const skills: SkillIndex[] = skillRows.map((s) => ({
    id: s.id,
    name: s.name,
    category: s.category,
    magnitude: s.magnitude,
    summary: s.summary || null,
  }));

  // Work Experience - direct from local DB
  const expRows = listWorkExperience();
  const experience: WorkExperienceIndex[] = expRows.map((e) => ({
    id: e.id,
    title: e.title,
    company: e.company,
    startDate: e.dateStart,
    endDate: e.dateEnd || null,
    summary: e.summary || null,
    // Deep mode includes full details
    ...(deep ? { tagline: e.tagline, achievements: e.achievements } : {}),
  }));

  // Education - direct from local DB
  const eduRows = listEducation();
  const education: EducationIndex[] = eduRows.map((e) => ({
    id: e.id,
    degree: e.degree,
    field: e.field,
    institution: e.institution,
    startDate: e.dateStart,
    endDate: e.dateEnd || null,
    summary: e.summary || null,
  }));

  // Portfolio - direct from local DB
  const portfolioRows = listPortfolioProjects();
  const portfolioProjects: PortfolioProjectIndex[] = portfolioRows.map((p) => ({
    id: p.id,
    title: p.title,
    category: p.category,
    status: p.status,
    summary: p.summary || null,
    technologies: p.technologies ? JSON.parse(p.technologies) : null,
  }));

  // Conversations with summaries - direct from local DB
  const convRows = listConversationsWithSummaries(50);
  const conversations: ConversationIndex[] = convRows.map((c) => ({
    id: String(c.id),
    title: c.title || null,
    summary: c.summary || null,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
    messageCount: c.messageCount || 0,
  }));

  return {
    projectSummaries,
    journalEntries,
    linearIssues,
    linearProjects,
    documents,
    attachments,
    skills,
    experience,
    education,
    portfolioProjects,
    conversations,
  };
}

/**
 * Format summaries index for the AI prompt
 */
function formatIndexForPrompt(index: SummariesIndex, deep = false): string {
  let formatted = "";

  // Project summaries
  if (index.projectSummaries.length > 0) {
    formatted += "## Project Summaries (Entry 0)\n";
    for (const ps of index.projectSummaries) {
      formatted += `\n### ${ps.repository}\n`;
      formatted += `- Summary: ${ps.summary || "Not set"}\n`;
      formatted += `- Status: ${ps.status || "Unknown"}\n`;
      formatted += `- Technologies: ${ps.technologies || "Not listed"}\n`;
      formatted += `- Entries: ${ps.entry_count || 0}, Updated: ${ps.updated_at}\n`;
    }
  }

  // Journal entries
  if (index.journalEntries.length > 0) {
    formatted += "\n## Recent Journal Entries\n";
    for (const e of index.journalEntries) {
      formatted += `\n- **${e.commit_hash.substring(0, 7)}** (${e.repository}/${e.branch}) [${e.date}]\n`;
      formatted += `  ${e.summary || e.why?.substring(0, 100) || "No summary"}\n`;
    }
  }

  // Linear issues
  if (index.linearIssues.length > 0) {
    formatted += "\n## Linear Issues\n";
    for (const i of index.linearIssues) {
      formatted += `- **${i.identifier}**: ${i.title} [${i.stateName || "No state"}]`;
      if (i.projectName) formatted += ` (Project: ${i.projectName})`;
      formatted += "\n";
      if (i.summary) formatted += `  ${i.summary}\n`;
    }
  }

  // Linear projects
  if (index.linearProjects.length > 0) {
    formatted += "\n## Linear Projects\n";
    for (const p of index.linearProjects) {
      formatted += `- **${p.name}** [${p.state || "Unknown"}]`;
      if (p.progress !== null)
        formatted += ` (${Math.round((p.progress || 0) * 100)}% complete)`;
      formatted += "\n";
      if (p.summary) formatted += `  ${p.summary}\n`;
    }
  }

  // Documents
  if (index.documents.length > 0) {
    formatted += "\n## Documents\n";
    for (const d of index.documents) {
      formatted += `- **${d.slug}** (${d.type}): ${d.title}\n`;
      if (deep && (d as any).content) {
        // Deep mode: include full content
        formatted += `  ${(d as any).content.substring(0, 500)}\n`;
      } else if (d.summary) {
        formatted += `  ${d.summary}\n`;
      }
    }
  }

  // Attachments
  if (index.attachments.length > 0) {
    formatted += "\n## Attachments\n";
    for (const a of index.attachments) {
      formatted += `- ${a.filename} (${a.mime_type}) - ${a.commit_hash.substring(0, 7)}`;
      if (a.description) formatted += `: ${a.description}`;
      formatted += "\n";
    }
  }

  // Skills
  if (index.skills.length > 0) {
    formatted += "\n## Skills\n";
    const byCategory = new Map<string, typeof index.skills>();
    for (const s of index.skills) {
      const cat = s.category || "Other";
      if (!byCategory.has(cat)) byCategory.set(cat, []);
      byCategory.get(cat)!.push(s);
    }
    for (const [category, skills] of byCategory) {
      formatted += `\n### ${category}\n`;
      for (const s of skills) {
        formatted += `- **${s.name}** (${s.magnitude}/5)`;
        if (s.summary) formatted += `: ${s.summary}`;
        formatted += "\n";
      }
    }
  }

  // Work Experience
  if (index.experience.length > 0) {
    formatted += "\n## Work Experience\n";
    for (const e of index.experience) {
      formatted += `\n### ${e.title} at ${e.company}\n`;
      formatted += `- Period: ${e.startDate} - ${e.endDate || "Present"}\n`;
      if (e.summary) formatted += `- ${e.summary}\n`;
    }
  }

  // Education
  if (index.education.length > 0) {
    formatted += "\n## Education\n";
    for (const e of index.education) {
      formatted += `\n### ${e.degree} in ${e.field}\n`;
      formatted += `- Institution: ${e.institution}\n`;
      formatted += `- Period: ${e.startDate} - ${e.endDate || "Present"}\n`;
      if (e.summary) formatted += `- ${e.summary}\n`;
    }
  }

  // Portfolio Projects
  if (index.portfolioProjects.length > 0) {
    formatted += "\n## Portfolio Projects\n";
    for (const p of index.portfolioProjects) {
      formatted += `\n### ${p.title}\n`;
      formatted += `- Category: ${p.category} | Status: ${p.status}\n`;
      if (p.technologies?.length)
        formatted += `- Tech: ${p.technologies.join(", ")}\n`;
      if (p.summary) formatted += `- ${p.summary}\n`;
    }
  }

  // Conversations (with summaries)
  if (index.conversations.length > 0) {
    formatted += "\n## Conversations\n";
    for (const c of index.conversations) {
      formatted += `- **${c.title || "Untitled"}** (${c.messageCount} messages, ${c.createdAt})\n`;
      if (c.summary) formatted += `  ${c.summary}\n`;
    }
  }

  return formatted;
}

/**
 * Ask Kronus a question
 *
 * Quick mode: Sonnet 4.5 with summaries, recommends MCP resources for detail
 * Deep mode: Opus 4.6 with full context, answers directly (no tool calling)
 */
export async function askKronus(
  input: KronusAskInput,
  _config: JournalConfig,
): Promise<KronusResponse> {
  const { question, repository, depth = "quick", serious = false } = input;
  const isDeep = depth === "deep";
  const startTime = Date.now();

  // Start observability trace
  const traceContext = startTrace("kronus_ask", {
    question: question.substring(0, 100),
    repository,
    depth,
    serious,
  });

  logger.info(
    `Kronus receiving question: "${question}" (depth: ${depth}, serious: ${serious}, repo: ${repository || "all"})`,
  );

  // Build index from local DB (no HTTP calls - instant)
  const indexSpanId = startSpan("build_summaries_index", { type: "span" });
  const index = buildSummariesIndex(repository, isDeep);
  const formattedIndex = formatIndexForPrompt(index, isDeep);
  endSpan(indexSpanId, {
    output: {
      projects: index.projectSummaries.length,
      entries: index.journalEntries.length,
      issues: index.linearIssues.length,
      documents: index.documents.length,
      skills: index.skills.length,
      experience: index.experience.length,
      education: index.education.length,
      portfolio: index.portfolioProjects.length,
      conversations: index.conversations.length,
    },
  });

  // Minimal Kronus soul for oracle mode
  const kronusSoul = loadKronusSoulMinimal();

  const baseInstructions = `
## Instructions
- Answer the question using the knowledge index above
- Entry 0 (project_summaries) may be outdated - cross-check with recent journal entries dates
- Be concise and direct
- Cite sources by identifier (commit_hash, slug, ENG-XXX, project name)
- For dates, note recency - newest entries are most accurate for current state
- If the index doesn't have enough information, say so clearly
- Do not make up information not in the index`;

  const depthInstructions = isDeep
    ? `\n\n## Mode: Deep
You have the full knowledge context loaded. Answer comprehensively from the data above.
Do not say "let me fetch" or "let me look up" - you already have everything.`
    : `\n\n## Mode: Quick
Answer using summaries only. If the caller needs more detail, recommend these MCP resources:
- **journal://summary/{repository}** - Full Entry 0 project summary
- **journal://entries/{repository}** - Recent journal entries with full details
- **linear://projects** or **linear://project/{id}** - Linear project details
- **linear://issues** or **linear://issue/{identifier}** - Linear issue details
- **linear://project/{projectId}/updates** - Project status updates
Tell the caller which specific resource(s) would answer their question in more depth.`;

  const systemPrompt = `${kronusSoul}

## Your Knowledge Index
${formattedIndex}
${baseInstructions}${depthInstructions}`;

  // Model selection: Gemini Flash 3 (quick) / Gemini 3 Pro (deep) / Opus 4.6 (serious)
  const modelName = serious
    ? "claude-opus-4-6"
    : isDeep
      ? "gemini-3-pro"
      : "gemini-3-flash";

  try {
    const genSpanId = startSpan("kronus_generation", {
      type: "generation",
      model: modelName,
      input: { question, depth, serious },
    });

    const model = serious
      ? anthropic("claude-opus-4-6")
      : isDeep
        ? google("gemini-3-pro-preview")
        : google("gemini-3-flash-preview");

    // No tool calling - both modes answer directly from loaded context
    const result = await generateText({
      model,
      system: systemPrompt,
      prompt: question,
      temperature: 0.5,
      maxOutputTokens: isDeep ? 4096 : 2048,
    });

    const inputTokens = result.usage?.inputTokens ?? 0;
    const outputTokens = result.usage?.outputTokens ?? 0;

    endSpan(genSpanId, {
      output: { text: result.text.substring(0, 200) },
      inputTokens,
      outputTokens,
    });

    // Extract sources from the answer
    const sources = extractSources(result.text, index);

    const cost = calculateCost(modelName, inputTokens, outputTokens);
    const latencyMs = Date.now() - startTime;

    // Store chat in database
    storeKronusChat({
      trace_id: traceContext.traceId,
      question,
      answer: result.text,
      repository,
      depth,
      sources,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      latency_ms: latencyMs,
      cost_usd: cost,
      status: "success",
    });

    endTrace();

    return {
      answer: result.text,
      sources,
      depth_used: depth,
    };
  } catch (error) {
    const latencyMs = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    storeKronusChat({
      trace_id: traceContext.traceId,
      question,
      answer: "",
      repository,
      depth,
      latency_ms: latencyMs,
      status: "error",
      error_message: errorMessage,
    });

    endTrace({ error: error instanceof Error ? error : String(error) });

    logger.error("Kronus agent error:", error);
    throw new Error(`Kronus failed to answer: ${errorMessage}`);
  }
}

/**
 * Extract source references from the answer text
 */
function extractSources(
  answer: string,
  index: SummariesIndex,
): KronusResponse["sources"] {
  const sources: KronusResponse["sources"] = [];
  const seen = new Set<string>();

  // Check for commit hashes (7+ char hex)
  const commitMatches = answer.match(/\b[a-f0-9]{7,40}\b/gi) || [];
  for (const hash of commitMatches) {
    const entry = index.journalEntries.find((e) =>
      e.commit_hash.toLowerCase().startsWith(hash.toLowerCase()),
    );
    if (entry && !seen.has(entry.commit_hash)) {
      seen.add(entry.commit_hash);
      sources.push({
        type: "journal_entry",
        identifier: entry.commit_hash,
        title: entry.why?.substring(0, 50),
      });
    }
  }

  // Check for Linear identifiers (ENG-XXX, etc.)
  const linearMatches = answer.match(/\b[A-Z]{2,5}-\d+\b/g) || [];
  for (const identifier of linearMatches) {
    const issue = index.linearIssues.find((i) => i.identifier === identifier);
    if (issue && !seen.has(identifier)) {
      seen.add(identifier);
      sources.push({
        type: "linear_issue",
        identifier,
        title: issue.title,
      });
    }
  }

  // Check for project names mentioned
  for (const project of index.linearProjects) {
    if (answer.includes(project.name) && !seen.has(project.id)) {
      seen.add(project.id);
      sources.push({
        type: "linear_project",
        identifier: project.id,
        title: project.name,
      });
    }
  }

  // Check for repository names
  for (const ps of index.projectSummaries) {
    if (answer.includes(ps.repository) && !seen.has(ps.repository)) {
      seen.add(ps.repository);
      sources.push({
        type: "project_summary",
        identifier: ps.repository,
        title: ps.repository,
      });
    }
  }

  // Check for skill names mentioned
  for (const skill of index.skills) {
    if (
      answer.toLowerCase().includes(skill.name.toLowerCase()) &&
      !seen.has(`skill:${skill.id}`)
    ) {
      seen.add(`skill:${skill.id}`);
      sources.push({
        type: "skill",
        identifier: skill.id,
        title: skill.name,
      });
    }
  }

  // Check for work experience (company names)
  for (const exp of index.experience) {
    if (answer.includes(exp.company) && !seen.has(`exp:${exp.id}`)) {
      seen.add(`exp:${exp.id}`);
      sources.push({
        type: "work_experience",
        identifier: exp.id,
        title: `${exp.title} at ${exp.company}`,
      });
    }
  }

  // Check for education (institution names)
  for (const edu of index.education) {
    if (answer.includes(edu.institution) && !seen.has(`edu:${edu.id}`)) {
      seen.add(`edu:${edu.id}`);
      sources.push({
        type: "education",
        identifier: edu.id,
        title: `${edu.degree} at ${edu.institution}`,
      });
    }
  }

  // Check for portfolio project titles
  for (const proj of index.portfolioProjects) {
    if (answer.includes(proj.title) && !seen.has(`portfolio:${proj.id}`)) {
      seen.add(`portfolio:${proj.id}`);
      sources.push({
        type: "portfolio_project",
        identifier: proj.id,
        title: proj.title,
      });
    }
  }

  return sources;
}
