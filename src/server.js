const Hapi = require('@hapi/hapi');
const readline = require('readline');
const { createHanaClient } = require('./hana-client');
const { registerTools } = require('./tools');
const { logger } = require('./utils/logger');
const { processMcpRequest } = require('./mcp-adapter');

let server;
let hanaClient;
let rl;
let isShuttingDown = false;

/**
 * Start the MCP server
 * @param {Object} config - Server configuration
 */
async function start(config) {
  try {
    // Create HANA client connection
    hanaClient = await createHanaClient(config.hana);
    
    // Register all tools
    const tools = registerTools(hanaClient);
    
    // Create Hapi server for HTTP transport
    if (config.transport === 'http') {
      server = Hapi.server({
        port: config.port || 3000,
        host: config.host || 'localhost',
      });
      
      // Register routes for MCP protocol
      await registerRoutes(server, tools);
      
      // Start the HTTP server
      await server.start();
      logger.info(`HTTP server running on ${server.info.uri}`);
    } 
    // Handle STDIO transport (default)
    else if (config.transport === 'stdio') {
      // Create readline interface
      rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        terminal: false
      });
      
      // Handle incoming lines from stdin
      rl.on('line', async (line) => {
        if (isShuttingDown) return;
        
        try {
          const request = JSON.parse(line);
          const response = await processMcpRequest(request, tools);
          
          if (response) {
            console.log(JSON.stringify(response));
          }
        } catch (error) {
          logger.error(`Parse error: ${error.message}`);
          const errorResponse = {
            jsonrpc: '2.0',
            id: null,
            error: {
              code: -32700,
              message: 'Parse error'
            }
          };
          console.log(JSON.stringify(errorResponse));
        }
      });
      
      // Handle readline close event
      rl.on('close', () => {
        if (!isShuttingDown) {
          logger.info('Readline closed, but keeping process alive');
        } else {
          logger.info('Server shutting down');
          process.exit(0);
        }
      });
      
      // Keep the process alive
      process.stdin.resume();
      setInterval(() => { /* Keep event loop alive */ }, 1000);
      
      logger.info('STDIO transport enabled');
    } else {
      throw new Error(`Unsupported transport: ${config.transport}`);
    }
    
    // Handle process termination signals
    process.on('SIGINT', () => {
      logger.info('Received SIGINT');
      isShuttingDown = true;
      if (rl) rl.close();
    });

    process.on('SIGTERM', () => {
      logger.info('Received SIGTERM');
      isShuttingDown = true;
      if (rl) rl.close();
    });

    // Handle uncaught exceptions and unhandled promise rejections
    process.on('uncaughtException', (error) => {
      logger.error(`Uncaught exception: ${error.message}`);
      logger.error(error.stack);
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error(`Unhandled rejection at: ${promise}, reason: ${reason}`);
    });
    
    logger.info('HANA MCP Server started successfully');
    return true;
  } catch (error) {
    logger.error('Failed to start server:', error);
    throw error;
  }
}

/**
 * Stop the MCP server
 */
async function stop() {
  try {
    isShuttingDown = true;
    
    // Close readline interface
    if (rl) {
      rl.close();
    }
    
    // Close HANA client connection
    if (hanaClient) {
      await hanaClient.disconnect();
      logger.info('HANA client disconnected');
    }
    
    // Stop HTTP server if running
    if (server) {
      await server.stop();
      logger.info('HTTP server stopped');
    }
    
    return true;
  } catch (error) {
    logger.error('Error stopping server:', error);
    throw error;
  }
}

/**
 * Register HTTP routes for MCP protocol
 * @param {Hapi.Server} server - Hapi server instance
 * @param {Object} tools - Map of tool handlers
 */
async function registerRoutes(server, tools) {
  // Health check endpoint
  server.route({
    method: 'GET',
    path: '/health',
    handler: async (request, h) => {
      return { status: 'ok' };
    }
  });
  
  // MCP protocol endpoint
  server.route({
    method: 'POST',
    path: '/mcp',
    handler: async (request, h) => {
      try {
        const response = await processMcpRequest(request.payload, tools);
        return response;
      } catch (error) {
        logger.error('Error processing MCP request:', error);
        return h.response({
          jsonrpc: '2.0',
          id: request.payload?.id || null,
          error: {
            code: -32603,
            message: 'Internal error'
          }
        }).code(500);
      }
    }
  });
}

module.exports = {
  start,
  stop
};
