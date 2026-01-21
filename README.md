# Developer Journal Workspace

A dual-interface platform (MCP server + web app) that transforms git commits into structured, AI-powered developer journals.

## What This Is

1. **MCP Server** - Tools and resources for AI agents (Claude, Cursor, etc.) to read and create journal entries
2. **Tartarus Web App** - Dark-themed dashboard for browsing, editing, chatting with Kronus, and managing your journal

### Key Features

- **Structured journal entries** linked to git commits
- **Entry 0 (Living Project Summary)** - Evolving project documentation
- **Kronus Chat** - AI conversations powered by Gemini 3 Pro (1M context) or Claude Sonnet 4.5
- **Atropos Spellchecker** - AI text correction with diff view
- **Attachments** - Images, diagrams, PDFs linked to entries
- **Repository documents** - Writings, prompts, notes
- **Linear integration** - Cached Linear projects and issues

## Architecture

```
┌─────────────────┐     ┌─────────────────┐
│   AI Agents     │     │    Humans       │
│ (Claude, etc.)  │     │                 │
└────────┬────────┘     └────────┬────────┘
         │                       │
         ▼                       ▼
┌─────────────────┐     ┌─────────────────┐
│   MCP Server    │     │  Tartarus Web   │
│                 │     │     App         │
│ • 12 tools      │     │                 │
│ • 18 resources  │     │ • Browse/Edit   │
│ • 3 prompts     │     │ • Kronus chat   │
│                 │     │ • Attachments   │
└────────┬────────┘     └────────┬────────┘
         │                       │
         └───────────┬───────────┘
                     ▼
            ┌─────────────────┐
            │   SQLite DB     │
            │  (journal.db)   │
            └─────────────────┘
```

## Quick Start

### Option 1: Docker (Recommended)

```bash
cp .env.example .env
# Edit .env with your API keys

docker compose up -d
# Access at http://localhost:3777
```

### Option 2: Local Development

```bash
# MCP server
npm install && npm run build

# Web app
cd web && npm install
export JOURNAL_DB_PATH="/path/to/data/journal.db"
export GOOGLE_GENERATIVE_AI_API_KEY="your-key"
npm run dev
# Access at http://localhost:3000
```

## MCP Server Overview

The MCP server follows a clear pattern: **Resources for read-only access, Tools for writes and complex queries**.

### Tools (12 total)

**Journal Write Operations (3):**
| Tool | Description |
|------|-------------|
| `journal_create_entry` | Create journal entry for a git commit |
| `journal_create_project_summary` | Create Entry 0 (initial) |
| `journal_submit_summary_report` | Update Entry 0 with new observations |

**Journal Query Operations (4):**
| Tool | Description |
|------|-------------|
| `journal_list_by_repository` | List entries with pagination |
| `journal_list_by_branch` | List entries by branch with pagination |
| `journal_list_project_summaries` | List all Entry 0 summaries |
| `journal_list_media_library` | Query unified media assets |

**Repository Query Operations (5):**
| Tool | Description |
|------|-------------|
| `repository_search_documents` | Search documents with filters |
| `repository_list_skills` | List CV skills by category |
| `repository_list_experience` | List work experience |
| `repository_list_education` | List education history |
| `repository_list_portfolio_projects` | List portfolio projects |

### Resources (18 total)

**Journal Resources (7):**
| URI | Description |
|-----|-------------|
| `journal://repositories` | List all repositories |
| `journal://summary/{repository}` | Get Entry 0 for a repo |
| `journal://entry/{commit_hash}` | Get journal entry |
| `journal://branches/{repository}` | List branches |
| `journal://attachments/{commit_hash}` | List entry attachments |
| `journal://attachment/{id}` | Get attachment metadata |

**Repository Resources (3):**
| URI | Description |
|-----|-------------|
| `repository://document/{slug_or_id}` | Get document content |
| `repository://documents/{type}` | List documents by type |
| `repository://portfolio-project/{id}` | Get portfolio project |

**Linear Cache Resources (5):**
| URI | Description |
|-----|-------------|
| `linear://cache/stats` | Cache statistics |
| `linear://projects` | List cached projects |
| `linear://project/{id}` | Get project details |
| `linear://issues` | List cached issues |
| `linear://issue/{identifier}` | Get issue details |

**CV Resources (3):**
| URI | Description |
|-----|-------------|
| `repository://cv/skills` | Technical skills |
| `repository://cv/experience` | Work history |
| `repository://cv/education` | Education history |

### Prompts (3)

- `create-entry` - Generate journal entry prompt
- `update-summary` - Update Entry 0 prompt
- `review-project` - Review project state

## Key Concepts

### Entry 0 (Living Project Summary)

A persistent, evolving knowledge base for each project containing:
- `summary`, `purpose`, `architecture`, `key_decisions`
- `file_structure`, `tech_stack`, `frontend`, `backend`
- `database_info`, `services`, `custom_tooling`
- `data_flow`, `patterns`, `commands`, `extended_notes`

### Database Hierarchy

```
Repository (e.g., "my-project")
  └── Branch (e.g., "main")
      └── Entry (commit_hash: "abc1234")
          ├── why, what_changed, decisions
          ├── technologies, kronus_wisdom
          └── files_changed: [...]
```

### Document Types

Documents have two-level categorization:
- **Primary Type**: `writing`, `prompt`, `note`
- **Tags**: Additional labels in `metadata.tags`

## Configuration

### Environment Variables

```bash
# AI Provider (at least one required)
GOOGLE_GENERATIVE_AI_API_KEY=your-key  # Gemini 3 Pro (1M context)
ANTHROPIC_API_KEY=your-key              # Claude Sonnet 4.5 (200K context)

# Database
JOURNAL_DB_PATH=/path/to/journal.db     # Optional, defaults to ./data/journal.db

# Web App URL (for MCP → Tartarus API calls)
TARTARUS_URL=http://localhost:3000

# Optional
LINEAR_API_KEY=lin_api_...
MCP_API_KEY=your-mcp-key                # For authenticated MCP requests

# Agent Configuration (Optional)
AGENT_NAME=Kronus                        # Name of your AI agent (default: "Kronus")
AGENT_SOUL_PATH=Soul.xml                # Path to agent prompt file (default: "Soul.xml")
```

### MCP Client Setup

**Claude Desktop / Cursor / VS Code:**
```json
{
  "mcpServers": {
    "developer-journal": {
      "command": "node",
      "args": ["/path/to/Developer Journal Workspace/dist/index.js"]
    }
  }
}
```

Platform-specific config locations:
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`
- **Cursor**: `~/.cursor/mcp.json`

## Agent Configuration

The system supports customizing the AI agent name and prompt file for personalized instances.

### Environment Variables

- `AGENT_NAME`: Name of your AI agent (default: "Kronus")
- `AGENT_SOUL_PATH`: Path to agent prompt file (default: "Soul.xml")

### Creating a Custom Agent

1. **Create a custom prompt file** (e.g., `Soul_Custom.xml`) with your personalized agent personality
2. **Set environment variables** in your `.env` file:
   ```bash
   AGENT_NAME=CustomName
   AGENT_SOUL_PATH=Soul_Custom.xml
   ```
3. **Restart the application** - the UI and all references will use your custom agent name

### Example: Multiple Instances

For separate deployments (e.g., personal vs. team instance):

1. **Fork/clone the repository** for each instance
2. **Create custom prompt files** for each (e.g., `Soul_Personal.xml`, `Soul_Team.xml`)
3. **Configure each instance** with different `AGENT_NAME` and `AGENT_SOUL_PATH` values
4. **Deploy independently** - each instance will have its own agent identity while sharing the same codebase

The agent name appears throughout the UI (chat interface, context selector, API responses) and all functionality remains the same - only the personality and branding change.

## Development

```bash
# MCP server
npm run build      # Build
npm run dev        # Watch mode

# Web app
cd web
npm run dev        # Dev server on :3000
npm run build      # Production build

# Docker
docker compose up -d --build
docker compose logs -f tartarus
```

## License

MIT
