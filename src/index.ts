#!/usr/bin/env node
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

// Load .env from the project root (where this script is located)
// We manually parse and inject to avoid dotenv v17's banner that interferes with MCP stdio
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.join(__dirname, '..', '.env');

try {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const [key, ...valueParts] = trimmed.split('=');
    if (key && valueParts.length > 0) {
      const value = valueParts.join('=').trim();
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  });
} catch (error) {
  // .env file not found, rely on environment variables
}

import { UnifiedMCPServer } from './server.js';
import { logger } from './shared/logger.js';

/**
 * Main entry point for the unified MCP server
 */
async function main() {
  try {
    const server = new UnifiedMCPServer();
    await server.initialize();
    await server.connect();

    // Graceful shutdown
    process.on('SIGINT', () => {
      logger.info('Received SIGINT, shutting down gracefully...');
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      logger.info('Received SIGTERM, shutting down gracefully...');
      process.exit(0);
    });
  } catch (error) {
    logger.error('Fatal error during server startup:', error);
    process.exit(1);
  }
}

main();
