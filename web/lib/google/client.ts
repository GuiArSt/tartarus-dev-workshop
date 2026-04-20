// Google Workspace CLI Client for Tartarus
// Wraps the official @googleworkspace/cli (gws) binary
// Install: npm install -g @googleworkspace/cli
// Auth: gws auth login --scopes drive,gmail,calendar

import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

// ============================================================================
// TYPES
// ============================================================================

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
  webContentLink?: string;
  modifiedTime?: string;
  createdTime?: string;
  size?: string;
  parents?: string[];
  owners?: { displayName: string; emailAddress: string }[];
  shared?: boolean;
}

export interface GmailMessage {
  id: string;
  threadId: string;
  snippet: string;
  labelIds: string[];
  internalDate: string;
  from?: string;
  to?: string;
  subject?: string;
  date?: string;
}

export interface GmailMessageFull extends GmailMessage {
  body: string;
  htmlBody?: string;
  attachments?: { filename: string; mimeType: string; size: number }[];
}

export interface GmailSendResult {
  id: string;
  threadId: string;
  labelIds: string[];
}

export interface GmailThreadResult {
  id: string;
  messages: GmailMessage[];
}

export interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  start: { dateTime?: string; date?: string; timeZone?: string };
  end: { dateTime?: string; date?: string; timeZone?: string };
  attendees?: { email: string; responseStatus?: string; displayName?: string }[];
  htmlLink?: string;
  status?: string;
  created?: string;
  updated?: string;
  organizer?: { email: string; displayName?: string };
}

// ============================================================================
// CORE EXECUTOR
// ============================================================================

class GwsError extends Error {
  constructor(
    message: string,
    public code?: number,
    public reason?: string,
  ) {
    super(message);
    this.name = "GwsError";
  }
}

/**
 * Execute a gws CLI command and parse JSON output.
 * Uses execFile (not exec) to avoid shell injection.
 */
async function gwsExec<T>(args: string[]): Promise<T> {
  try {
    const { stdout, stderr } = await execFileAsync("gws", args, {
      timeout: 30000,
      maxBuffer: 10 * 1024 * 1024, // 10MB
      env: {
        ...process.env,
        // gws reads these automatically for auth
        // GOOGLE_WORKSPACE_CLI_CREDENTIALS_FILE
        // GOOGLE_WORKSPACE_CLI_TOKEN
        // GOOGLE_WORKSPACE_CLI_ACCOUNT
        // GOOGLE_WORKSPACE_CLI_IMPERSONATED_USER
      },
    });

    if (!stdout.trim()) {
      return {} as T;
    }

    return JSON.parse(stdout) as T;
  } catch (error: any) {
    // Parse gws structured error JSON if available
    if (error.stderr) {
      try {
        const errJson = JSON.parse(error.stderr);
        throw new GwsError(
          errJson.error?.message || error.message,
          errJson.error?.code,
          errJson.error?.reason,
        );
      } catch (parseErr) {
        if (parseErr instanceof GwsError) throw parseErr;
      }
    }

    // Check if gws is not installed
    if (error.code === "ENOENT") {
      throw new GwsError(
        "gws CLI not found. Install with: npm install -g @googleworkspace/cli",
      );
    }

    throw new GwsError(error.message || "gws command failed");
  }
}

// ============================================================================
// DRIVE
// ============================================================================

interface DriveListResponse {
  files: DriveFile[];
  nextPageToken?: string;
}

/** List files from Google Drive with optional filters */
export async function driveListFiles(options?: {
  query?: string;
  pageSize?: number;
  folderId?: string;
  mimeType?: string;
}): Promise<DriveFile[]> {
  const params: Record<string, any> = {
    pageSize: options?.pageSize ?? 20,
    fields: "files(id,name,mimeType,webViewLink,modifiedTime,createdTime,size,parents,owners,shared),nextPageToken",
  };

  // Build Drive query
  const queryParts: string[] = [];
  if (options?.query) queryParts.push(options.query);
  if (options?.folderId) queryParts.push(`'${options.folderId}' in parents`);
  if (options?.mimeType) queryParts.push(`mimeType='${options.mimeType}'`);
  if (queryParts.length > 0) params.q = queryParts.join(" and ");

  const result = await gwsExec<DriveListResponse>([
    "drive", "files", "list",
    "--params", JSON.stringify(params),
  ]);

  return result.files || [];
}

/** Get a single Drive file by ID */
export async function driveGetFile(fileId: string): Promise<DriveFile> {
  return gwsExec<DriveFile>([
    "drive", "files", "get",
    "--params", JSON.stringify({
      fileId,
      fields: "id,name,mimeType,webViewLink,webContentLink,modifiedTime,createdTime,size,parents,owners,shared",
    }),
  ]);
}

/** Search Drive files by text query */
export async function driveSearchFiles(
  query: string,
  pageSize?: number,
): Promise<DriveFile[]> {
  return driveListFiles({
    query: `fullText contains '${query.replace(/'/g, "\\'")}'`,
    pageSize: pageSize ?? 20,
  });
}

/** Create a new file in Google Drive */
export async function driveCreateFile(options: {
  name: string;
  mimeType: string;
  parentFolderId?: string;
  content?: string;
}): Promise<DriveFile> {
  const metadata: Record<string, any> = {
    name: options.name,
    mimeType: options.mimeType,
  };
  if (options.parentFolderId) {
    metadata.parents = [options.parentFolderId];
  }

  const args = [
    "drive", "files", "create",
    "--json", JSON.stringify(metadata),
  ];

  return gwsExec<DriveFile>(args);
}

// ============================================================================
// GMAIL
// ============================================================================

interface GmailRawMessage {
  id: string;
  threadId: string;
  snippet: string;
  labelIds: string[];
  internalDate: string;
  payload?: {
    headers?: { name: string; value: string }[];
    body?: { data?: string };
    parts?: any[];
  };
}

function extractHeader(message: GmailRawMessage, name: string): string | undefined {
  return message.payload?.headers?.find(
    (h) => h.name.toLowerCase() === name.toLowerCase(),
  )?.value;
}



/** List/triage Gmail messages via +triage helper */
export async function gmailListMessages(options?: {
  query?: string;
  maxResults?: number;
  labelIds?: string[];
}): Promise<GmailMessage[]> {
  const args = ["gmail", "+triage", "--format", "json"];
  if (options?.maxResults) args.push("--max", String(options.maxResults));
  // Merge query and label filters into one Gmail search query
  const queryParts: string[] = [];
  if (options?.query) queryParts.push(options.query);
  if (options?.labelIds?.length) {
    for (const label of options.labelIds) queryParts.push(`label:${label}`);
  }
  if (queryParts.length) args.push("--query", queryParts.join(" "));

  const result = await gwsExec<any>(args);
  const msgs = Array.isArray(result) ? result : result?.messages || [];
  return msgs.map((m: any) => ({
    id: m.id || "",
    threadId: "",
    snippet: "",
    labelIds: [],
    internalDate: "",
    from: m.from || "",
    to: "",
    subject: m.subject || "",
    date: m.date || "",
  }));
}

/** Read full Gmail message via +read helper */
export async function gmailGetMessage(messageId: string): Promise<GmailMessageFull> {
  const result = await gwsExec<any>([
    "gmail", "+read", "--id", messageId, "--headers", "--format", "json",
  ]);

  // +read returns from/to as structured objects, not strings
  const fromStr = result.from && typeof result.from === "object"
    ? `${result.from.name || ""} <${result.from.email}>`.trim()
    : result.from || "";
  const toStr = Array.isArray(result.to)
    ? result.to.map((r: any) => r.name ? `${r.name} <${r.email}>` : r.email).join(", ")
    : result.to || "";

  return {
    id: messageId,
    threadId: result.thread_id || "",
    snippet: "",
    labelIds: [],
    internalDate: "",
    from: fromStr,
    to: toStr,
    subject: result.subject || "",
    date: result.date || "",
    body: result.body_text || "",
    htmlBody: result.body_html || undefined,
    attachments: result.attachments,
  };
}

/** Send an email via +send helper */
export async function gmailSendMessage(options: {
  to: string;
  subject: string;
  body: string;
  cc?: string;
  bcc?: string;
}): Promise<GmailSendResult> {
  const args = [
    "gmail", "+send",
    "--to", options.to,
    "--subject", options.subject,
    "--body", options.body,
    "--format", "json",
  ];
  if (options.cc) args.push("--cc", options.cc);
  if (options.bcc) args.push("--bcc", options.bcc);

  return gwsExec<GmailSendResult>(args);
}

/** Search Gmail messages (convenience wrapper) */
export async function gmailSearchMessages(
  query: string,
  maxResults?: number,
): Promise<GmailMessage[]> {
  return gmailListMessages({ query, maxResults });
}

/** Get all messages in a Gmail thread (raw API — no helper available) */
export async function gmailGetThread(threadId: string): Promise<GmailThreadResult> {
  const raw = await gwsExec<{ id: string; messages: GmailRawMessage[] }>([
    "gmail", "users", "threads", "get",
    "--params", JSON.stringify({
      userId: "me",
      id: threadId,
      format: "metadata",
      metadataHeaders: ["From", "To", "Subject", "Date"],
    }),
  ]);

  const messages = (raw.messages || []).map((m) => ({
    id: m.id,
    threadId: m.threadId,
    snippet: m.snippet,
    labelIds: m.labelIds || [],
    internalDate: m.internalDate,
    from: extractHeader(m, "From"),
    to: extractHeader(m, "To"),
    subject: extractHeader(m, "Subject"),
    date: extractHeader(m, "Date"),
  }));

  return { id: raw.id, messages };
}

/** Modify labels on a Gmail message (raw API — no helper available) */
export async function gmailModifyMessage(options: {
  messageId: string;
  addLabelIds?: string[];
  removeLabelIds?: string[];
}): Promise<{ id: string; labelIds: string[] }> {
  return gwsExec([
    "gmail", "users", "messages", "modify",
    "--params", JSON.stringify({ userId: "me", id: options.messageId }),
    "--json", JSON.stringify({
      addLabelIds: options.addLabelIds || [],
      removeLabelIds: options.removeLabelIds || [],
    }),
  ]);
}

/** Reply to a Gmail message via +reply / +reply-all helper */
export async function gmailReplyToMessage(options: {
  messageId: string;
  body: string;
  replyAll?: boolean;
}): Promise<GmailSendResult> {
  const cmd = options.replyAll ? "+reply-all" : "+reply";
  const args = [
    "gmail", cmd,
    "--message-id", options.messageId,
    "--body", options.body,
    "--format", "json",
  ];

  return gwsExec<GmailSendResult>(args);
}

/** Create a draft via +send --draft helper */
export async function gmailCreateDraft(options: {
  to: string;
  subject: string;
  body: string;
  cc?: string;
  bcc?: string;
}): Promise<{ id: string; message: { id: string; threadId: string } }> {
  const args = [
    "gmail", "+send", "--draft",
    "--to", options.to,
    "--subject", options.subject,
    "--body", options.body,
    "--format", "json",
  ];
  if (options.cc) args.push("--cc", options.cc);
  if (options.bcc) args.push("--bcc", options.bcc);

  return gwsExec(args);
}

// ============================================================================
// CALENDAR
// ============================================================================

interface CalendarListResponse {
  items: CalendarEvent[];
  nextPageToken?: string;
}

/** List upcoming Google Calendar events */
export async function calendarListEvents(options?: {
  calendarId?: string;
  timeMin?: string;
  timeMax?: string;
  maxResults?: number;
}): Promise<CalendarEvent[]> {
  const calendarId = options?.calendarId ?? "primary";
  const now = new Date();
  const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const params: Record<string, any> = {
    calendarId,
    timeMin: options?.timeMin ?? now.toISOString(),
    timeMax: options?.timeMax ?? weekFromNow.toISOString(),
    maxResults: options?.maxResults ?? 10,
    singleEvents: true,
    orderBy: "startTime",
  };

  const result = await gwsExec<CalendarListResponse>([
    "calendar", "events", "list",
    "--params", JSON.stringify(params),
  ]);

  return result.items || [];
}

/** Get a specific calendar event by ID */
export async function calendarGetEvent(
  eventId: string,
  calendarId?: string,
): Promise<CalendarEvent> {
  return gwsExec<CalendarEvent>([
    "calendar", "events", "get",
    "--params", JSON.stringify({
      calendarId: calendarId ?? "primary",
      eventId,
    }),
  ]);
}

/** Create a new calendar event */
export async function calendarCreateEvent(options: {
  summary: string;
  start: string;
  end: string;
  description?: string;
  location?: string;
  attendees?: string[];
  calendarId?: string;
}): Promise<CalendarEvent> {
  const calendarId = options.calendarId ?? "primary";

  const eventBody: Record<string, any> = {
    summary: options.summary,
    start: { dateTime: options.start },
    end: { dateTime: options.end },
  };
  if (options.description) eventBody.description = options.description;
  if (options.location) eventBody.location = options.location;
  if (options.attendees?.length) {
    eventBody.attendees = options.attendees.map((email) => ({ email }));
  }

  return gwsExec<CalendarEvent>([
    "calendar", "events", "insert",
    "--params", JSON.stringify({ calendarId }),
    "--json", JSON.stringify(eventBody),
  ]);
}

/** Update an existing calendar event */
export async function calendarUpdateEvent(
  eventId: string,
  updates: {
    summary?: string;
    start?: string;
    end?: string;
    description?: string;
    location?: string;
    attendees?: string[];
  },
  calendarId?: string,
): Promise<CalendarEvent> {
  const cid = calendarId ?? "primary";

  const eventBody: Record<string, any> = {};
  if (updates.summary) eventBody.summary = updates.summary;
  if (updates.start) eventBody.start = { dateTime: updates.start };
  if (updates.end) eventBody.end = { dateTime: updates.end };
  if (updates.description !== undefined) eventBody.description = updates.description;
  if (updates.location !== undefined) eventBody.location = updates.location;
  if (updates.attendees) {
    eventBody.attendees = updates.attendees.map((email) => ({ email }));
  }

  return gwsExec<CalendarEvent>([
    "calendar", "events", "patch",
    "--params", JSON.stringify({ calendarId: cid, eventId }),
    "--json", JSON.stringify(eventBody),
  ]);
}
