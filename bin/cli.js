#!/usr/bin/env node

const { program } = require('commander');
const server = require('../src/server');
const { loadConfig } = require('../src/utils/config');
const { logger } = require('../src/utils/logger');
const fs = require('fs');
const path = require('path');

// Get package version
const packageJson = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8')
);

// Configure CLI
program
  .name('hana-mcp-server')
  .description('Model Context Protocol server for SAP HANA databases')
  .version(packageJson.version);

// Start command
program
  .command('start')
  .description('Start the MCP server')
  .option('-t, --transport <type>', 'Transport type (http or stdio)', 'http')
  .option('-h, --host <host>', 'Host to bind to (for HTTP transport)', 'localhost')
  .option('-p, --port <port>', 'Port to listen on (for HTTP transport)', '3000')
  .option('--hana-host <host>', 'SAP HANA host')
  .option('--hana-port <port>', 'SAP HANA port', '30015')
  .option('--hana-user <user>', 'SAP HANA username')
  .option('--hana-password <password>', 'SAP HANA password')
  .option('--read-only', 'Enable read-only mode (default: true)', true)
  .option('--allowed-schemas <schemas>', 'Comma-separated list of allowed schemas')
  .option('--log-level <level>', 'Log level (error, warn, info, debug)', 'info')
  .option('-c, --config <path>', 'Path to configuration file')
  .action(async (options) => {
    try {
      // Process environment variables
      process.env.MCP_TRANSPORT = options.transport || process.env.MCP_TRANSPORT;
      process.env.MCP_HOST = options.host || process.env.MCP_HOST;
      process.env.MCP_PORT = options.port || process.env.MCP_PORT;
      process.env.HANA_HOST = options.hanaHost || process.env.HANA_HOST;
      process.env.HANA_PORT = options.hanaPort || process.env.HANA_PORT;
      process.env.HANA_USER = options.hanaUser || process.env.HANA_USER;
      process.env.HANA_PASSWORD = options.hanaPassword || process.env.HANA_PASSWORD;
      process.env.MCP_READ_ONLY = options.readOnly !== undefined ? String(options.readOnly) : process.env.MCP_READ_ONLY;
      process.env.MCP_ALLOWED_SCHEMAS = options.allowedSchemas || process.env.MCP_ALLOWED_SCHEMAS;
      process.env.LOG_LEVEL = options.logLevel || process.env.LOG_LEVEL;
      
      // Load configuration
      const config = loadConfig();
      
      // Set log level
      logger.level = config.logging.level;
      
      // Start the server
      await server.start(config);
      
      // Handle graceful shutdown
      process.on('SIGINT', async () => {
        logger.info('Shutting down HANA MCP Server...');
        await server.stop();
        process.exit(0);
      });
      
      process.on('SIGTERM', async () => {
        logger.info('Shutting down HANA MCP Server...');
        await server.stop();
        process.exit(0);
      });
    } catch (error) {
      logger.error('Failed to start server:', error);
      process.exit(1);
    }
  });

// Test connection command
program
  .command('test-connection')
  .description('Test connection to SAP HANA database')
  .option('--hana-host <host>', 'SAP HANA host')
  .option('--hana-port <port>', 'SAP HANA port', '30015')
  .option('--hana-user <user>', 'SAP HANA username')
  .option('--hana-password <password>', 'SAP HANA password')
  .option('-c, --config <path>', 'Path to configuration file')
  .action(async (options) => {
    try {
      // Process environment variables
      process.env.HANA_HOST = options.hanaHost || process.env.HANA_HOST;
      process.env.HANA_PORT = options.hanaPort || process.env.HANA_PORT;
      process.env.HANA_USER = options.hanaUser || process.env.HANA_USER;
      process.env.HANA_PASSWORD = options.hanaPassword || process.env.HANA_PASSWORD;
      
      // Load configuration
      const config = loadConfig();
      
      // Create HANA client
      const { createHanaClient } = require('../src/hana-client');
      const hanaClient = await createHanaClient(config.hana);
      
      // Test connection
      const result = await hanaClient.queryScalar('SELECT 1 FROM DUMMY');
      
      console.error('Connection successful!');
      console.error(`Connected to HANA at ${config.hana.host}:${config.hana.port}`);
      
      // Disconnect
      await hanaClient.disconnect();
      
      process.exit(0);
    } catch (error) {
      console.error('Connection failed:', error.message);
      process.exit(1);
    }
  });

// Parse command line arguments
program.parse();

// If no command is provided, show help
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
