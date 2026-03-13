/**
 * Tool definitions for HANA MCP Server
 * 
 * Note: For tools that accept schema_name as an optional parameter, 
 * the HANA_SCHEMA environment variable will be used if schema_name is not provided.
 */

const TOOLS = [
  {
    name: "hana_show_config",
    title: "Show HANA configuration",
    description: "Show the HANA database configuration",
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false
    },
    inputSchema: {
      type: "object",
      properties: {},
      required: []
    }
  },
  {
    name: "hana_test_connection",
    title: "Test HANA connection",
    description: "Test connection to HANA database",
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false
    },
    inputSchema: {
      type: "object",
      properties: {},
      required: []
    }
  },
  {
    name: "hana_list_schemas",
    title: "List HANA schemas",
    description: "List all schemas in the HANA database",
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false
    },
    inputSchema: {
      type: "object",
      properties: {},
      required: []
    }
  },
  {
    name: "hana_show_env_vars",
    title: "Show HANA env vars",
    description: "Show all HANA-related environment variables (for debugging)",
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false
    },
    inputSchema: {
      type: "object",
      properties: {},
      required: []
    }
  },
  {
    name: "hana_list_tables",
    title: "List tables in schema",
    description: "List all tables in a specific schema",
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false
    },
    inputSchema: {
      type: "object",
      properties: {
        schema_name: {
          type: "string",
          description: "Name of the schema to list tables from (optional)"
        }
      },
      required: []
    }
  },
  {
    name: "hana_describe_table",
    title: "Describe table structure",
    description: "Describe the structure of a specific table",
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false
    },
    inputSchema: {
      type: "object",
      properties: {
        schema_name: {
          type: "string",
          description: "Name of the schema containing the table (optional)"
        },
        table_name: {
          type: "string",
          description: "Name of the table to describe"
        }
      },
      required: ["table_name"]
    }
  },
  {
    name: "hana_list_indexes",
    title: "List table indexes",
    description: "List all indexes for a specific table",
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false
    },
    inputSchema: {
      type: "object",
      properties: {
        schema_name: {
          type: "string",
          description: "Name of the schema containing the table (optional)"
        },
        table_name: {
          type: "string",
          description: "Name of the table to list indexes for"
        }
      },
      required: ["table_name"]
    }
  },
  {
    name: "hana_describe_index",
    title: "Describe table index",
    description: "Describe the structure of a specific index",
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false
    },
    inputSchema: {
      type: "object",
      properties: {
        schema_name: {
          type: "string",
          description: "Name of the schema containing the table (optional)"
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
      required: ["table_name", "index_name"]
    }
  },
  {
    name: "hana_execute_query",
    title: "Execute SQL query",
    description: "Execute a custom SQL query against the HANA database",
    annotations: {
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: false,
      openWorldHint: false
    },
    execution: { taskSupport: 'optional' },
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

// Tool categories for organization
const TOOL_CATEGORIES = {
  CONFIGURATION: ['hana_show_config', 'hana_test_connection', 'hana_show_env_vars'],
  SCHEMA: ['hana_list_schemas'],
  TABLE: ['hana_list_tables', 'hana_describe_table'],
  INDEX: ['hana_list_indexes', 'hana_describe_index'],
  QUERY: ['hana_execute_query']
};

// Get tool by name
function getTool(name) {
  return TOOLS.find(tool => tool.name === name);
}

// Get tools by category
function getToolsByCategory(category) {
  const toolNames = TOOL_CATEGORIES[category] || [];
  return TOOLS.filter(tool => toolNames.includes(tool.name));
}

// Get all tool names
function getAllToolNames() {
  return TOOLS.map(tool => tool.name);
}

module.exports = {
  TOOLS,
  TOOL_CATEGORIES,
  getTool,
  getToolsByCategory,
  getAllToolNames
}; 