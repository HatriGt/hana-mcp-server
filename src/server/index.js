#!/usr/bin/env node

/**
 * Main HANA MCP Server Entry Point
 */

const readline = require('readline');
const { logger } = require('../utils/logger');
const { lifecycleManager } = require('./lifecycle-manager');
const MCPHandler = require('./mcp-handler');
const { ERROR_CODES } = require('../constants/mcp-constants');

class MCPServer {
  constructor() {
    this.rl = null;
    this.isShuttingDown = false;
  }

  /**
   * Start the MCP server
   */
  async start() {
    try {
      // Setup lifecycle management
      lifecycleManager.setupEventHandlers();
      await lifecycleManager.start();

      // Setup readline interface for STDIO
      this.setupReadline();

      logger.info('Server ready for requests');
    } catch (error) {
      logger.error('Failed to start server:', error.message);
      process.exit(1);
    }
  }

  /**
   * Setup readline interface for STDIO communication
   */
  setupReadline() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: false
    });

    // Handle incoming lines
    this.rl.on('line', async (line) => {
      if (this.isShuttingDown) return;
      
      await this.handleLine(line);
    });

    // Handle readline close
    this.rl.on('close', async () => {
      if (!this.isShuttingDown) {
        logger.info('Readline closed, but keeping process alive');
      } else {
        logger.info('Server shutting down');
        await lifecycleManager.shutdown();
      }
    });
  }

  /**
   * Handle incoming line from STDIO
   */
  async handleLine(line) {
    try {
      const request = JSON.parse(line);
      const response = await this.handleRequest(request);
      
      if (response) {
        console.log(JSON.stringify(response));
      }
    } catch (error) {
      logger.error(`Parse error: ${error.message}`);
      const errorResponse = {
        jsonrpc: '2.0',
        id: null,
        error: {
          code: ERROR_CODES.PARSE_ERROR,
          message: 'Parse error'
        }
      };
      console.log(JSON.stringify(errorResponse));
    }
  }

  /**
   * Handle MCP request
   */
  async handleRequest(request) {
    // Validate request
    const validation = MCPHandler.validateRequest(request);
    if (!validation.valid) {
      return {
        jsonrpc: '2.0',
        id: request.id || null,
        error: {
          code: ERROR_CODES.INVALID_REQUEST,
          message: validation.error
        }
      };
    }

    // Handle request
    return await MCPHandler.handleRequest(request);
  }

  /**
   * Shutdown the server
   */
  async shutdown() {
    this.isShuttingDown = true;
    
    if (this.rl) {
      this.rl.close();
    }
    
    await lifecycleManager.shutdown();
  }
}

// Create and start server
const server = new MCPServer();

// Handle process termination
process.on('SIGINT', async () => {
  logger.info('Received SIGINT');
  await server.shutdown();
});

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM');
  await server.shutdown();
});

// Start the server
server.start().catch(error => {
  logger.error('Failed to start server:', error.message);
  process.exit(1);
}); 