/**
 * Tool definitions for HANA MCP Server
 */

const TOOLS = [
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