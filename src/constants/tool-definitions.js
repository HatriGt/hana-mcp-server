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
    snapshotId: { type: 'string' },
    elapsedMs: { anyOf: [{ type: 'number' }, { type: 'null' }] }
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
      'Execute SQL against HANA. When HANA_QUERY_LIMITS_ENABLED=true, SELECT/WITH queries are wrapped with LIMIT/OFFSET (HANA_MAX_RESULT_ROWS) and row/column/cell caps apply; results are returned as-is otherwise. INSERT/UPDATE/DELETE are blocked by default; set HANA_ALLOW_INSERT, HANA_ALLOW_UPDATE, HANA_ALLOW_DELETE=true individually to permit each. Use limit, offset, maxRows, includeTotal as needed. If truncated, snapshotId may be returned for hana_query_next_page.',
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
        },
        timeout_ms: {
          type: 'number',
          description: 'Query timeout in milliseconds. 0 or omitted uses HANA_QUERY_TIMEOUT_MS (default 0 = disabled).'
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
  },

  // ─── Discovery tools ───────────────────────────────────────────────────────

  {
    name: 'hana_list_constraints',
    title: 'List table constraints',
    description: 'List primary key, unique, check, and foreign key constraints for a table (SYS.CONSTRAINTS + SYS.REFERENTIAL_CONSTRAINTS).',
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        schema_name:      { type: 'string', description: 'Schema name (defaults to HANA_SCHEMA)' },
        table_name:       { type: 'string', description: 'Table name' },
        catalog_database: { type: 'string', description: 'MDC catalog database for SYS.* (overrides HANA_METADATA_CATALOG_DATABASE)' }
      },
      required: ['table_name']
    }
  },
  {
    name: 'hana_get_table_stats',
    title: 'Get table statistics',
    description: 'Return row count, table type, column-store flag, primary key flag, and disk size (requires MONITORING privilege for disk size) from SYS.TABLES and SYS.M_TABLE_SIZES.',
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        schema_name: { type: 'string', description: 'Schema name (defaults to HANA_SCHEMA)' },
        table_name:  { type: 'string', description: 'Table name' }
      },
      required: ['table_name']
    }
  },
  {
    name: 'hana_list_views',
    title: 'List views in a schema',
    description: 'List views in a schema from SYS.VIEWS. Supports prefix filter and pagination.',
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        schema_name: { type: 'string', description: 'Schema name (defaults to HANA_SCHEMA)' },
        prefix:      { type: 'string', description: 'Filter view names by prefix' },
        limit:       { type: 'number', description: 'Max results (capped by HANA_LIST_DEFAULT_LIMIT)' },
        offset:      { type: 'number', description: 'Pagination offset' }
      },
      required: []
    }
  },
  {
    name: 'hana_describe_view',
    title: 'Describe a view',
    description: 'Return the view definition (SQL) and column metadata from SYS.VIEWS and SYS.VIEW_COLUMNS.',
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        schema_name:      { type: 'string', description: 'Schema name (defaults to HANA_SCHEMA)' },
        view_name:        { type: 'string', description: 'View name' },
        catalog_database: { type: 'string', description: 'MDC catalog database for SYS.*' }
      },
      required: ['view_name']
    }
  },
  {
    name: 'hana_list_synonyms',
    title: 'List synonyms in a schema',
    description: 'List synonyms in a schema from SYS.SYNONYMS, showing target object schema, name, and type.',
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        schema_name: { type: 'string', description: 'Schema name (defaults to HANA_SCHEMA)' },
        prefix:      { type: 'string', description: 'Filter synonym names by prefix' },
        limit:       { type: 'number' },
        offset:      { type: 'number' }
      },
      required: []
    }
  },
  {
    name: 'hana_list_procedures',
    title: 'List stored procedures in a schema',
    description: 'List stored procedures and their parameter counts from SYS.PROCEDURES.',
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        schema_name: { type: 'string', description: 'Schema name (defaults to HANA_SCHEMA)' },
        prefix:      { type: 'string', description: 'Filter procedure names by prefix' },
        limit:       { type: 'number' },
        offset:      { type: 'number' }
      },
      required: []
    }
  },
  {
    name: 'hana_describe_procedure',
    title: 'Describe a stored procedure',
    description: 'Return parameter names, types (IN/OUT/INOUT), data types, and positions from SYS.PROCEDURE_PARAMETERS.',
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        schema_name:      { type: 'string', description: 'Schema name (defaults to HANA_SCHEMA)' },
        procedure_name:   { type: 'string', description: 'Procedure name' },
        catalog_database: { type: 'string', description: 'MDC catalog database for SYS.*' }
      },
      required: ['procedure_name']
    }
  },
  {
    name: 'hana_search_columns',
    title: 'Search columns by name pattern',
    description: 'Find all columns matching a LIKE pattern across all tables (or within a schema). Uses SYS.TABLE_COLUMNS. Results capped at 1000.',
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        column_pattern: { type: 'string', description: 'LIKE pattern (e.g. %CUSTOMER_ID%, BUKRS)' },
        schema_name:    { type: 'string', description: 'Optional schema filter' },
        limit:          { type: 'number', description: 'Max results (hard cap 1000)' }
      },
      required: ['column_pattern']
    }
  },
  {
    name: 'hana_get_sample_data',
    title: 'Get sample rows from a table',
    description: 'Fetch the first N rows from a table using SELECT TOP. Result is shaped by the same row/column/cell caps as hana_execute_query.',
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        schema_name: { type: 'string', description: 'Schema name (defaults to HANA_SCHEMA)' },
        table_name:  { type: 'string', description: 'Table name' },
        limit:       { type: 'number', description: 'Number of rows (default 10, max HANA_MAX_RESULT_ROWS)' }
      },
      required: ['table_name']
    },
    outputSchema: QUERY_RESULT_OUTPUT_SCHEMA
  },
  {
    name: 'hana_explain_plan',
    title: 'Explain query execution plan',
    description: 'Run EXPLAIN PLAN for a SELECT/WITH query and return operator tree from EXPLAIN_PLAN_TABLE. Only SELECT/WITH are accepted.',
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'SELECT or WITH query to explain (must not contain DML/DDL)' }
      },
      required: ['query']
    }
  },
  {
    name: 'hana_list_foreign_keys',
    title: 'List foreign keys on a table',
    description: 'List referential constraints (foreign keys) showing column, referenced table/column, and delete rule from SYS.REFERENTIAL_CONSTRAINTS.',
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        schema_name:      { type: 'string', description: 'Schema name (defaults to HANA_SCHEMA)' },
        table_name:       { type: 'string', description: 'Table name' },
        catalog_database: { type: 'string', description: 'MDC catalog database for SYS.*' }
      },
      required: ['table_name']
    }
  },
  {
    name: 'hana_list_privileges',
    title: 'List effective privileges',
    description: 'List effective privileges for a user (or CURRENT_USER if omitted) from SYS.EFFECTIVE_PRIVILEGES. Requires CATALOG READ privilege or querying own privileges.',
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        grantee: { type: 'string', description: 'Database user to query. Omit for current user.' }
      },
      required: []
    }
  },

  // ─── Extended discovery tools (0.3.1) ─────────────────────────────────────

  {
    name: 'hana_get_ddl',
    title: 'Get object DDL definition',
    description: 'Retrieve the DDL (CREATE statement) for a TABLE, VIEW, PROCEDURE, FUNCTION, TRIGGER, or SEQUENCE from SYS.OBJECT_DEFINITION. Requires appropriate privileges.',
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        schema_name:  { type: 'string', description: 'Schema name (defaults to HANA_SCHEMA)' },
        object_name:  { type: 'string', description: 'Object name' },
        object_type:  { type: 'string', description: 'Optional filter: TABLE, VIEW, PROCEDURE, FUNCTION, TRIGGER, SEQUENCE' }
      },
      required: ['object_name']
    }
  },
  {
    name: 'hana_get_column_stats',
    title: 'Get column statistics',
    description: 'Retrieve column statistics (distinct count, null count, min/max) from SYS.COLUMN_STATISTICS (cached) or via live COUNT queries (live=true). With live=true a specific column_name is required.',
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        schema_name:  { type: 'string', description: 'Schema name (defaults to HANA_SCHEMA)' },
        table_name:   { type: 'string', description: 'Table name' },
        column_name:  { type: 'string', description: 'Optional: single column to inspect. Required when live=true.' },
        live:         { type: 'boolean', description: 'If true, run live COUNT(*)/COUNT(DISTINCT) queries instead of reading SYS.COLUMN_STATISTICS.' }
      },
      required: ['table_name']
    }
  },
  {
    name: 'hana_list_functions',
    title: 'List functions in a schema',
    description: 'List scalar and table functions from SYS.FUNCTIONS. Supports prefix filter and pagination.',
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        schema_name: { type: 'string', description: 'Schema name (defaults to HANA_SCHEMA)' },
        prefix:      { type: 'string', description: 'Filter function names by prefix' },
        limit:       { type: 'number' },
        offset:      { type: 'number' }
      },
      required: []
    }
  },
  {
    name: 'hana_describe_function',
    title: 'Describe a function',
    description: 'Return parameter names, types, data types, and positions for a function from SYS.FUNCTION_PARAMETERS.',
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        schema_name:      { type: 'string', description: 'Schema name (defaults to HANA_SCHEMA)' },
        function_name:    { type: 'string', description: 'Function name' },
        catalog_database: { type: 'string', description: 'MDC catalog database for SYS.*' }
      },
      required: ['function_name']
    }
  },
  {
    name: 'hana_list_calculation_views',
    title: 'List SAP calculation views',
    description: 'List calculation views from the _SYS_BIC schema (SAP BW/S4 analytical views). Supports prefix filter and pagination.',
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        prefix: { type: 'string', description: 'Filter view names by prefix' },
        limit:  { type: 'number' },
        offset: { type: 'number' }
      },
      required: []
    }
  },
  {
    name: 'hana_get_session_info',
    title: 'Get current session info',
    description: 'Return CURRENT_USER, CURRENT_SCHEMA, connected database name, SYSTEM_ID, and HANA version from DUMMY and M_DATABASE.',
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    inputSchema: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'hana_search_tables',
    title: 'Search tables by name pattern',
    description: 'Find all tables matching a LIKE pattern across all schemas (or within a specific schema). Uses SYS.TABLES. Results capped at 2000.',
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        table_pattern: { type: 'string', description: 'LIKE pattern (e.g. %ORDERS%, BKPF)' },
        schema_name:   { type: 'string', description: 'Optional schema filter' },
        limit:         { type: 'number', description: 'Max results (hard cap 2000)' }
      },
      required: ['table_pattern']
    }
  },
  {
    name: 'hana_get_expensive_queries',
    title: 'Get top expensive queries',
    description: 'Return the most expensive statements from M_EXPENSIVE_STATEMENTS ordered by duration. Requires MONITORING privilege.',
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: false },
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Number of statements to return (default 20, max 100)' }
      },
      required: []
    }
  },
  {
    name: 'hana_get_dependencies',
    title: 'Get object dependencies',
    description: 'Show what an object depends on or what depends on it, from SYS.OBJECT_DEPENDENCIES. Capped at 200 rows.',
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        schema_name:  { type: 'string', description: 'Schema name (defaults to HANA_SCHEMA)' },
        object_name:  { type: 'string', description: 'Object name' },
        direction:    { type: 'string', description: 'base (what this depends on), dependent (what depends on this), both (default)' }
      },
      required: ['object_name']
    }
  },
  {
    name: 'hana_get_partition_info',
    title: 'Get table partition info',
    description: 'Return partition metadata (type, level, record count, loaded state) from SYS.TABLE_PARTITIONS. Returns empty result for unpartitioned tables.',
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        schema_name: { type: 'string', description: 'Schema name (defaults to HANA_SCHEMA)' },
        table_name:  { type: 'string', description: 'Table name' }
      },
      required: ['table_name']
    }
  },
  {
    name: 'hana_list_sequences',
    title: 'List sequences in a schema',
    description: 'List sequences from SYS.SEQUENCES, showing start, min, max, increment, cycle, and cache settings.',
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        schema_name: { type: 'string', description: 'Schema name (defaults to HANA_SCHEMA)' },
        prefix:      { type: 'string', description: 'Filter sequence names by prefix' },
        limit:       { type: 'number' },
        offset:      { type: 'number' }
      },
      required: []
    }
  }
];

// Tool categories for organization
const TOOL_CATEGORIES = {
  CONFIGURATION: ['hana_show_config', 'hana_test_connection', 'hana_show_env_vars'],
  SCHEMA: ['hana_list_schemas'],
  TABLE: ['hana_list_tables', 'hana_describe_table', 'hana_explain_table'],
  INDEX: ['hana_list_indexes', 'hana_describe_index'],
  QUERY: ['hana_execute_query', 'hana_query_next_page'],
  DISCOVERY: [
    'hana_list_constraints', 'hana_get_table_stats', 'hana_list_views', 'hana_describe_view',
    'hana_list_synonyms', 'hana_list_procedures', 'hana_describe_procedure',
    'hana_search_columns', 'hana_get_sample_data', 'hana_explain_plan',
    'hana_list_foreign_keys', 'hana_list_privileges',
    'hana_get_ddl', 'hana_get_column_stats', 'hana_list_functions', 'hana_describe_function',
    'hana_list_calculation_views', 'hana_get_session_info', 'hana_search_tables',
    'hana_get_expensive_queries', 'hana_get_dependencies', 'hana_get_partition_info',
    'hana_list_sequences'
  ]
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
