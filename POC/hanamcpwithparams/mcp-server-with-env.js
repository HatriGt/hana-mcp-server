#!/usr/bin/env node

const readline = require('readline');

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

// Log to stderr
const log = (msg) => console.error(`[HANA MCP with ENV] ${new Date().toISOString()}: ${msg}`);

log('Starting HANA MCP Server with Environment Variables...');

// Read environment variables
const hanaConfig = {
  host: process.env.HANA_HOST,
  port: process.env.HANA_PORT,
  user: process.env.HANA_USER,
  password: process.env.HANA_PASSWORD,
  schema: process.env.HANA_SCHEMA,
  ssl: process.env.HANA_SSL
};

// Log the configuration (without password)
log(`HANA Config - Host: ${hanaConfig.host}, Port: ${hanaConfig.port}, User: ${hanaConfig.user}, Schema: ${hanaConfig.schema}, SSL: ${hanaConfig.ssl}`);
log(`Password provided: ${hanaConfig.password ? 'YES' : 'NO'}`);

// Available tools
const tools = [
  {
    name: "hana_show_config",
    description: "Show the HANA configuration received from environment variables",
    inputSchema: {
      type: "object",
      properties: {},
      required: []
    }
  },
  {
    name: "hana_test_connection",
    description: "Test if we can connect to HANA with the provided configuration",
    inputSchema: {
      type: "object",
      properties: {},
      required: []
    }
  },
  {
    name: "hana_list_schemas",
    description: "List all schemas in the HANA database (mock data for now)",
    inputSchema: {
      type: "object",
      properties: {},
      required: []
    }
  },
  {
    name: "hana_show_env_vars",
    description: "Show all environment variables (for debugging)",
    inputSchema: {
      type: "object",
      properties: {},
      required: []
    }
  }
];

// Tool implementations
const toolImplementations = {
  hana_show_config: async () => {
    const configInfo = {
      host: hanaConfig.host || 'NOT SET',
      port: hanaConfig.port || 'NOT SET',
      user: hanaConfig.user || 'NOT SET',
      password: hanaConfig.password ? 'SET (hidden)' : 'NOT SET',
      schema: hanaConfig.schema || 'NOT SET',
      ssl: hanaConfig.ssl || 'NOT SET'
    };
    
    return {
      content: [
        {
          type: "text",
          text: `HANA Configuration from Environment Variables:\n\n` +
                `Host: ${configInfo.host}\n` +
                `Port: ${configInfo.port}\n` +
                `User: ${configInfo.user}\n` +
                `Password: ${configInfo.password}\n` +
                `Schema: ${configInfo.schema}\n` +
                `SSL: ${configInfo.ssl}\n\n` +
                `Environment variables are ${hanaConfig.host && hanaConfig.user && hanaConfig.password ? 'PROPERLY CONFIGURED' : 'MISSING REQUIRED VALUES'}`
        }
      ]
    };
  },
  
  hana_test_connection: async () => {
    // Check if we have the minimum required configuration
    if (!hanaConfig.host || !hanaConfig.user || !hanaConfig.password) {
      return {
        content: [
          {
            type: "text",
            text: `❌ Connection test failed!\n\n` +
                  `Missing required configuration:\n` +
                  `- HANA_HOST: ${hanaConfig.host ? '✓' : '✗'}\n` +
                  `- HANA_USER: ${hanaConfig.user ? '✓' : '✗'}\n` +
                  `- HANA_PASSWORD: ${hanaConfig.password ? '✓' : '✗'}\n\n` +
                  `Please configure these environment variables in your Claude Desktop configuration.`
          }
        ]
      };
    }
    
    // Simulate connection test
    return {
      content: [
        {
          type: "text",
          text: `✅ Connection test successful!\n\n` +
                `Configuration looks good:\n` +
                `- Host: ${hanaConfig.host}\n` +
                `- Port: ${hanaConfig.port || '443 (default)'}\n` +
                `- User: ${hanaConfig.user}\n` +
                `- Schema: ${hanaConfig.schema || 'default'}\n` +
                `- SSL: ${hanaConfig.ssl || 'true (default)'}\n\n` +
                `Note: This is a simulation. In the real implementation, this would actually connect to HANA.`
        }
      ]
    };
  },
  
  hana_list_schemas: async () => {
    if (!hanaConfig.host || !hanaConfig.user || !hanaConfig.password) {
      return {
        content: [
          {
            type: "text",
            text: `❌ Cannot list schemas - HANA configuration is incomplete.\n\n` +
                  `Please configure HANA_HOST, HANA_USER, and HANA_PASSWORD environment variables first.`
          }
        ]
      };
    }
    
    return {
      content: [
        {
          type: "text",
          text: `📋 Available schemas (mock data):\n\n` +
                `- SYSTEM\n` +
                `- SYS\n` +
                `- ${hanaConfig.schema || 'DEFAULT_SCHEMA'}\n` +
                `- CUSTOMER_DATA\n` +
                `- ANALYTICS\n\n` +
                `Note: This is mock data. In the real implementation, this would query: SELECT SCHEMA_NAME FROM SYS.SCHEMAS`
        }
      ]
    };
  },
  
  hana_show_env_vars: async () => {
    const envVars = Object.keys(process.env)
      .filter(key => key.startsWith('HANA_'))
      .map(key => `${key}=${key.includes('PASSWORD') ? '***HIDDEN***' : process.env[key]}`)
      .join('\n');
    
    return {
      content: [
        {
          type: "text",
          text: `🔍 HANA Environment Variables:\n\n${envVars || 'No HANA_* environment variables found'}\n\n` +
                `Total environment variables: ${Object.keys(process.env).length}`
        }
      ]
    };
  }
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
              name: 'HANA MCP Server with Environment Variables',
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
        
      case 'prompts/list':
        log('Listing prompts');
        return {
          jsonrpc: '2.0',
          id,
          result: {
            prompts: [
              {
                name: "hana_config_check",
                description: "Check HANA database configuration",
                template: "Please check my HANA database configuration and test the connection."
              },
              {
                name: "hana_schema_explorer",
                description: "Explore HANA database schemas",
                template: "I want to explore the schemas in my HANA database."
              }
            ]
          }
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

// Handle incoming lines from stdin
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

// Handle process termination signals
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

// Handle readline close event
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
setInterval(() => { /* Keep event loop alive */ }, 1000);

// Handle uncaught exceptions and unhandled promise rejections
process.on('uncaughtException', (error) => {
  log(`Uncaught exception: ${error.message}`);
  log(error.stack);
});

process.on('unhandledRejection', (reason, promise) => {
  log(`Unhandled rejection at: ${promise}, reason: ${reason}`);
}); 