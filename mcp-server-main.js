#!/usr/bin/env node

const readline = require('readline');

// Custom logger that doesn't interfere with JSON-RPC
const log = (msg) => console.error(`[HANA MCP Simple] ${new Date().toISOString()}: ${msg}`);

log('Starting HANA MCP Server (Simplified)...');

let hanaClient = null;
let isShuttingDown = false;

// Create readline interface for STDIO
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

// Keep process alive
process.stdin.resume();
setInterval(() => {}, 1000);

// Lazy HANA client initialization
async function getHanaClient() {
  if (hanaClient) {
    return hanaClient;
  }
  
  if (!process.env.HANA_HOST || !process.env.HANA_USER || !process.env.HANA_PASSWORD) {
    return null;
  }
  
  try {
    const { createHanaClient } = require('./src/hana-client');
    
    const config = {
      host: process.env.HANA_HOST,
      port: parseInt(process.env.HANA_PORT) || 443,
      user: process.env.HANA_USER,
      password: process.env.HANA_PASSWORD,
      schema: process.env.HANA_SCHEMA,
      ssl: process.env.HANA_SSL !== 'false',
      encrypt: process.env.HANA_ENCRYPT !== 'false',
      validateCert: process.env.HANA_VALIDATE_CERT !== 'false'
    };
    
    hanaClient = await createHanaClient(config);
    log('HANA client connected successfully');
    return hanaClient;
  } catch (error) {
    log(`Failed to connect to HANA: ${error.message}`);
    return null;
  }
}

// Tool implementations
const toolImplementations = {
  hana_show_config: async (args) => {
    const configInfo = {
      host: process.env.HANA_HOST || 'NOT SET',
      port: process.env.HANA_PORT || 'NOT SET',
      user: process.env.HANA_USER || 'NOT SET',
      password: process.env.HANA_PASSWORD ? 'SET (hidden)' : 'NOT SET',
      schema: process.env.HANA_SCHEMA || 'NOT SET',
      ssl: process.env.HANA_SSL !== 'false'
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
                `Status: ${configInfo.host !== 'NOT SET' && configInfo.user !== 'NOT SET' && process.env.HANA_PASSWORD ? 'PROPERLY CONFIGURED' : 'MISSING REQUIRED VALUES'}`
        }
      ]
    };
  },
  
  hana_test_connection: async (args) => {
    if (!process.env.HANA_HOST || !process.env.HANA_USER || !process.env.HANA_PASSWORD) {
      return {
        content: [
          {
            type: "text",
            text: `❌ Connection test failed!\n\n` +
                  `Missing required configuration:\n` +
                  `- HANA_HOST: ${process.env.HANA_HOST ? '✓' : '✗'}\n` +
                  `- HANA_USER: ${process.env.HANA_USER ? '✓' : '✗'}\n` +
                  `- HANA_PASSWORD: ${process.env.HANA_PASSWORD ? '✓' : '✗'}\n\n` +
                  `Please configure these environment variables in your Claude Desktop configuration.`
          }
        ]
      };
    }
    
    const client = await getHanaClient();
    if (!client) {
      return {
        content: [
          {
            type: "text",
            text: `❌ Connection test failed!\n\n` +
                  `HANA client is not connected. Please check your HANA configuration and ensure the database is accessible.\n\n` +
                  `Configuration:\n` +
                  `- Host: ${process.env.HANA_HOST}\n` +
                  `- Port: ${process.env.HANA_PORT || '443 (default)'}\n` +
                  `- User: ${process.env.HANA_USER}\n` +
                  `- Schema: ${process.env.HANA_SCHEMA || 'default'}\n` +
                  `- SSL: ${process.env.HANA_SSL !== 'false' ? 'enabled' : 'disabled'}`
          }
        ]
      };
    }
    
    try {
      // Test the connection by executing a simple query
      const testQuery = 'SELECT 1 as test_value FROM DUMMY';
      const result = await client.query(testQuery);
      
      if (result && result.length > 0) {
        return {
          content: [
            {
              type: "text",
              text: `✅ Connection test successful!\n\n` +
                    `Configuration looks good:\n` +
                    `- Host: ${process.env.HANA_HOST}\n` +
                    `- Port: ${process.env.HANA_PORT || '443 (default)'}\n` +
                    `- User: ${process.env.HANA_USER}\n` +
                    `- Schema: ${process.env.HANA_SCHEMA || 'default'}\n` +
                    `- SSL: ${process.env.HANA_SSL !== 'false' ? 'enabled' : 'disabled'}\n\n` +
                    `Test query result: ${result[0].TEST_VALUE}`
            }
          ]
        };
      } else {
        throw new Error('Connection test returned no results');
      }
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `❌ Connection test failed!\n\n` +
                  `Error: ${error.message}\n\n` +
                  `Please check your HANA database configuration and ensure the database is accessible.`
          }
        ]
      };
    }
  },
  
  hana_list_schemas: async (args) => {
    const client = await getHanaClient();
    if (!client) {
      return {
        content: [
          {
            type: "text",
            text: `❌ HANA client not connected. Please check your HANA configuration.`
          }
        ]
      };
    }
    
    try {
      // Real HANA query
      const query = `SELECT SCHEMA_NAME FROM SYS.SCHEMAS`;
      const results = await client.query(query);
      
      const schemas = results.map(row => row.SCHEMA_NAME);
      
      return {
        content: [
          {
            type: "text",
            text: `📋 Available schemas in HANA database:\n\n` +
                  `${schemas.map(schema => `- ${schema}`).join('\n')}\n\n` +
                  `Total schemas: ${schemas.length}`
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `❌ Error listing schemas: ${error.message}`
          }
        ]
      };
    }
  },
  
  hana_show_env_vars: async (args) => {
    try {
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
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `❌ Error showing environment variables: ${error.message}`
          }
        ]
      };
    }
  },
  
  hana_list_tables: async (args) => {
    const { schema_name } = args || {};
    
    if (!schema_name) {
      return {
        content: [
          {
            type: "text",
            text: `❌ Error: schema_name parameter is required\n\n` +
                  `Usage: Provide a schema name to list tables from.`
          }
        ]
      };
    }
    
    const client = await getHanaClient();
    if (!client) {
      return {
        content: [
          {
            type: "text",
            text: `❌ HANA client not connected. Please check your HANA configuration.`
          }
        ]
      };
    }
    
    try {
      // Real HANA query
      const query = `
        SELECT TABLE_NAME
        FROM SYS.TABLES
        WHERE SCHEMA_NAME = ?
      `;
      
      const results = await client.query(query, [schema_name]);
      const tables = results.map(row => row.TABLE_NAME);
      
      return {
        content: [
          {
            type: "text",
            text: `📋 Tables in schema '${schema_name}':\n\n` +
                  `${tables.map(table => `- ${table}`).join('\n')}\n\n` +
                  `Total tables: ${tables.length}`
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `❌ Error listing tables: ${error.message}`
          }
        ]
      };
    }
  },
  
  hana_describe_table: async (args) => {
    const { schema_name, table_name } = args || {};
    
    if (!schema_name || !table_name) {
      return {
        content: [
          {
            type: "text",
            text: `❌ Error: Both schema_name and table_name parameters are required\n\n` +
                  `Usage: Provide both schema_name and table_name to describe the table structure.`
          }
        ]
      };
    }
    
    const client = await getHanaClient();
    if (!client) {
      return {
        content: [
          {
            type: "text",
            text: `❌ HANA client not connected. Please check your HANA configuration.`
          }
        ]
      };
    }
    
    try {
      // Real HANA query to get table columns
      const columnsQuery = `
        SELECT 
          COLUMN_NAME,
          DATA_TYPE_NAME,
          LENGTH,
          SCALE,
          IS_NULLABLE,
          DEFAULT_VALUE,
          POSITION,
          COMMENTS
        FROM 
          SYS.TABLE_COLUMNS
        WHERE 
          SCHEMA_NAME = ? AND TABLE_NAME = ?
        ORDER BY 
          POSITION
      `;
      
      const results = await client.query(columnsQuery, [schema_name, table_name]);
      
      if (results.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: `❌ Table '${schema_name}.${table_name}' not found or no columns available.`
            }
          ]
        };
      }
      
      const columnsText = results.map(col => {
        let columnDef = `- ${col.COLUMN_NAME} (${col.DATA_TYPE_NAME}`;
        if (col.LENGTH) columnDef += `(${col.LENGTH})`;
        if (col.SCALE) columnDef += `,${col.SCALE}`;
        columnDef += `)`;
        columnDef += ` ${col.IS_NULLABLE === 'TRUE' ? 'NULL' : 'NOT NULL'}`;
        if (col.DEFAULT_VALUE) columnDef += ` DEFAULT ${col.DEFAULT_VALUE}`;
        if (col.COMMENTS) columnDef += ` -- ${col.COMMENTS}`;
        return columnDef;
      }).join('\n');
      
      return {
        content: [
          {
            type: "text",
            text: `📋 Table structure for '${schema_name}.${table_name}':\n\n` +
                  `Columns:\n${columnsText}\n\n` +
                  `Total columns: ${results.length}`
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `❌ Error describing table: ${error.message}`
          }
        ]
      };
    }
  },
  
  hana_list_indexes: async (args) => {
    const { schema_name, table_name } = args || {};
    
    if (!schema_name || !table_name) {
      return {
        content: [
          {
            type: "text",
            text: `❌ Error: Both schema_name and table_name parameters are required\n\n` +
                  `Usage: Provide both schema_name and table_name to list indexes.`
          }
        ]
      };
    }
    
    const client = await getHanaClient();
    if (!client) {
      return {
        content: [
          {
            type: "text",
            text: `❌ HANA client not connected. Please check your HANA configuration.`
          }
        ]
      };
    }
    
    try {
      // Real HANA query to get indexes
      const indexesQuery = `
        SELECT 
          INDEX_NAME,
          INDEX_TYPE,
          IS_UNIQUE,
          IS_PRIMARY
        FROM 
          SYS.INDEXES
        WHERE 
          SCHEMA_NAME = ? AND TABLE_NAME = ?
        ORDER BY 
          INDEX_NAME
      `;
      
      const results = await client.query(indexesQuery, [schema_name, table_name]);
      
      if (results.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: `📋 No indexes found for table '${schema_name}.${table_name}'.`
            }
          ]
        };
      }
      
      const indexesText = results.map(idx => {
        let indexType = idx.INDEX_TYPE;
        if (idx.IS_PRIMARY === 'TRUE') indexType = 'PRIMARY KEY';
        else if (idx.IS_UNIQUE === 'TRUE') indexType = 'UNIQUE';
        
        return `- ${idx.INDEX_NAME} (${indexType})`;
      }).join('\n');
      
      return {
        content: [
          {
            type: "text",
            text: `📋 Indexes for table '${schema_name}.${table_name}':\n\n` +
                  `${indexesText}\n\n` +
                  `Total indexes: ${results.length}`
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `❌ Error listing indexes: ${error.message}`
          }
        ]
      };
    }
  },
  
  hana_describe_index: async (args) => {
    const { schema_name, table_name, index_name } = args || {};
    
    if (!schema_name || !table_name || !index_name) {
      return {
        content: [
          {
            type: "text",
            text: `❌ Error: schema_name, table_name, and index_name parameters are required\n\n` +
                  `Usage: Provide all three parameters to describe the index structure.`
          }
        ]
      };
    }
    
    const client = await getHanaClient();
    if (!client) {
      return {
        content: [
          {
            type: "text",
            text: `❌ HANA client not connected. Please check your HANA configuration.`
          }
        ]
      };
    }
    
    try {
      // Real HANA query to get index details
      const indexQuery = `
        SELECT 
          INDEX_NAME,
          INDEX_TYPE,
          IS_UNIQUE,
          IS_PRIMARY,
          CREATED_TIME,
          LAST_MODIFIED_TIME
        FROM 
          SYS.INDEXES
        WHERE 
          SCHEMA_NAME = ? AND TABLE_NAME = ? AND INDEX_NAME = ?
      `;
      
      const results = await client.query(indexQuery, [schema_name, table_name, index_name]);
      
      if (results.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: `❌ Index '${schema_name}.${table_name}.${index_name}' not found.`
            }
          ]
        };
      }
      
      const index = results[0];
      let indexType = index.INDEX_TYPE;
      if (index.IS_PRIMARY === 'TRUE') indexType = 'PRIMARY KEY';
      else if (index.IS_UNIQUE === 'TRUE') indexType = 'UNIQUE';
      
      return {
        content: [
          {
            type: "text",
            text: `📋 Index details for '${schema_name}.${table_name}.${index_name}':\n\n` +
                  `Index Name: ${index.INDEX_NAME}\n` +
                  `Index Type: ${indexType}\n` +
                  `Is Unique: ${index.IS_UNIQUE === 'TRUE' ? 'Yes' : 'No'}\n` +
                  `Is Primary: ${index.IS_PRIMARY === 'TRUE' ? 'Yes' : 'No'}\n` +
                  `Created: ${index.CREATED_TIME || 'Unknown'}\n` +
                  `Last Modified: ${index.LAST_MODIFIED_TIME || 'Unknown'}`
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `❌ Error describing index: ${error.message}`
          }
        ]
      };
    }
  },
  
  hana_execute_query: async (args) => {
    const { query, parameters = [] } = args || {};
    
    if (!query) {
      return {
        content: [
          {
            type: "text",
            text: `❌ Error: query parameter is required\n\n` +
                  `Usage: Provide a SQL query to execute against the HANA database.`
          }
        ]
      };
    }
    
    const client = await getHanaClient();
    if (!client) {
      return {
        content: [
          {
            type: "text",
            text: `❌ HANA client not connected. Please check your HANA configuration.`
          }
        ]
      };
    }
    
    try {
      // Execute the provided query with parameters
      const results = await client.query(query, parameters);
      
      if (results.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: `✅ Query executed successfully!\n\n` +
                    `Query: ${query}\n` +
                    `Parameters: ${JSON.stringify(parameters)}\n\n` +
                    `Result: No rows returned (empty result set)`
            }
          ]
        };
      }
      
      // Format the results as a table
      const columns = Object.keys(results[0]);
      const headerRow = columns.join(' | ');
      const separatorRow = columns.map(() => '---').join(' | ');
      const dataRows = results.map(row => 
        columns.map(col => {
          const value = row[col];
          return value === null || value === undefined ? 'NULL' : String(value);
        }).join(' | ')
      );
      
      const tableText = [headerRow, separatorRow, ...dataRows].join('\n');
      
      return {
        content: [
          {
            type: "text",
            text: `✅ Query executed successfully!\n\n` +
                  `Query: ${query}\n` +
                  `Parameters: ${JSON.stringify(parameters)}\n\n` +
                  `Results (${results.length} rows):\n\n` +
                  `\`\`\`\n${tableText}\n\`\`\`\n\n` +
                  `Total rows returned: ${results.length}`
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `❌ Query execution failed!\n\n` +
                  `Query: ${query}\n` +
                  `Parameters: ${JSON.stringify(parameters)}\n\n` +
                  `Error: ${error.message}`
          }
        ]
      };
    }
  }
};

// Available tools for discovery
const tools = [
  {
    name: "hana_show_config",
    description: "Show the HANA database configuration",
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
  },
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
    name: "hana_show_env_vars",
    description: "Show all HANA-related environment variables (for debugging)",
    inputSchema: {
      type: "object",
      properties: {},
      required: []
    }
  },
  {
    name: "hana_list_tables",
    description: "List all tables in a specific schema",
    inputSchema: {
      type: "object",
      properties: {
        schema_name: {
          type: "string",
          description: "Name of the schema to list tables from"
        }
      },
      required: ["schema_name"]
    }
  },
  {
    name: "hana_describe_table",
    description: "Describe the structure of a specific table",
    inputSchema: {
      type: "object",
      properties: {
        schema_name: {
          type: "string",
          description: "Name of the schema containing the table"
        },
        table_name: {
          type: "string",
          description: "Name of the table to describe"
        }
      },
      required: ["schema_name", "table_name"]
    }
  },
  {
    name: "hana_list_indexes",
    description: "List all indexes for a specific table",
    inputSchema: {
      type: "object",
      properties: {
        schema_name: {
          type: "string",
          description: "Name of the schema containing the table"
        },
        table_name: {
          type: "string",
          description: "Name of the table to list indexes for"
        }
      },
      required: ["schema_name", "table_name"]
    }
  },
  {
    name: "hana_describe_index",
    description: "Describe the structure of a specific index",
    inputSchema: {
      type: "object",
      properties: {
        schema_name: {
          type: "string",
          description: "Name of the schema containing the table"
        },
        table_name: {
          type: "string",
          description: "Name of the table containing the index"
        },
        index_name: {
          type: "string",
          description: "Name of the index to describe"
        }
      },
      required: ["schema_name", "table_name", "index_name"]
    }
  },
  {
    name: "hana_execute_query",
    description: "Execute a custom SQL query against the HANA database",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "The SQL query to execute"
        },
        parameters: {
          type: "array",
          description: "Optional parameters for the query (for prepared statements)",
          items: {
            type: "string"
          }
        }
      },
      required: ["query"]
    }
  }
];

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
              name: 'HANA MCP Server (Simplified)',
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
  }
});

log('Server ready for requests'); 