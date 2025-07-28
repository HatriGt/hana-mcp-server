#!/usr/bin/env node

/**
 * HANA MCP Server - Main Entry Point
 * 
 * This is a thin wrapper that starts the modular MCP server.
 * The actual implementation is in src/server/index.js
 */

// Start the modular server
require('./src/server/index.js'); 