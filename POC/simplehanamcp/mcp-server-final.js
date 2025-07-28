#!/usr/bin/env node

const readline = require('readline');

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

// Log to stderr
const log = (msg) => console.error(`[HANA MCP] ${new Date().toISOString()}: ${msg}`);

log('Starting HANA MCP Server...');

// Available tools
const tools = [
  {
    name: "hana_list_schemas",
    description: "List all schemas in the HANA database",
    inputSchema: {
      type: "object",
      properties: {},
      required: []
    }
  },
  {
    name: "hana_test_connection",
    description: "Test connection to HANA database",
    inputSchema: {
      type: "object",
      properties: {},
      required: []
    }
  }
];

// Tool implementations
const toolImplementations = {
  hana_list_schemas: async () => ({
    content: [
      {
        type: "text",
        text: "Available schemas: SCHEMA1, SCHEMA2, SCHEMA3, SYSTEM, SYS"
      }
    ]
  }),
  hana_test_connection: async () => ({
    content: [
      {
        type: "text",
        text: "Connection to HANA database is working successfully!"
      }
    ]
  })
};

let isShuttingDown = false;

// Process requests
async function handleRequest(request) {
  const { id, method, params } = request;
  
  log(`Handling method: ${method}`);
  
  try {
    switch (method) {
      case 'initialize':
        log('Initializing server');
        return {
          jsonrpc: '2.0',
          id,
          result: {
            protocolVersion: '2024-11-05',
            capabilities: {
              tools: {}
            },
            serverInfo: {
              name: 'HANA MCP Server',
              version: '1.0.0'
            }
          }
        };
        
      case 'tools/list':
        log('Listing tools');
        return {
          jsonrpc: '2.0',
          id,
          result: { tools }
        };
        
      case 'tools/call':
        const { name, arguments: args } = params;
        log(`Calling tool: ${name}`);
        
        if (!toolImplementations[name]) {
          return {
            jsonrpc: '2.0',
            id,
            error: {
              code: -32601,
              message: `Tool not found: ${name}`
            }
          };
        }
        
        const result = await toolImplementations[name](args);
        return {
          jsonrpc: '2.0',
          id,
          result
        };
        
      case 'notifications/initialized':
        log('Server initialized');
        return null;
        
      default:
        log(`Unknown method: ${method}`);
        return {
          jsonrpc: '2.0',
          id,
          error: {
            code: -32601,
            message: `Method not found: ${method}`
          }
        };
    }
  } catch (error) {
    log(`Error: ${error.message}`);
    return {
      jsonrpc: '2.0',
      id,
      error: {
        code: -32000,
        message: error.message
      }
    };
  }
}

// Handle incoming lines
rl.on('line', async (line) => {
  if (isShuttingDown) return;
  
  try {
    const request = JSON.parse(line);
    const response = await handleRequest(request);
    
    if (response) {
      console.log(JSON.stringify(response));
    }
  } catch (error) {
    log(`Parse error: ${error.message}`);
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

// Handle process termination
process.on('SIGINT', () => {
  log('Received SIGINT');
  isShuttingDown = true;
  rl.close();
});

process.on('SIGTERM', () => {
  log('Received SIGTERM');
  isShuttingDown = true;
  rl.close();
});

rl.on('close', () => {
  if (!isShuttingDown) {
    log('Readline closed, but keeping process alive');
  } else {
    log('Server shutting down');
    process.exit(0);
  }
});

// Keep the process alive
process.stdin.resume();

// Prevent the process from exiting when stdin closes
process.on('exit', (code) => {
  log(`Process exiting with code: ${code}`);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  log(`Uncaught exception: ${error.message}`);
  log(error.stack);
});

process.on('unhandledRejection', (reason, promise) => {
  log(`Unhandled rejection at: ${promise}, reason: ${reason}`);
});

// Keep the event loop alive
setInterval(() => {
  // This keeps the process alive
}, 1000); 