// Slite API Client for web app
// REST wrapper for Slite's OpenAPI v1

const SLITE_API_URL = "https://api.slite.com/v1";

function getApiKey(): string {
  const apiKey = process.env.SLITE_API_KEY;
  if (!apiKey) {
    throw new Error("SLITE_API_KEY environment variable is required");
  }
  return apiKey;
}

async function sliteRequest<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(`${SLITE_API_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "x-slite-api-key": getApiKey(),
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Slite API error (${response.status}): ${response.statusText} ${body}`);
  }

  return response.json();
}

// Types matching Slite OpenAPI spec

export interface SliteNote {
  id: string;
  title: string;
  url: string;
  parentNoteId: string | null;
  updatedAt: string;
  lastEditedAt: string;
  archivedAt: string | null;
  reviewState?: "Verified" | "Outdated" | "VerificationRequested";
  owner?: { userId?: string; groupId?: string };
}

export interface SliteNoteWithContent extends SliteNote {
  content: string; // Markdown or HTML depending on format param
}

interface PaginatedNotes {
  notes: SliteNote[];
  total: number;
  hasNextPage: boolean;
  nextCursor: string | null;
}

export interface SearchNoteHit {
  id: string;
  title: string;
  type: "rich_text" | "discussion" | "collection";
  updatedAt: string;
  lastEditedAt: string;
  archivedAt: string | null;
  highlight: string;
  reviewState?: "Verified" | "Outdated" | "VerificationRequested";
  parentNotes?: { id: string; title: string }[];
}

interface SearchResult {
  hits: SearchNoteHit[];
  nbPages: number;
  page: number;
}

interface AskResult {
  answer: string;
  sources: { id: string; title: string; url: string; updatedAt: string }[];
}

// ===== API Functions =====

/** Get authenticated user info */
export async function getMe() {
  return sliteRequest<{
    email: string;
    displayName: string;
    organizationName: string;
    organizationDomain: string;
  }>("/me");
}

/** List notes with optional parent filter. Paginates automatically up to maxPages. */
export async function listNotes(options?: {
  parentNoteId?: string;
  maxPages?: number;
}): Promise<SliteNote[]> {
  const allNotes: SliteNote[] = [];
  let cursor: string | undefined;
  const maxPages = options?.maxPages ?? 10;

  for (let page = 0; page < maxPages; page++) {
    const params = new URLSearchParams();
    if (options?.parentNoteId) params.set("parentNoteId", options.parentNoteId);
    if (cursor) params.set("cursor", cursor);

    const result = await sliteRequest<PaginatedNotes>(
      `/notes${params.toString() ? `?${params}` : ""}`
    );
    allNotes.push(...result.notes);

    if (!result.hasNextPage || !result.nextCursor) break;
    cursor = result.nextCursor;
  }

  return allNotes;
}

/** Get a single note with full content */
export async function getNote(
  noteId: string,
  format: "md" | "html" = "md"
): Promise<SliteNoteWithContent> {
  return sliteRequest<SliteNoteWithContent>(`/notes/${noteId}?format=${format}`);
}

/** Create a new note */
export async function createNote(input: {
  title: string;
  parentNoteId?: string;
  markdown?: string;
  html?: string;
}): Promise<SliteNote> {
  return sliteRequest<SliteNote>("/notes", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/** Update an existing note */
export async function updateNote(
  noteId: string,
  input: { title?: string; markdown?: string; html?: string }
): Promise<SliteNote> {
  return sliteRequest<SliteNote>(`/notes/${noteId}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

/** Get children of a note (paginated) */
export async function getNoteChildren(
  noteId: string,
  cursor?: string
): Promise<PaginatedNotes> {
  const params = new URLSearchParams();
  if (cursor) params.set("cursor", cursor);
  return sliteRequest<PaginatedNotes>(
    `/notes/${noteId}/children${params.toString() ? `?${params}` : ""}`
  );
}

/** Search notes in the workspace */
export async function searchNotes(
  query: string,
  options?: {
    parentNoteId?: string;
    page?: number;
    hitsPerPage?: number;
    lastEditedAfter?: string;
    includeArchived?: boolean;
  }
): Promise<SearchResult> {
  const params = new URLSearchParams({ query });
  if (options?.parentNoteId) params.set("parentNoteId", options.parentNoteId);
  if (options?.page !== undefined) params.set("page", String(options.page));
  if (options?.hitsPerPage) params.set("hitsPerPage", String(options.hitsPerPage));
  if (options?.lastEditedAfter) params.set("lastEditedAfter", options.lastEditedAfter);
  if (options?.includeArchived) params.set("includeArchived", "true");

  return sliteRequest<SearchResult>(`/search-notes?${params}`);
}

/** Ask Slite AI a question — returns answer with source references */
export async function askSlite(
  question: string,
  parentNoteId?: string
): Promise<AskResult> {
  const params = new URLSearchParams({ question });
  if (parentNoteId) params.set("parentNoteId", parentNoteId);
  return sliteRequest<AskResult>(`/ask?${params}`);
}
