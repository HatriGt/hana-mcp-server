#!/usr/bin/env node

const server = require('./server');
const { loadConfig } = require('./utils/config');

async function main() {
  try {
    // Load configuration from environment variables or config file
    const config = loadConfig();
    
    // Start the MCP server
    await server.start(config);
    
    console.log(`HANA MCP Server started successfully`);
    
    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      console.log('Shutting down HANA MCP Server...');
      await server.stop();
      process.exit(0);
    });
    
    process.on('SIGTERM', async () => {
      console.log('Shutting down HANA MCP Server...');
      await server.stop();
      process.exit(0);
    });
  } catch (error) {
    console.error('Failed to start HANA MCP Server:', error);
    process.exit(1);
  }
}

// Start the server
main();
