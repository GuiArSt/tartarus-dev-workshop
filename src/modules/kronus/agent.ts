/**
 * Kronus Agent - Knowledge Oracle for the Developer Journal
 *
 * Provides intelligent answers about projects, work history, and repository data
 * without polluting the main conversation context.
 *
 * Uses AI SDK 6.0 generateText pattern with a light system prompt + summaries index.
 */

import { anthropic } from '@ai-sdk/anthropic';
import { generateText } from 'ai';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

import { logger } from '../../shared/logger.js';
import type { JournalConfig } from '../../shared/types.js';
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
} from './types.js';
import {
  getEntriesByRepositoryPaginated,
  listAllProjectSummariesPaginated,
  getAttachmentMetadataByCommit,
  listLinearProjects,
  listLinearIssues,
} from '../journal/db/database.js';

/**
 * Get project root for Soul.xml loading
 */
function getProjectRoot(): string {
  const soulPathEnv = process.env.SOUL_XML_PATH;
  if (soulPathEnv) {
    const resolved = path.resolve(soulPathEnv.replace(/^~/, os.homedir()));
    const dir = path.dirname(resolved);
    if (fs.existsSync(path.join(dir, 'package.json'))) {
      return dir;
    }
  }

  const cwd = process.cwd();
  if (fs.existsSync(path.join(cwd, 'Soul.xml')) || fs.existsSync(path.join(cwd, 'package.json'))) {
    return cwd;
  }

  return cwd;
}

/**
 * Load Soul.xml (Kronus personality) - minimal version for oracle mode
 */
function loadKronusSoulMinimal(): string {
  const projectRoot = getProjectRoot();

  const soulPathEnv = process.env.SOUL_XML_PATH;
  const soulPath = soulPathEnv
    ? path.resolve(soulPathEnv.replace(/^~/, os.homedir()))
    : path.join(projectRoot, 'Soul.xml');

  try {
    const soulContent = fs.readFileSync(soulPath, 'utf-8');
    // Extract just the core identity section (first 1000 chars or so)
    const coreMatch = soulContent.match(/<soul[^>]*>([\s\S]*?)<\/soul>/i);
    if (coreMatch) {
      // Return abbreviated soul - just identity and voice
      return `You are Kronus, a knowledge oracle from the Developer Journal system.
Your voice is wise, empathetic, with subtle humor. You speak with precision.`;
    }
    return soulContent.substring(0, 500);
  } catch {
    return 'You are Kronus, a knowledge oracle for the Developer Journal system.';
  }
}

/**
 * Fetch documents from Tartarus API
 */
async function fetchDocumentSummaries(): Promise<DocumentIndex[]> {
  try {
    const tartarusUrl = process.env.TARTARUS_URL || 'http://localhost:3000';
    const response = await fetch(`${tartarusUrl}/api/documents?limit=50`);
    if (!response.ok) return [];

    const data = await response.json();
    return (data.documents || []).map((doc: any) => ({
      slug: doc.slug,
      type: doc.type,
      title: doc.title,
      summary: doc.summary || null,
      language: doc.language || null,
    }));
  } catch (error) {
    logger.warn('Failed to fetch documents for Kronus index:', error);
    return [];
  }
}

/**
 * Build the summaries index for quick mode
 */
export async function buildSummariesIndex(repository?: string): Promise<SummariesIndex> {
  // Project summaries (Entry 0s)
  const { summaries } = listAllProjectSummariesPaginated(50, 0);
  const projectSummaries: ProjectSummaryIndex[] = summaries
    .filter(s => !repository || s.repository === repository)
    .map(s => ({
      repository: s.repository,
      summary: s.summary,
      status: s.status,
      technologies: s.technologies,
      updated_at: s.updated_at,
      entry_count: s.entry_count,
    }));

  // Journal entries - get recent entries (last 30)
  let journalEntries: JournalEntryIndex[] = [];
  if (repository) {
    const entries = getEntriesByRepositoryPaginated(repository, 30, 0, false);
    journalEntries = entries.map(e => ({
      commit_hash: e.commit_hash,
      repository: e.repository,
      branch: e.branch,
      date: e.date,
      summary: e.summary || null,
      why: e.why,
    }));
  } else {
    // Get entries from all repos (limited)
    for (const ps of projectSummaries.slice(0, 5)) {
      const entries = getEntriesByRepositoryPaginated(ps.repository, 10, 0, false);
      journalEntries.push(...entries.map(e => ({
        commit_hash: e.commit_hash,
        repository: e.repository,
        branch: e.branch,
        date: e.date,
        summary: e.summary || null,
        why: e.why,
      })));
    }
  }

  // Linear issues
  const { issues } = listLinearIssues({ includeDeleted: false, limit: 50 });
  const linearIssues: LinearIssueIndex[] = issues.map(i => ({
    identifier: i.identifier,
    title: i.title,
    summary: i.summary,
    stateName: i.stateName,
    priority: i.priority,
    projectName: i.projectName,
  }));

  // Linear projects
  const { projects } = listLinearProjects({ includeDeleted: false, limit: 20 });
  const linearProjects: LinearProjectIndex[] = projects.map(p => ({
    id: p.id,
    name: p.name,
    summary: p.summary,
    state: p.state,
    progress: p.progress,
  }));

  // Documents (from Tartarus)
  const documents = await fetchDocumentSummaries();

  // Attachments - get from recent entries
  let attachments: AttachmentIndex[] = [];
  for (const entry of journalEntries.slice(0, 10)) {
    const entryAttachments = getAttachmentMetadataByCommit(entry.commit_hash);
    attachments.push(...entryAttachments.map(a => ({
      id: a.id,
      commit_hash: entry.commit_hash,
      filename: a.filename,
      mime_type: a.mime_type,
      description: a.description,
    })));
  }

  return {
    projectSummaries,
    journalEntries,
    linearIssues,
    linearProjects,
    documents,
    attachments,
  };
}

/**
 * Format summaries index for the AI prompt
 */
function formatIndexForPrompt(index: SummariesIndex): string {
  let formatted = '';

  // Project summaries
  if (index.projectSummaries.length > 0) {
    formatted += '## Project Summaries (Entry 0)\n';
    for (const ps of index.projectSummaries) {
      formatted += `\n### ${ps.repository}\n`;
      formatted += `- Summary: ${ps.summary || 'Not set'}\n`;
      formatted += `- Status: ${ps.status || 'Unknown'}\n`;
      formatted += `- Technologies: ${ps.technologies || 'Not listed'}\n`;
      formatted += `- Entries: ${ps.entry_count || 0}, Updated: ${ps.updated_at}\n`;
    }
  }

  // Journal entries
  if (index.journalEntries.length > 0) {
    formatted += '\n## Recent Journal Entries\n';
    for (const e of index.journalEntries) {
      formatted += `\n- **${e.commit_hash.substring(0, 7)}** (${e.repository}/${e.branch}) [${e.date}]\n`;
      formatted += `  ${e.summary || e.why?.substring(0, 100) || 'No summary'}\n`;
    }
  }

  // Linear issues
  if (index.linearIssues.length > 0) {
    formatted += '\n## Linear Issues\n';
    for (const i of index.linearIssues) {
      formatted += `- **${i.identifier}**: ${i.title} [${i.stateName || 'No state'}]`;
      if (i.projectName) formatted += ` (Project: ${i.projectName})`;
      formatted += '\n';
      if (i.summary) formatted += `  ${i.summary}\n`;
    }
  }

  // Linear projects
  if (index.linearProjects.length > 0) {
    formatted += '\n## Linear Projects\n';
    for (const p of index.linearProjects) {
      formatted += `- **${p.name}** [${p.state || 'Unknown'}]`;
      if (p.progress !== null) formatted += ` (${Math.round((p.progress || 0) * 100)}% complete)`;
      formatted += '\n';
      if (p.summary) formatted += `  ${p.summary}\n`;
    }
  }

  // Documents
  if (index.documents.length > 0) {
    formatted += '\n## Documents\n';
    for (const d of index.documents) {
      formatted += `- **${d.slug}** (${d.type}): ${d.title}\n`;
      if (d.summary) formatted += `  ${d.summary}\n`;
    }
  }

  // Attachments
  if (index.attachments.length > 0) {
    formatted += '\n## Attachments\n';
    for (const a of index.attachments) {
      formatted += `- ${a.filename} (${a.mime_type}) - ${a.commit_hash.substring(0, 7)}`;
      if (a.description) formatted += `: ${a.description}`;
      formatted += '\n';
    }
  }

  return formatted;
}

/**
 * Ask Kronus a question using the summaries index
 */
export async function askKronus(
  input: KronusAskInput,
  config: JournalConfig
): Promise<KronusResponse> {
  const { question, repository, depth = 'quick' } = input;

  logger.info(`Kronus receiving question: "${question}" (depth: ${depth}, repo: ${repository || 'all'})`);

  // Build summaries index
  const index = await buildSummariesIndex(repository);
  const formattedIndex = formatIndexForPrompt(index);

  // Minimal Kronus soul for oracle mode
  const kronusSoul = loadKronusSoulMinimal();

  const systemPrompt = `${kronusSoul}

## Your Knowledge Index
${formattedIndex}

## Instructions
- Answer the question using the knowledge index above
- Entry 0 (project_summaries) may be outdated - cross-check with recent journal entries dates
- Be concise and direct
- Cite sources by identifier (commit_hash, slug, ENG-XXX, project name)
- For dates, note recency - newest entries are most accurate for current state
- If the index doesn't have enough information, say so clearly
- Do not make up information not in the index

## Depth Mode: ${depth}
${depth === 'quick'
    ? 'Quick mode: Answer using summaries only. Do not request additional information.'
    : 'Deep mode: You may request to read full content if summaries are insufficient.'}
`;

  // Set API key for Anthropic
  const originalKey = process.env.ANTHROPIC_API_KEY;
  try {
    process.env.ANTHROPIC_API_KEY = config.aiApiKey;

    // Use Haiku for fast, efficient responses
    const model = anthropic('claude-haiku-4-5');

    const result = await generateText({
      model,
      system: systemPrompt,
      prompt: question,
      temperature: 0.5, // Lower temp for factual accuracy
    });

    // Extract sources from the answer (look for identifiers mentioned)
    const sources = extractSources(result.text, index);

    // Restore API key
    if (originalKey !== undefined) process.env.ANTHROPIC_API_KEY = originalKey;
    else delete process.env.ANTHROPIC_API_KEY;

    return {
      answer: result.text,
      sources,
      depth_used: depth,
    };
  } catch (error) {
    // Restore API key on error
    if (originalKey !== undefined) process.env.ANTHROPIC_API_KEY = originalKey;
    else delete process.env.ANTHROPIC_API_KEY;

    logger.error('Kronus agent error:', error);
    throw new Error(`Kronus failed to answer: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Extract source references from the answer text
 */
function extractSources(answer: string, index: SummariesIndex): KronusResponse['sources'] {
  const sources: KronusResponse['sources'] = [];
  const seen = new Set<string>();

  // Check for commit hashes (7+ char hex)
  const commitMatches = answer.match(/\b[a-f0-9]{7,40}\b/gi) || [];
  for (const hash of commitMatches) {
    const entry = index.journalEntries.find(e =>
      e.commit_hash.toLowerCase().startsWith(hash.toLowerCase())
    );
    if (entry && !seen.has(entry.commit_hash)) {
      seen.add(entry.commit_hash);
      sources.push({
        type: 'journal_entry',
        identifier: entry.commit_hash,
        title: entry.why?.substring(0, 50),
      });
    }
  }

  // Check for Linear identifiers (ENG-XXX, etc.)
  const linearMatches = answer.match(/\b[A-Z]{2,5}-\d+\b/g) || [];
  for (const identifier of linearMatches) {
    const issue = index.linearIssues.find(i => i.identifier === identifier);
    if (issue && !seen.has(identifier)) {
      seen.add(identifier);
      sources.push({
        type: 'linear_issue',
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
        type: 'linear_project',
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
        type: 'project_summary',
        identifier: ps.repository,
        title: ps.repository,
      });
    }
  }

  return sources;
}
