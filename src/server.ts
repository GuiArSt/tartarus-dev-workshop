import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig } from "./config/env.js";
import { logger } from "./shared/logger.js";
import type { UnifiedConfig } from "./shared/types.js";

// Module imports
import { initDatabase } from "./modules/journal/db/database.js";
import { registerJournalTools } from "./modules/journal/tools.js";
import { registerKronusTools } from "./modules/kronus/index.js";
import { registerAppsModule } from "./modules/apps/index.js";

/**
 * Developer Journal MCP Server
 *
 * A lightweight MCP server focused on journal entries:
 * - Create entries with AI-generated summaries (Kronus)
 * - Read entries, repositories, branches, project summaries
 * - View attachments
 *
 * Write/edit operations for entries, project summaries, and attachments
 * are handled by the web app (Tartarus).
 */
export class UnifiedMCPServer {
  private server: McpServer;
  private config: UnifiedConfig;

  constructor() {
    this.server = new McpServer(
      {
        name: "developer-journal-mcp",
        version: "2.0.0",
      },
      {
        capabilities: {
          resources: {},
          prompts: {},
        },
      },
    );

    this.config = loadConfig();
  }

  async initialize() {
    logger.info("Initializing Developer Journal MCP Server...");

    // Initialize Journal module if configured
    if (this.config.journal) {
      initDatabase(this.config.journal.dbPath);
      await registerJournalTools(this.server, this.config.journal);

      // Register Kronus agent tools (requires journal config for AI)
      registerKronusTools(this.server, this.config.journal);

      // Register MCP Apps module (interactive UIs)
      if (this.config.journal.tartarusUrl) {
        registerAppsModule(this.server, {
          tartarusUrl: this.config.journal.tartarusUrl,
        });
      }
    } else {
      logger.warn(
        "No journal configuration found. Set JOURNAL_DB_PATH or ANTHROPIC_API_KEY.",
      );
    }

    logger.success("Developer Journal MCP Server initialized");
  }

  async connect() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    logger.success("Developer Journal MCP Server connected via stdio");
  }
}
