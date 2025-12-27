# Developer Journal Workspace

**A dual-interface platform (MCP server + web app) that transforms your git commits into structured, AI-powered developer journals.**

> **Note**: Configure database location via `JOURNAL_DB_PATH` and Soul.xml path via `SOUL_XML_PATH` environment variables.

Capture the *why* behind your code, document decisions, track technologies, and preserve the wisdom that emerges from your work—all automatically analyzed and stored for future reference.

## 🎯 What This Is

A **two-part system** for developer journaling:

1. **MCP Server (v2.0.0)** - 10 read-focused tools that enable AI agents (Claude, Cursor, etc.) to create and query journal entries
2. **Tartarus Web App** - A dark, mythological-themed dashboard for browsing, editing, and enriching your journal

### What You Get

- **Structured documentation** of every commit via MCP
- **AI-powered analysis** by Kronus (Claude Haiku 4.5) that extracts meaning, decisions, and insights
- **Rich web interface** for browsing repositories, reading entries, and managing content
- **Kronus Chat** - Interactive AI conversations about your entries
- **Atropos Spellchecker** - AI-powered text correction with git-style diff view and learning memory
- **Rich attachments** for diagrams, images, and documentation
- **Project summaries** that capture high-level architecture and decisions

### The Problem It Solves

When you look back at code from 6 months ago, you often ask:
- *Why did we make this change?*
- *What problem were we solving?*
- *What alternatives did we consider?*
- *What technologies did we evaluate?*

Traditional commit messages rarely capture this context. This journal system uses AI to extract and structure this information automatically, creating a searchable knowledge base of your development journey.

## 🧠 How the Journal Works

### The Workflow

1. **Your AI agent** (Claude, ChatGPT, Cursor, etc.) completes a task and makes a commit
2. **The agent calls** `journal_create_entry` with:
   - Git metadata (commit hash, repository, branch, author, date)
   - A raw report of what was done (the agent's own summary)
3. **Kronus analyzes** the commit using the configured AI provider (Claude 4.5 Sonnet preferred, GPT 5.1, or Gemini 3) with a specialized persona
4. **Structured data is extracted**:
   - **Why**: The motivation and problem being solved
   - **What Changed**: Concrete modifications made
   - **Decisions**: Key decisions and their reasoning
   - **Technologies**: Tech stack, frameworks, or tools discussed/used
   - **Kronus Wisdom**: Optional philosophical reflection or insight (when genuine)
5. **Everything is stored** in SQLite with automatic backups

### Kronus: The AI Analyst

Kronus is an empathetic AI persona designed to understand code changes not just as technical modifications, but as human decisions with context, trade-offs, and meaning. It:

- Extracts the *why* behind changes, not just the *what*
- Identifies key decisions and their reasoning
- Recognizes when genuine insight emerges (Kronus Wisdom)
- Maintains consistency across entries while adapting to each project's context

The persona is defined in `Soul.xml` and guides the AI's analysis to be both technically accurate and contextually aware.

### Structured Data Model

Each journal entry contains:

```typescript
{
  commit_hash: string;        // Unique identifier
  repository: string;          // Project name
  branch: string;              // Git branch
  author: string;              // Committer
  date: string;                // ISO timestamp
  
  // AI-extracted fields:
  why: string;                 // Motivation and problem
  what_changed: string;        // Concrete changes
  decisions: string;            // Key decisions and reasoning
  technologies: string;         // Tech stack discussed/used
  kronus_wisdom: string | null; // Optional insight/reflection
  
  // Raw context:
  raw_agent_report: string;     // Original agent summary
  
  // Metadata:
  created_at: string;           // Entry creation timestamp
}
```

### Project Summaries: "Entry 0"

Beyond individual commits, you can create **project summaries** that capture:
- High-level architecture
- Core purpose and goals
- Major architectural decisions
- Technology choices
- Current project status

These serve as the "entry 0" for each repository—the overview that contextualizes all subsequent commits.

### Attachments: Rich Media Support

Attach files to any journal entry:
- **Images**: Screenshots, diagrams, architecture visuals
- **Mermaid diagrams**: System architecture, flowcharts
- **PDFs**: Documentation, research papers
- **Any file**: With descriptions explaining their purpose

Each attachment includes:
- Filename and MIME type
- Description (what it shows/explains)
- Base64-encoded data
- File size and upload timestamp

## 🚀 Features

### 📝 MCP Server - Journal Tools (10 Tools)

The MCP server provides **read-focused** tools for AI agents:

- **`journal_create_entry`** - Create entries with AI analysis (Kronus)
- **`journal_get_entry`** - Retrieve a single entry by commit hash
- **`journal_list_by_repository`** - List entries for a repository (paginated)
- **`journal_list_by_branch`** - List entries for a specific branch (paginated)
- **`journal_list_repositories`** - List all repositories with entries
- **`journal_list_branches`** - List branches for a repository
- **`journal_get_project_summary`** - Get high-level project summary
- **`journal_list_project_summaries`** - List all project summaries (paginated)
- **`journal_list_attachments`** - List attachments for an entry
- **`journal_get_attachment`** - Get attachment metadata/data

> **Note**: Write/edit operations (editing entries, managing attachments, project summaries) are handled by the Tartarus web app for a richer editing experience.

### 🌑 Tartarus Web App

A dark, mythological-themed dashboard with teal/gold accents:

- **Repository Browser** - Browse all your projects and their entries
- **Journal Reader** - Read entries with full formatting, edit inline with tag management
- **Kronus Chat** - Have AI conversations about your journal entries
- **Atropos Spellchecker** - AI text correction with:
  - Git-style diff view showing exactly what changed
  - Learning memory that adapts to your writing style
  - Intent clarification for ambiguous corrections
- **Project Summaries** - Create and edit high-level project documentation
- **Attachment Management** - Upload and manage images, diagrams, PDFs
- **Linear Integration** - Link journal entries to Linear projects/issues

### 📋 Linear Integration

Available through the web app:
- Link journal repositories to Linear projects/issues
- View Linear integration status in project summaries
- Use `linear_project_id` and `linear_issue_id` fields

## 📦 Installation

### 1. Install Dependencies

```bash
npm install
```

### 2. Build the Server

```bash
npm run build
```

### 3. Configure Environment

You can configure environment variables in two ways:

**Option A: Using .env file (recommended for local development)**
```bash
cp .env.example .env
# Edit .env with your credentials
```

**Option B: Pass env vars in MCP config** (see step 4 below)

**Required for Journal module:** At least one AI provider (Anthropic, OpenAI, or Google)

**Note**: If using `.env` file, you can skip the `env` section in MCP config. If passing env vars in MCP config, the `.env` file is optional.

### 4. Add to Your MCP Client Configuration

**📝 Important**: Replace `/path/to/developer-journal-workspace` with your actual installation path in all configs below.

The server automatically loads `.env` from the project root, so you don't need to specify environment variables in the config files below.

---

#### **Cursor** (`~/.cursor/mcp.json`)

```json
{
  "mcpServers": {
    "developer-journal": {
      "command": "node",
      "args": ["/path/to/developer-journal-workspace/dist/index.js"]
    }
  }
}
```

---

#### **Claude Desktop** 

**macOS** (`~/Library/Application Support/Claude/claude_desktop_config.json`):
```json
{
  "mcpServers": {
    "developer-journal": {
      "command": "node",
      "args": ["/path/to/developer-journal-workspace/dist/index.js"]
    }
  }
}
```

**Windows** (`%APPDATA%\Claude\claude_desktop_config.json`):
```json
{
  "mcpServers": {
    "developer-journal": {
      "command": "node",
      "args": ["C:\\path\\to\\developer-journal-workspace\\dist\\index.js"]
    }
  }
}
```

**Linux** (`~/.config/Claude/claude_desktop_config.json`):
```json
{
  "mcpServers": {
    "developer-journal": {
      "command": "node",
      "args": ["/path/to/developer-journal-workspace/dist/index.js"]
    }
  }
}
```

---

#### **VS Code with MCP Extension**

If using an MCP extension for VS Code, add to your VS Code settings (`settings.json`):

```json
{
  "mcp.servers": {
    "developer-journal": {
      "command": "node",
      "args": ["/path/to/developer-journal-workspace/dist/index.js"]
    }
  }
}
```

---

#### **Google AI Studio / Gemini** (if MCP support is available)

```json
{
  "mcpServers": {
    "developer-journal": {
      "command": "node",
      "args": ["/path/to/developer-journal-workspace/dist/index.js"]
    }
  }
}
```

---

#### **Other MCP Clients**

For any other MCP client, use this standard format:

```json
{
  "mcpServers": {
    "developer-journal": {
      "command": "node",
      "args": ["/absolute/path/to/Developer Journal Workspace/dist/index.js"]
    }
  }
}
```

**Note**: If your MCP client doesn't support loading `.env` files automatically, you can add an `env` section to the config with your environment variables (see `.env.example` for available variables).

## 🔧 Module Setup

### Slack Setup

1. Visit [Slack Apps](https://api.slack.com/apps)
2. Create New App → "From scratch"
3. Add Bot Scopes: `channels:read`, `channels:history`, `chat:write`, `users:read`
4. Install to Workspace
5. Copy Bot Token (`xoxb-...`) and Team ID

### Linear Setup

1. Go to Linear → Personal Settings → API → Personal API Keys
2. Create new key
3. Copy the key (`lin_api_...`)
4. **(Optional)** Set `LINEAR_USER_ID` to your Linear user ID for default assignee filtering in `list_issues`. Use the `linear_get_viewer` tool to find your user ID.

### Journal Setup

The Journal module requires at least one AI provider:

- **Anthropic (Recommended)**: Get API key from [console.anthropic.com](https://console.anthropic.com)
  - Uses **Claude 4.5 Sonnet** (hardcoded)
- **OpenAI**: Get API key from [platform.openai.com](https://platform.openai.com)
  - Uses **GPT 5.1** (hardcoded)
- **Google**: Get API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
  - Uses **Gemini 3** (hardcoded)

**Provider Priority**: Anthropic (preferred) → OpenAI → Google (first API key found)

**Note**: Models are hardcoded and cannot be overridden. The system automatically selects the first available provider in priority order.

## 📚 Usage Examples

### Create a Journal Entry

When your AI agent completes a task, it can create a journal entry:

```json
{
  "tool": "journal_create_entry",
  "arguments": {
    "commit_hash": "abc123def456",
    "repository": "my-awesome-project",
    "branch": "main",
    "author": "John Doe",
    "date": "2025-01-15T10:00:00Z",
    "raw_agent_report": "Added pagination to API endpoints. Implemented cursor-based pagination for better performance. Decided against offset-based pagination due to consistency issues with concurrent writes. Used PostgreSQL's LIMIT/OFFSET with cursor tracking."
  }
}
```

Kronus will analyze this and extract:
- **Why**: Need for better API performance and consistency
- **What Changed**: Cursor-based pagination implementation
- **Decisions**: Chose cursor over offset for consistency
- **Technologies**: PostgreSQL, cursor-based pagination
- **Kronus Wisdom**: (Optional insight if one emerges)

### List Entries with Pagination

```json
{
  "tool": "journal_list_by_repository",
  "arguments": {
    "repository": "my-awesome-project",
    "limit": 20,
    "offset": 0
  }
}
```

Each entry includes `attachment_count` showing how many files are attached.

### Attach a File to an Entry

```json
{
  "tool": "journal_attach_file",
  "arguments": {
    "commit_hash": "abc123def456",
    "filename": "architecture.mmd",
    "mime_type": "text/plain",
    "description": "System architecture diagram showing the new pagination flow",
    "data_base64": "base64-encoded-mermaid-content..."
  }
}
```

### Create a Project Summary

```json
{
  "tool": "journal_upsert_project_summary",
  "arguments": {
    "repository": "my-awesome-project",
    "git_url": "https://github.com/user/my-awesome-project",
    "summary": "A high-performance API service for real-time data processing",
    "purpose": "Provide low-latency data access with strong consistency guarantees",
    "architecture": "Microservices architecture with PostgreSQL backend, Redis caching, and GraphQL API",
    "key_decisions": "Chose PostgreSQL for ACID guarantees, GraphQL for flexible queries, Redis for caching",
    "technologies": "Node.js, TypeScript, PostgreSQL, Redis, GraphQL, Docker",
    "status": "Active development, v1.2.0"
  }
}
```

## 🗄️ Database & Backups

- **Database**: SQLite stored at `journal.db` in project root by default (configurable via `JOURNAL_DB_PATH` env var)
- **Auto-backup**: Automatically backs up to `journal_backup.sql` in project root after any database change
- **Export**: All entries, project summaries, and attachment metadata are included in backups
- **Migration**: The database uses `CREATE TABLE IF NOT EXISTS`, so your existing database will work without any changes. Schema migrations (like adding new columns) happen automatically.

### Using an Existing Database

If you have an existing database from a previous installation (e.g., from `mcp-unified-workspace`), you can point to it:

**Option 1: Set `JOURNAL_DB_PATH` in `.env`**
```bash
# Point to your old database location
JOURNAL_DB_PATH=~/.mcp-unified/journal.db
# Or use an absolute path
JOURNAL_DB_PATH=/path/to/your/existing/journal.db
```

**Option 2: Copy your database to the new location**
```bash
# Copy your old database to the new project root
cp ~/.mcp-unified/journal.db /path/to/developer-journal-workspace/journal.db
```

The app will automatically migrate your database schema if needed (e.g., adding new columns like `description` to attachments).

## 🧠 Soul.xml Configuration

The Kronus persona is defined in `Soul.xml`. By default, uses `Soul.xml` in project root.

**To use a custom Soul.xml file**: Set `SOUL_XML_PATH` in your `.env` file (e.g., `SOUL_XML_PATH=./Soul.xml.local`)

The database is self-contained in your project root, making it easy to:
- Version control the backup SQL file
- Share your journal with team members
- Restore from backup if needed
- Migrate to a different system

## 🛠️ Development

```bash
# Build
npm run build

# Watch mode
npm run dev

# Run
npm start
```

## 📊 Tool Count

- **MCP Server Journal Tools**: 10 tools (read-focused)
- **Web App Features**: Repository browser, Journal reader, Kronus chat, Atropos spellchecker, Project summaries, Attachments

## 🔒 MCP Truncation Compliance

All tools comply with common MCP truncation limits used by many AI agents:
- **~256 lines** per tool output
- **~10 KiB** per tool output

Tools use pagination, field exclusion, and truncation warnings to stay within limits, ensuring reliable output regardless of which MCP client you use.

## 💡 Philosophy

### Why Structured Journaling?

Code tells you *what* happened. Commit messages sometimes tell you *what* changed. But rarely do they capture:

- **The problem** you were solving
- **The alternatives** you considered
- **The reasoning** behind decisions
- **The context** that made those decisions right at that time

This journal system bridges that gap by using AI to extract and structure this context automatically.

### The Kronus Approach

Kronus isn't just extracting data—it's understanding context. It recognizes:
- When a change is routine vs. when it represents a significant decision
- When technical choices reflect deeper architectural thinking
- When genuine insight emerges from the work (Kronus Wisdom)

This creates a journal that's not just a log, but a **knowledge base** that grows more valuable over time.

### Knowledge Preservation

As projects evolve, context is lost. Team members leave, memories fade, and decisions become mysterious. This journal system:

- **Preserves context** at the moment decisions are made
- **Makes knowledge searchable** through structured fields
- **Captures wisdom** that emerges from the work
- **Enables onboarding** by providing project history and reasoning

## 📝 License

MIT

## 🤝 Contributing

This is a public release of a developer journaling system. Feel free to fork, customize, and adapt it to your needs!

## 🖥️ Running the Web App

The Tartarus web app is built with Next.js:

```bash
cd web
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

The web app shares the same SQLite database as the MCP server, so all your journal entries are immediately available.

---

**Built with**: TypeScript, Node.js, Next.js, SQLite, Claude Haiku 4.5, AI SDK, Model Context Protocol