/**
 * Tool definitions for HANA MCP Server
 *
 * Note: For tools that accept schema_name as an optional parameter,
 * the HANA_SCHEMA environment variable will be used if schema_name is not provided.
 */

const LIST_OUTPUT_SCHEMA = {
  type: 'object',
  properties: {
    items: { type: 'array', items: { type: 'string' } },
    returned: { type: 'number' },
    totalAvailable: { type: 'number' },
    truncated: { type: 'boolean' },
    nextOffset: {
      anyOf: [{ type: 'number' }, { type: 'null' }]
    }
  },
  required: ['items', 'returned', 'totalAvailable', 'truncated']
};

const QUERY_RESULT_OUTPUT_SCHEMA = {
  type: 'object',
  properties: {
    kind: { type: 'string', enum: ['select', 'other'] },
    truncated: { type: 'boolean' },
    returnedRows: { type: 'number' },
    maxRows: { type: 'number' },
    offset: { type: 'number' },
    nextOffset: {
      anyOf: [{ type: 'number' }, { type: 'null' }]
    },
    totalRows: {
      anyOf: [{ type: 'number' }, { type: 'null' }]
    },
    columns: { type: 'array', items: { type: 'string' } },
    rows: { type: 'array' },
    columnsOmitted: { type: 'number' },
    appliedWrap: { type: 'boolean' },
    snapshotId: { type: 'string' }
  },
  required: [
    'kind',
    'truncated',
    'returnedRows',
    'maxRows',
    'offset',
    'columns',
    'rows',
    'columnsOmitted',
    'appliedWrap'
  ]
};

const EXPLAIN_TABLE_OUTPUT_SCHEMA = {
  type: 'object',
  properties: {
    schema: { type: 'string' },
    table: { type: 'string' },
    catalog_database: { type: 'string' },
    tableDescription: { type: 'string' },
    columns: { type: 'array' }
  },
  required: ['schema', 'table', 'columns']
};

const TOOLS = [
  {
    name: 'hana_show_config',
    title: 'Show HANA configuration',
    description: 'Show the HANA database configuration',
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false
    },
    inputSchema: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'hana_test_connection',
    title: 'Test HANA connection',
    description: 'Test connection to HANA database',
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false
    },
    inputSchema: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'hana_list_schemas',
    title: 'List HANA schemas',
    description:
      'List schemas in the HANA database with optional prefix filter and pagination (HANA_LIST_DEFAULT_LIMIT / offset).',
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false
    },
    inputSchema: {
      type: 'object',
      properties: {
        prefix: {
          type: 'string',
          description: 'Optional case-sensitive prefix filter (SQL LIKE prefix%)'
        },
        limit: {
          type: 'number',
          description: 'Max schemas to return (capped by server)'
        },
        offset: {
          type: 'number',
          description: 'Skip this many schemas (paging)'
        }
      },
      required: []
    },
    outputSchema: LIST_OUTPUT_SCHEMA
  },
  {
    name: 'hana_show_env_vars',
    title: 'Show HANA env vars',
    description: 'Show all HANA-related environment variables (for debugging)',
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false
    },
    inputSchema: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'hana_list_tables',
    title: 'List tables in schema',
    description:
      'List tables in a schema with optional name prefix and pagination (HANA_LIST_DEFAULT_LIMIT / offset).',
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false
    },
    inputSchema: {
      type: 'object',
      properties: {
        schema_name: {
          type: 'string',
          description: 'Name of the schema to list tables from (optional)'
        },
        prefix: {
          type: 'string',
          description: 'Optional table name prefix filter (SQL LIKE prefix%)'
        },
        limit: {
          type: 'number',
          description: 'Max tables to return (capped by server)'
        },
        offset: {
          type: 'number',
          description: 'Skip this many tables (paging)'
        },
        catalog_database: {
          type: 'string',
          description:
            'Optional HANA database name whose SYS.TABLES catalog to read (MDC cross-tenant). Omit for connected DB. Overrides HANA_METADATA_CATALOG_DATABASE when set.'
        }
      },
      required: []
    },
    outputSchema: LIST_OUTPUT_SCHEMA
  },
  {
    name: 'hana_describe_table',
    title: 'Describe table structure',
    description: 'Describe the structure of a specific table',
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false
    },
    inputSchema: {
      type: 'object',
      properties: {
        schema_name: {
          type: 'string',
          description: 'Name of the schema containing the table (optional)'
        },
        table_name: {
          type: 'string',
          description: 'Name of the table to describe'
        },
        catalog_database: {
          type: 'string',
          description:
            'Optional HANA database for SYS.TABLE_COLUMNS (e.g. HSP when connected to another tenant). Overrides HANA_METADATA_CATALOG_DATABASE when set.'
        }
      },
      required: ['table_name']
    }
  },
  {
    name: 'hana_explain_table',
    title: 'Explain table with business semantics',
    description:
      'Return column metadata merged with optional business semantics from HANA_SEMANTICS_PATH or HANA_SEMANTICS_URL (JSON keys: SCHEMA.TABLE or DB.SCHEMA.TABLE when catalog_database is set). Optional catalog_database reads SYS.* from another MDC database (e.g. HSP).',
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false
    },
    inputSchema: {
      type: 'object',
      properties: {
        schema_name: {
          type: 'string',
          description: 'Schema containing the table (optional if HANA_SCHEMA is set)'
        },
        table_name: {
          type: 'string',
          description: 'Table name'
        },
        catalog_database: {
          type: 'string',
          description:
            'Optional HANA database for SYS.TABLE_COLUMNS (MDC cross-tenant). Overrides HANA_METADATA_CATALOG_DATABASE when set.'
        }
      },
      required: ['table_name']
    },
    outputSchema: EXPLAIN_TABLE_OUTPUT_SCHEMA
  },
  {
    name: 'hana_list_indexes',
    title: 'List table indexes',
    description: 'List all indexes for a specific table',
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false
    },
    inputSchema: {
      type: 'object',
      properties: {
        schema_name: {
          type: 'string',
          description: 'Name of the schema containing the table (optional)'
        },
        table_name: {
          type: 'string',
          description: 'Name of the table to list indexes for'
        },
        catalog_database: {
          type: 'string',
          description:
            'Optional HANA database for SYS.INDEXES / SYS.INDEX_COLUMNS (MDC). Overrides HANA_METADATA_CATALOG_DATABASE when set.'
        }
      },
      required: ['table_name']
    }
  },
  {
    name: 'hana_describe_index',
    title: 'Describe table index',
    description: 'Describe the structure of a specific index',
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false
    },
    inputSchema: {
      type: 'object',
      properties: {
        schema_name: {
          type: 'string',
          description: 'Name of the schema containing the table (optional)'
        },
        table_name: {
          type: 'string',
          description: 'Name of the table containing the index'
        },
        index_name: {
          type: 'string',
          description: 'Name of the index to describe'
        },
        catalog_database: {
          type: 'string',
          description:
            'Optional HANA database for SYS.INDEXES / SYS.INDEX_COLUMNS (MDC). Overrides HANA_METADATA_CATALOG_DATABASE when set.'
        }
      },
      required: ['table_name', 'index_name']
    }
  },
  {
    name: 'hana_execute_query',
    title: 'Execute SQL query',
    description:
      'Execute SQL against HANA. SELECT/WITH queries are wrapped with LIMIT/OFFSET (HANA_MAX_RESULT_ROWS). Use limit, offset, maxRows, includeTotal as needed. If truncated, snapshotId may be returned for hana_query_next_page.',
    annotations: {
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: false,
      openWorldHint: false
    },
    execution: { taskSupport: 'optional' },
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The SQL query to execute'
        },
        parameters: {
          type: 'array',
          description: 'Optional parameters for the query (for prepared statements)',
          items: {
            type: 'string'
          }
        },
        limit: {
          type: 'number',
          description: 'Deprecated alias for maxRows; prefer maxRows'
        },
        offset: {
          type: 'number',
          description: 'Row offset for paged reads (SELECT/WITH only)'
        },
        maxRows: {
          type: 'number',
          description: 'Max data rows to return this page (capped by HANA_MAX_RESULT_ROWS)'
        },
        includeTotal: {
          type: 'boolean',
          description:
            'If true, run COUNT(*) on the same SELECT subquery (extra cost). Only for SELECT/WITH.'
        }
      },
      required: ['query']
    },
    outputSchema: QUERY_RESULT_OUTPUT_SCHEMA
  },
  {
    name: 'hana_query_next_page',
    title: 'Continue paged query',
    description:
      'Fetch the next page of a truncated SELECT using snapshotId from a previous hana_execute_query result (same SQL and parameters; TTL HANA_QUERY_SNAPSHOT_TTL_MS).',
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false
    },
    inputSchema: {
      type: 'object',
      properties: {
        snapshot_id: {
          type: 'string',
          description: 'snapshotId from structuredContent of a truncated query result'
        },
        offset: {
          type: 'number',
          description: 'Offset for this page (usually prior nextOffset)'
        },
        max_rows: {
          type: 'number',
          description: 'Optional page size override (capped by server)'
        }
      },
      required: ['snapshot_id', 'offset']
    },
    outputSchema: QUERY_RESULT_OUTPUT_SCHEMA
  }
];

// Tool categories for organization
const TOOL_CATEGORIES = {
  CONFIGURATION: ['hana_show_config', 'hana_test_connection', 'hana_show_env_vars'],
  SCHEMA: ['hana_list_schemas'],
  TABLE: ['hana_list_tables', 'hana_describe_table', 'hana_explain_table'],
  INDEX: ['hana_list_indexes', 'hana_describe_index'],
  QUERY: ['hana_execute_query', 'hana_query_next_page']
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
  getAllToolNames,
  LIST_OUTPUT_SCHEMA,
  QUERY_RESULT_OUTPUT_SCHEMA,
  EXPLAIN_TABLE_OUTPUT_SCHEMA
};
