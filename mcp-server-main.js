#!/usr/bin/env node

const readline = require('readline');
const { createHanaClient } = require('./src/hana-client');
const { registerTools } = require('./src/tools');

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

// Log to stderr
const log = (msg) => console.error(`[HANA MCP Main] ${new Date().toISOString()}: ${msg}`);

log('Starting HANA MCP Server (Main Implementation)...');

let hanaClient;
let tools;
let isShuttingDown = false;

// Initialize the server
async function initializeServer() {
  try {
    // Read environment variables for configuration
    const config = {
      hana: {
        host: process.env.HANA_HOST,
        port: parseInt(process.env.HANA_PORT) || 443,
        user: process.env.HANA_USER,
        password: process.env.HANA_PASSWORD,
        schema: process.env.HANA_SCHEMA,
        ssl: process.env.HANA_SSL !== 'false',
        encrypt: process.env.HANA_ENCRYPT !== 'false',
        validateCert: process.env.HANA_VALIDATE_CERT !== 'false'
      }
    };

    // Validate required configuration
    if (!config.hana.host || !config.hana.user || !config.hana.password) {
      log('Missing required HANA configuration. Using mock tools for testing.');
      // Use mock tools if no HANA configuration
      tools = {
        hana_show_config: {
          description: "Show the HANA database configuration",
          inputSchema: { type: "object", properties: {}, required: [] },
          readOnly: true,
          async handler() {
            const configInfo = {
              host: config.hana.host || 'NOT SET',
              port: config.hana.port || 'NOT SET',
              user: config.hana.user || 'NOT SET',
              password: config.hana.password ? 'SET (hidden)' : 'NOT SET',
              schema: config.hana.schema || 'NOT SET',
              ssl: config.hana.ssl || 'NOT SET'
            };
            
            return {
              content: [
                {
                  type: "text",
                  text: `HANA Configuration:\n\n` +
                        `Host: ${configInfo.host}\n` +
                        `Port: ${configInfo.port}\n` +
                        `User: ${configInfo.user}\n` +
                        `Password: ${configInfo.password}\n` +
                        `Schema: ${configInfo.schema}\n` +
                        `SSL: ${configInfo.ssl}\n\n` +
                        `Status: ${config.hana.host && config.hana.user && config.hana.password ? 'PROPERLY CONFIGURED' : 'MISSING REQUIRED VALUES'}`
                }
              ]
            };
          }
        },
        hana_test_connection: {
          description: "Test connection to HANA database",
          inputSchema: { type: "object", properties: {}, required: [] },
          readOnly: true,
          async handler() {
            if (!config.hana.host || !config.hana.user || !config.hana.password) {
              return {
                content: [
                  {
                    type: "text",
                    text: `❌ Connection test failed!\n\n` +
                          `Missing required configuration:\n` +
                          `- HANA_HOST: ${config.hana.host ? '✓' : '✗'}\n` +
                          `- HANA_USER: ${config.hana.user ? '✓' : '✗'}\n` +
                          `- HANA_PASSWORD: ${config.hana.password ? '✓' : '✗'}\n\n` +
                          `Please configure these environment variables in your Claude Desktop configuration.`
                  }
                ]
              };
            }
            
            return {
              content: [
                {
                  type: "text",
                  text: `✅ Connection test successful!\n\n` +
                        `Configuration looks good:\n` +
                        `- Host: ${config.hana.host}\n` +
                        `- Port: ${config.hana.port}\n` +
                        `- User: ${config.hana.user}\n` +
                        `- Schema: ${config.hana.schema || 'default'}\n` +
                        `- SSL: ${config.hana.ssl ? 'enabled' : 'disabled'}\n\n` +
                        `Note: This is a simulation. In the real implementation, this would actually connect to HANA.`
                }
              ]
            };
          }
        },
        hana_list_schemas: {
          description: "List all schemas in the HANA database",
          inputSchema: { type: "object", properties: {}, required: [] },
          readOnly: true,
          async handler() {
            return {
              content: [
                {
                  type: "text",
                  text: `📋 Available schemas (mock data):\n\n` +
                        `- SYSTEM\n` +
                        `- SYS\n` +
                        `- ${config.hana.schema || 'DEFAULT_SCHEMA'}\n` +
                        `- CUSTOMER_DATA\n` +
                        `- ANALYTICS\n\n` +
                        `Note: This is mock data. In the real implementation, this would query: SELECT SCHEMA_NAME FROM SYS.SCHEMAS`
                }
              ]
            };
          }
        }
      };
    } else {
      // Create real HANA client connection
      log('Creating HANA client connection...');
      try {
        hanaClient = await createHanaClient(config.hana);
        
        // Register all tools
        tools = registerTools(hanaClient);
        log('HANA client connected and tools registered successfully');
      } catch (error) {
        log(`Failed to connect to HANA: ${error.message}. Using mock tools as fallback.`);
        // Fall back to mock tools if HANA connection fails
        tools = {
          hana_show_config: {
            description: "Show the HANA database configuration",
            inputSchema: { type: "object", properties: {}, required: [] },
            readOnly: true,
            async handler() {
              const configInfo = {
                host: config.hana.host || 'NOT SET',
                port: config.hana.port || 'NOT SET',
                user: config.hana.user || 'NOT SET',
                password: config.hana.password ? 'SET (hidden)' : 'NOT SET',
                schema: config.hana.schema || 'NOT SET',
                ssl: config.hana.ssl || 'NOT SET'
              };
              
              return {
                content: [
                  {
                    type: "text",
                    text: `HANA Configuration:\n\n` +
                          `Host: ${configInfo.host}\n` +
                          `Port: ${configInfo.port}\n` +
                          `User: ${configInfo.user}\n` +
                          `Password: ${configInfo.password}\n` +
                          `Schema: ${configInfo.schema}\n` +
                          `SSL: ${configInfo.ssl}\n\n` +
                          `Status: ${config.hana.host && config.hana.user && config.hana.password ? 'PROPERLY CONFIGURED' : 'MISSING REQUIRED VALUES'}\n\n` +
                          `Connection Error: ${error.message}\n\n` +
                          `Note: Using mock tools due to connection failure.`
                  }
                ]
              };
            }
          },
          hana_test_connection: {
            description: "Test connection to HANA database",
            inputSchema: { type: "object", properties: {}, required: [] },
            readOnly: true,
            async handler() {
              return {
                content: [
                  {
                    type: "text",
                    text: `❌ Connection test failed!\n\n` +
                          `Error: ${error.message}\n\n` +
                          `Configuration:\n` +
                          `- Host: ${config.hana.host}\n` +
                          `- Port: ${config.hana.port}\n` +
                          `- User: ${config.hana.user}\n` +
                          `- Schema: ${config.hana.schema || 'default'}\n` +
                          `- SSL: ${config.hana.ssl ? 'enabled' : 'disabled'}\n\n` +
                          `Please check your HANA database configuration and ensure the database is accessible.`
                  }
                ]
              };
            }
          },
          hana_list_schemas: {
            description: "List all schemas in the HANA database",
            inputSchema: { type: "object", properties: {}, required: [] },
            readOnly: true,
            async handler() {
              return {
                content: [
                  {
                    type: "text",
                    text: `📋 Available schemas (mock data):\n\n` +
                          `- SYSTEM\n` +
                          `- SYS\n` +
                          `- ${config.hana.schema || 'DEFAULT_SCHEMA'}\n` +
                          `- CUSTOMER_DATA\n` +
                          `- ANALYTICS\n\n` +
                          `Note: This is mock data due to connection error: ${error.message}`
                  }
                ]
              };
            }
          }
        };
      }
    }

    log('Server initialized successfully');
  } catch (error) {
    log(`Error initializing server: ${error.message}`);
    // Fall back to mock tools
    tools = {
      hana_error: {
        description: "Error occurred during initialization",
        inputSchema: { type: "object", properties: {}, required: [] },
        readOnly: true,
        async handler() {
          return {
            content: [
              {
                type: "text",
                text: `❌ Server initialization error: ${error.message}\n\nPlease check your HANA configuration.`
              }
            ]
          };
        }
      }
    };
  }
}

// Process requests
async function handleRequest(request) {
  const { id, method, params } = request;
  
  // Handle notifications (methods that don't have an id)
  if (id === undefined && method.startsWith('notifications/')) {
    // This is a notification, handle it differently
    switch (method) {
      case 'notifications/initialized':
        log('Server initialized (notification)');
        return null;
      default:
        log(`Unknown notification: ${method}`);
        return null;
    }
  }
  
  // Handle regular requests (methods that have an id)
  if (id === undefined) {
    log(`Request missing id: ${method}`);
    return {
      jsonrpc: '2.0',
      id: null,
      error: {
        code: -32600,
        message: 'Invalid Request: missing id'
      }
    };
  }
  
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
              name: 'HANA MCP Server (Main)',
              version: '1.0.0'
            }
          }
        };
        
      case 'tools/list':
        log('Listing tools');
        // Convert tools object to array format like the working POC
        const toolsArray = Object.entries(tools).map(([name, tool]) => ({
          name,
          description: tool.description || `Execute ${name} tool`,
          inputSchema: tool.inputSchema || {
            type: 'object',
            properties: {},
            required: []
          }
        }));
        
        return {
          jsonrpc: '2.0',
          id,
          result: { tools: toolsArray }
        };
        
      case 'tools/call':
        const { name, arguments: args } = params;
        log(`Calling tool: ${name}`);
        
        if (!tools[name]) {
          return {
            jsonrpc: '2.0',
            id,
            error: {
              code: -32601,
              message: `Tool not found: ${name}`
            }
          };
        }
        
        try {
          const result = await tools[name].handler(args || {});
          return {
            jsonrpc: '2.0',
            id,
            result
          };
        } catch (error) {
          log(`Error executing tool ${name}: ${error.message}`);
          return {
            jsonrpc: '2.0',
            id,
            error: {
              code: -32000,
              message: error.message
            }
          };
        }
        
      case 'prompts/list':
        log('Listing prompts');
        return {
          jsonrpc: '2.0',
          id,
          result: {
            prompts: [
              {
                name: "hana_query_builder",
                description: "Build a SQL query for HANA database",
                template: "I need to build a SQL query for HANA database that {{goal}}."
              },
              {
                name: "hana_schema_explorer",
                description: "Explore HANA database schemas and tables",
                template: "I want to explore the schemas and tables in my HANA database."
              },
              {
                name: "hana_connection_test",
                description: "Test HANA database connection",
                template: "Please test my HANA database connection and show the configuration."
              }
            ]
          }
        };
        

        
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
    // Only return error response if we have an id (for requests, not notifications)
    if (id !== undefined) {
      return {
        jsonrpc: '2.0',
        id,
        error: {
          code: -32000,
          message: error.message
        }
      };
    }
    return null;
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
rl.on('close', async () => {
  if (!isShuttingDown) {
    log('Readline closed, but keeping process alive');
  } else {
    log('Server shutting down');
    // Close HANA client if connected
    if (hanaClient) {
      try {
        await hanaClient.disconnect();
        log('HANA client disconnected');
      } catch (error) {
        log(`Error disconnecting HANA client: ${error.message}`);
      }
    }
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

// Initialize the server
initializeServer().catch(error => {
  log(`Failed to initialize server: ${error.message}`);
}); 