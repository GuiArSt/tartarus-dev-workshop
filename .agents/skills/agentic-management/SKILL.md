---
name: agentic-management
description: Manage Tartarus MCP server config across Codex, Codex, and Gemini. Status check, rebuild, update paths, troubleshoot -32000.
---

# Agentic Management

Tartarus MCP server runs as stdio across three AI CLI agents.

## Config Locations

| Agent | File | Key |
|---|---|---|
| Codex | `~/.Codex.json` | `mcpServers.tartarus` |
| Codex | `~/.codex/config.toml` | `[mcp_servers.tartarus]` |
| Gemini | `~/.gemini/settings.json` | `mcpServers.tartarus` |

Binary: `/Users/guillermo.as/Documents/Software/Laboratory/tartarus/dist/index.js`

## Status Check

1. Read all three configs, verify path exists
2. Smoke test handshake:
```bash
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"0.1"}}}' | node /Users/guillermo.as/Documents/Software/Laboratory/tartarus/dist/index.js 2>/tmp/tartarus-mcp-test.log &
PID=$!; sleep 3; kill $PID 2>/dev/null; cat /tmp/tartarus-mcp-test.log
```

## Rebuild

```bash
cd /Users/guillermo.as/Documents/Software/Laboratory/tartarus && npm run build
```

## Troubleshoot -32000

Server died before handshake. Check: wrong path, missing node_modules, `npm rebuild better-sqlite3`, startup throw (run smoke test above and read stderr).

## Environment

Server loads `.env` from its project root automatically. No keys needed in MCP config env blocks.
