// Notion API Client for web app
// REST wrapper for Notion's public API v1

const NOTION_API_URL = "https://api.notion.com/v1";
const NOTION_VERSION = "2022-06-28";

function getApiKey(): string {
  const apiKey = process.env.NOTION_API_KEY;
  if (!apiKey) {
    throw new Error("NOTION_API_KEY environment variable is required");
  }
  return apiKey;
}

async function notionRequest<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(`${NOTION_API_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getApiKey()}`,
      "Notion-Version": NOTION_VERSION,
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `Notion API error (${response.status}): ${response.statusText} ${body}`
    );
  }

  return response.json();
}

// ===== Types matching Notion API spec =====

export interface NotionUser {
  id: string;
  name: string | null;
  avatar_url: string | null;
  type: "person" | "bot";
}

export interface NotionPage {
  id: string;
  created_time: string;
  last_edited_time: string;
  created_by: { id: string };
  last_edited_by: { id: string };
  parent:
    | { type: "page_id"; page_id: string }
    | { type: "database_id"; database_id: string }
    | { type: "workspace"; workspace: true };
  archived: boolean;
  url: string;
  icon: { type: "emoji"; emoji: string } | { type: "external"; external: { url: string } } | null;
  cover: { type: "external"; external: { url: string } } | null;
  properties: Record<string, any>;
}

export interface NotionBlock {
  id: string;
  type: string;
  has_children: boolean;
  [key: string]: any;
}

interface PaginatedResults<T> {
  results: T[];
  has_more: boolean;
  next_cursor: string | null;
}

export interface NotionSearchResult {
  id: string;
  title: string;
  url: string;
  lastEditedTime: string;
  icon: string | null;
  parentType: string;
}

// ===== Helper: Extract page title from properties =====

export function extractTitle(page: NotionPage): string {
  for (const prop of Object.values(page.properties)) {
    if (prop.type === "title" && prop.title?.length > 0) {
      return prop.title.map((t: any) => t.plain_text).join("");
    }
  }
  return "Untitled";
}

/** Extract icon string from page */
export function extractIcon(page: NotionPage): string | null {
  if (!page.icon) return null;
  if (page.icon.type === "emoji") return page.icon.emoji;
  if (page.icon.type === "external") return page.icon.external.url;
  return null;
}

/** Extract parent info */
export function extractParent(page: NotionPage): {
  id: string | null;
  type: string;
} {
  if (page.parent.type === "page_id")
    return { id: page.parent.page_id, type: "page_id" };
  if (page.parent.type === "database_id")
    return { id: page.parent.database_id, type: "database_id" };
  return { id: null, type: "workspace" };
}

// ===== Block → Markdown converter =====

function richTextToMarkdown(richTexts: any[]): string {
  if (!richTexts) return "";
  return richTexts
    .map((rt: any) => {
      let text = rt.plain_text || "";
      if (rt.annotations?.bold) text = `**${text}**`;
      if (rt.annotations?.italic) text = `*${text}*`;
      if (rt.annotations?.strikethrough) text = `~~${text}~~`;
      if (rt.annotations?.code) text = `\`${text}\``;
      if (rt.href) text = `[${text}](${rt.href})`;
      return text;
    })
    .join("");
}

function blockToMarkdown(block: NotionBlock): string {
  const type = block.type;
  const data = block[type];
  if (!data) return "";

  switch (type) {
    case "paragraph":
      return richTextToMarkdown(data.rich_text);
    case "heading_1":
      return `# ${richTextToMarkdown(data.rich_text)}`;
    case "heading_2":
      return `## ${richTextToMarkdown(data.rich_text)}`;
    case "heading_3":
      return `### ${richTextToMarkdown(data.rich_text)}`;
    case "bulleted_list_item":
      return `- ${richTextToMarkdown(data.rich_text)}`;
    case "numbered_list_item":
      return `1. ${richTextToMarkdown(data.rich_text)}`;
    case "to_do":
      return `- [${data.checked ? "x" : " "}] ${richTextToMarkdown(data.rich_text)}`;
    case "toggle":
      return `<details><summary>${richTextToMarkdown(data.rich_text)}</summary></details>`;
    case "code":
      return `\`\`\`${data.language || ""}\n${richTextToMarkdown(data.rich_text)}\n\`\`\``;
    case "quote":
      return `> ${richTextToMarkdown(data.rich_text)}`;
    case "callout":
      return `> ${data.icon?.emoji || "💡"} ${richTextToMarkdown(data.rich_text)}`;
    case "divider":
      return "---";
    case "image":
      const url =
        data.type === "external"
          ? data.external?.url
          : data.file?.url;
      return url ? `![image](${url})` : "";
    case "bookmark":
      return data.url ? `[${data.url}](${data.url})` : "";
    case "link_preview":
      return data.url ? `[${data.url}](${data.url})` : "";
    case "table_of_contents":
      return ""; // Skip TOC blocks
    case "child_page":
      return `📄 ${data.title}`;
    case "child_database":
      return `📊 ${data.title}`;
    default:
      return "";
  }
}

// ===== API Functions =====

/** Get the current bot user (self) */
export async function getMe(): Promise<NotionUser> {
  const data = await notionRequest<any>("/users/me");
  return {
    id: data.id,
    name: data.name,
    avatar_url: data.avatar_url,
    type: data.type,
  };
}

/** Get a user by ID */
export async function getUser(userId: string): Promise<NotionUser> {
  const data = await notionRequest<any>(`/users/${userId}`);
  return {
    id: data.id,
    name: data.name,
    avatar_url: data.avatar_url,
    type: data.type,
  };
}

/**
 * Search pages the integration has access to.
 * Uses Notion's /search endpoint.
 */
export async function searchPages(
  query?: string,
  options?: { pageSize?: number; startCursor?: string }
): Promise<{ pages: NotionPage[]; hasMore: boolean; nextCursor: string | null }> {
  const body: Record<string, any> = {
    filter: { value: "page", property: "object" },
    sort: { direction: "descending", timestamp: "last_edited_time" },
    page_size: options?.pageSize ?? 100,
  };
  if (query) body.query = query;
  if (options?.startCursor) body.start_cursor = options.startCursor;

  const result = await notionRequest<PaginatedResults<NotionPage>>("/search", {
    method: "POST",
    body: JSON.stringify(body),
  });

  return {
    pages: result.results,
    hasMore: result.has_more,
    nextCursor: result.next_cursor,
  };
}

/**
 * List all accessible pages (paginated, up to maxPages).
 * Uses /search with no query to list everything.
 */
export async function listPages(options?: {
  maxPages?: number;
}): Promise<NotionPage[]> {
  const allPages: NotionPage[] = [];
  let cursor: string | undefined;
  const maxPages = options?.maxPages ?? 10;

  for (let page = 0; page < maxPages; page++) {
    const result = await searchPages(undefined, {
      pageSize: 100,
      startCursor: cursor,
    });
    allPages.push(...result.pages);

    if (!result.hasMore || !result.nextCursor) break;
    cursor = result.nextCursor;
  }

  return allPages;
}

/** Get a single page by ID (metadata only) */
export async function getPage(pageId: string): Promise<NotionPage> {
  return notionRequest<NotionPage>(`/pages/${pageId}`);
}

/** Get page content as markdown by fetching all blocks */
export async function getPageContent(pageId: string): Promise<string> {
  const blocks: NotionBlock[] = [];
  let cursor: string | undefined;

  // Fetch all blocks (paginate)
  for (let i = 0; i < 20; i++) {
    const params = cursor ? `?start_cursor=${cursor}` : "";
    const result = await notionRequest<PaginatedResults<NotionBlock>>(
      `/blocks/${pageId}/children${params}`
    );
    blocks.push(...result.results);
    if (!result.has_more || !result.next_cursor) break;
    cursor = result.next_cursor;
  }

  // Convert blocks to markdown
  return blocks.map(blockToMarkdown).filter(Boolean).join("\n\n");
}

/** Create a new page */
export async function createPage(input: {
  parentPageId?: string;
  parentDatabaseId?: string;
  title: string;
  markdown?: string;
}): Promise<NotionPage> {
  const parent = input.parentDatabaseId
    ? { database_id: input.parentDatabaseId }
    : input.parentPageId
      ? { page_id: input.parentPageId }
      : (() => {
          throw new Error("Either parentPageId or parentDatabaseId is required");
        })();

  const children: any[] = [];
  if (input.markdown) {
    // Simple markdown to blocks: split by lines, create paragraph blocks
    const lines = input.markdown.split("\n").filter((l) => l.trim());
    for (const line of lines.slice(0, 100)) {
      // Notion API limit: 100 blocks per request
      children.push({
        object: "block",
        type: "paragraph",
        paragraph: {
          rich_text: [{ type: "text", text: { content: line } }],
        },
      });
    }
  }

  const body: any = {
    parent,
    properties: {
      title: { title: [{ text: { content: input.title } }] },
    },
  };

  if (children.length > 0) {
    body.children = children;
  }

  return notionRequest<NotionPage>("/pages", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/** Update a page's properties (title, archived status) */
export async function updatePage(
  pageId: string,
  input: { title?: string; archived?: boolean }
): Promise<NotionPage> {
  const body: any = { properties: {} };

  if (input.title !== undefined) {
    body.properties.title = {
      title: [{ text: { content: input.title } }],
    };
  }
  if (input.archived !== undefined) {
    body.archived = input.archived;
  }

  return notionRequest<NotionPage>(`/pages/${pageId}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

/** Append content blocks to a page */
export async function appendBlocks(
  pageId: string,
  markdown: string
): Promise<void> {
  const lines = markdown.split("\n").filter((l) => l.trim());
  const children = lines.slice(0, 100).map((line) => ({
    object: "block" as const,
    type: "paragraph" as const,
    paragraph: {
      rich_text: [{ type: "text" as const, text: { content: line } }],
    },
  }));

  await notionRequest(`/blocks/${pageId}/children`, {
    method: "PATCH",
    body: JSON.stringify({ children }),
  });
}

/** Search pages with query string */
export async function searchNotionPages(
  query: string,
  options?: { pageSize?: number }
): Promise<NotionSearchResult[]> {
  const { pages } = await searchPages(query, {
    pageSize: options?.pageSize ?? 10,
  });

  return pages.map((p) => ({
    id: p.id,
    title: extractTitle(p),
    url: p.url,
    lastEditedTime: p.last_edited_time,
    icon: extractIcon(p),
    parentType: p.parent.type,
  }));
}
