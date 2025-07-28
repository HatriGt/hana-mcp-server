# HANA MCP Server Technical Plan

## Architecture Overview

The HANA MCP Server is built on a modular architecture that follows the Model Context Protocol (MCP) specification. It serves as a bridge between AI assistants and SAP HANA databases, allowing for natural language interactions with database content.

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│                 │     │                  │     │                 │
│  AI Assistant   │◄────┤   MCP Protocol   ├────►│  HANA MCP Server│
│  (MCP Client)   │     │                  │     │                 │
│                 │     └──────────────────┘     └────────┬────────┘
└─────────────────┘                                       │
                                                          ▼
                                                  ┌─────────────────┐
                                                  │                 │
                                                  │   SAP HANA DB   │
                                                  │                 │
                                                  └─────────────────┘
```

## Technical Components

### 1. MCP Server Core

The server core is responsible for handling MCP protocol communications, managing capabilities, and routing requests to the appropriate handlers.

**Key Files:**
- `src/server.js`: Main MCP server implementation
- `src/index.js`: Entry point and server initialization

**Dependencies:**
- `@modelcontextprotocol/sdk`: Official MCP SDK for implementing the protocol

**Implementation Details:**
```javascript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport, HttpServerTransport } from "@modelcontextprotocol/sdk/server/transport.js";

// Create server instance with capabilities
const server = new McpServer({
  name: "hana-mcp-server",
  version: "1.0.0",
  capabilities: {
    tools: {
      // Tool definitions will be registered here
    }
  }
});

// Choose transport based on configuration
const transport = config.MCP_TRANSPORT === "http"
  ? new HttpServerTransport({ port: config.MCP_PORT })
  : new StdioServerTransport();

// Connect server to transport
await server.connect(transport);
```

### 2. HANA Client Integration

This component handles the connection to SAP HANA databases and provides a clean API for executing queries and retrieving schema information.

**Key Files:**
- `src/hana-client.js`: HANA client wrapper

**Dependencies:**
- `@sap/hana-client` or `hdb`: SAP HANA client libraries

**Implementation Details:**
```javascript
import hana from "@sap/hana-client";

export class HanaClient {
  constructor(config) {
    this.config = config;
    this.conn = null;
  }

  async connect() {
    if (this.conn && this.conn.readyState === 'connected') {
      return;
    }
    
    this.conn = hana.createConnection();
    await new Promise((resolve, reject) => {
      this.conn.connect(this.config, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  async disconnect() {
    if (this.conn) {
      await new Promise((resolve) => {
        this.conn.disconnect(() => resolve());
      });
    }
  }

  async executeQuery(sql, params = []) {
    await this.connect();
    return new Promise((resolve, reject) => {
      this.conn.exec(sql, params, (err, results) => {
        if (err) reject(err);
        else resolve(results);
      });
    });
  }
}
```

### 3. MCP Tools

The tools are the core capabilities exposed by the MCP server. They provide specific functionalities that AI assistants can discover and use.

#### 3.1 Schema Exploration Tools

**Key Files:**
- `src/tools/schema.js`: Schema exploration tool implementations

**Implementation Details:**
```javascript
export function registerSchemaTools(server, hanaClient) {
  // List all schemas - Using verified query
  server.tool(
    "hana_list_schemas",
    {},
    async () => {
      const schemas = await hanaClient.executeQuery(
        "SELECT SCHEMA_NAME FROM SYS.SCHEMAS"
      );
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(schemas, null, 2),
          },
        ],
      };
    }
  );

  // List tables in a schema - Using verified query
  server.tool(
    "hana_list_tables",
    {
      schema: z.string().describe("Schema name to list tables from"),
    },
    async (params) => {
      const tables = await hanaClient.executeQuery(
        "SELECT TABLE_NAME FROM SYS.TABLES WHERE SCHEMA_NAME = ?",
        [params.schema]
      );
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(tables, null, 2),
          },
        ],
      };
    }
  );

  // Describe table structure
  server.tool(
    "hana_describe_table",
    {
      schema: z.string().describe("Schema name"),
      tableName: z.string().describe("Table name to describe"),
    },
    async (params) => {
      const columns = await hanaClient.executeQuery(
        `SELECT COLUMN_NAME, DATA_TYPE_NAME, LENGTH, SCALE, IS_NULLABLE 
         FROM SYS.TABLE_COLUMNS 
         WHERE SCHEMA_NAME = ? AND TABLE_NAME = ?
         ORDER BY POSITION`,
        [params.schema, params.tableName]
      );
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(columns, null, 2),
          },
        ],
      };
    }
  );
  
  // List indexes for a table - Using verified query
  server.tool(
    "hana_list_indexes",
    {
      schema: z.string().describe("Schema name"),
      tableName: z.string().describe("Table name to list indexes for"),
    },
    async (params) => {
      const indexes = await hanaClient.executeQuery(
        `SELECT 
           INDEX_NAME, 
           SCHEMA_NAME, 
           TABLE_NAME, 
           INDEX_TYPE
         FROM SYS.INDEXES    
         WHERE SCHEMA_NAME = ?
           AND TABLE_NAME = ?`,
        [params.schema, params.tableName]
      );
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(indexes, null, 2),
          },
        ],
      };
    }
  );
  
  // Describe index details - Using verified query
  server.tool(
    "hana_describe_index",
    {
      schema: z.string().describe("Schema name"),
      tableName: z.string().describe("Table name"),
      indexName: z.string().optional().describe("Index name (optional, describes all indexes if omitted)"),
    },
    async (params) => {
      let query = `
        SELECT 
          i.INDEX_NAME AS index_name,
          STRING_AGG(ic.COLUMN_NAME, ', ' ORDER BY ic.POSITION) AS column_names,
          CASE 
            WHEN c.CONSTRAINT_NAME IS NOT NULL AND c.CONSTRAINT_NAME = i.INDEX_NAME THEN 'TRUE'
            ELSE 'FALSE'
          END AS is_primary,
          CASE 
            WHEN c.CONSTRAINT_NAME IS NOT NULL THEN 'TRUE'
            ELSE 'FALSE'
          END AS is_unique
        FROM SYS.INDEXES i
        JOIN SYS.INDEX_COLUMNS ic
          ON i.SCHEMA_NAME = ic.SCHEMA_NAME
          AND i.TABLE_NAME = ic.TABLE_NAME
          AND i.INDEX_NAME = ic.INDEX_NAME
        LEFT JOIN SYS.CONSTRAINTS c
          ON i.SCHEMA_NAME = c.SCHEMA_NAME
          AND i.TABLE_NAME = c.TABLE_NAME
          AND i.INDEX_NAME = c.CONSTRAINT_NAME
        WHERE i.SCHEMA_NAME = ?
          AND i.TABLE_NAME = ?`;
      
      const queryParams = [params.schema, params.tableName];
      
      // Add index name filter if provided
      if (params.indexName) {
        query += ` AND i.INDEX_NAME = ?`;
        queryParams.push(params.indexName);
      }
      
      query += `
        GROUP BY i.INDEX_NAME, c.CONSTRAINT_NAME
        ORDER BY i.INDEX_NAME`;
      
      const indexDetails = await hanaClient.executeQuery(query, queryParams);
      
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(indexDetails, null, 2),
          },
        ],
      };
    }
  );
}
```

#### 3.2 Query Execution Tools

**Key Files:**
- `src/tools/query.js`: Query execution tool implementations

**Implementation Details:**
```javascript
export function registerQueryTools(server, hanaClient) {
  // Execute read-only SQL query
  server.tool(
    "hana_query",
    {
      sql: z.string().describe("SQL query to execute (read-only)"),
      params: z.array(z.any()).optional().describe("Query parameters"),
    },
    async (params) => {
      // Validate that the query is read-only
      const sqlLower = params.sql.toLowerCase().trim();
      if (!sqlLower.startsWith("select") && !sqlLower.startsWith("with")) {
        throw new Error("Only SELECT queries are allowed");
      }
      
      const results = await hanaClient.executeQuery(
        params.sql,
        params.params || []
      );
      
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(results, null, 2),
          },
        ],
      };
    }
  );

  // Execute data modification query (if allowed)
  server.tool(
    "hana_execute",
    {
      sql: z.string().describe("SQL statement to execute"),
      params: z.array(z.any()).optional().describe("Statement parameters"),
    },
    async (params) => {
      // Check if write operations are allowed
      if (!config.ALLOW_WRITE_OPERATIONS) {
        throw new Error("Write operations are not allowed");
      }
      
      const result = await hanaClient.executeQuery(
        params.sql,
        params.params || []
      );
      
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ affectedRows: result }, null, 2),
          },
        ],
      };
    }
  );
}
```

#### 3.3 Administrative Tools

**Key Files:**
- `src/tools/admin.js`: Administrative tool implementations

**Implementation Details:**
```javascript
export function registerAdminTools(server, hanaClient) {
  // Get system information
  server.tool(
    "hana_system_info",
    {},
    async () => {
      const info = await hanaClient.executeQuery(
        "SELECT * FROM M_SYSTEM_OVERVIEW"
      );
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(info, null, 2),
          },
        ],
      };
    }
  );

  // Get connection information
  server.tool(
    "hana_connection_info",
    {},
    async () => {
      const info = await hanaClient.executeQuery(
        "SELECT * FROM M_CONNECTIONS WHERE CONNECTION_ID = CURRENT_CONNECTION"
      );
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(info, null, 2),
          },
        ],
      };
    }
  );
}
```

### 4. Configuration and Utilities

**Key Files:**
- `src/utils/config.js`: Configuration management
- `src/utils/logger.js`: Logging utilities

**Dependencies:**
- `dotenv`: For environment variable management
- `winston`: For logging

**Implementation Details:**
```javascript
// config.js
import dotenv from "dotenv";
dotenv.config();

export const config = {
  // HANA connection settings
  HANA_HOST: process.env.HANA_HOST,
  HANA_PORT: process.env.HANA_PORT || 30015,
  HANA_USER: process.env.HANA_USER,
  HANA_PASSWORD: process.env.HANA_PASSWORD,
  HANA_DATABASE: process.env.HANA_DATABASE,
  HANA_USE_TLS: process.env.HANA_USE_TLS || "true",
  
  // MCP server settings
  MCP_TRANSPORT: process.env.MCP_TRANSPORT || "stdio",
  MCP_PORT: process.env.MCP_PORT || 3000,
  
  // Security settings
  ALLOW_WRITE_OPERATIONS: process.env.ALLOW_WRITE_OPERATIONS === "true",
  
  // Logging settings
  LOG_LEVEL: process.env.LOG_LEVEL || "info",
};

// logger.js
import winston from "winston";
import { config } from "./config.js";

export const logger = winston.createLogger({
  level: config.LOG_LEVEL,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
  ],
});
```

## Technical Specifications

### Transport Protocols

The server supports two transport protocols as defined by the MCP specification:

1. **STDIO**: Standard input/output for local execution
   - Low latency
   - Suitable for local AI assistants
   - Managed by the AI assistant process

2. **HTTP+SSE**: HTTP with Server-Sent Events for remote execution
   - Suitable for remote AI assistants
   - Requires network connectivity
   - Can be deployed behind a reverse proxy

### Authentication Methods

The server supports the following authentication methods for connecting to SAP HANA:

1. **Username/Password**: Basic authentication using HANA credentials
2. **JWT**: JSON Web Token authentication (if supported by HANA)
3. **SAML**: Security Assertion Markup Language (if supported by HANA)

### HANA-Specific Features

The server leverages several SAP HANA features:

1. **System Views**: For schema exploration and metadata retrieval
   - `SYS.SCHEMAS`: For listing available schemas
   - `SYS.TABLES`: For listing tables within schemas
   - `SYS.TABLE_COLUMNS`: For describing table structures
   - `SYS.INDEXES`: For listing indexes
   - `SYS.INDEX_COLUMNS`: For describing index columns
   - `SYS.CONSTRAINTS`: For identifying primary keys and unique constraints
   - `M_SYSTEM_OVERVIEW`: For system information
   - `M_CONNECTIONS`: For connection information

2. **Query Execution**: For executing SQL queries
   - Parameter binding for secure query execution
   - Transaction management for write operations (if enabled)
   - Result set handling for large result sets

3. **Connection Management**: For efficient database access
   - Connection pooling (optional)
   - TLS encryption for secure connections
   - Automatic reconnection on connection loss

## Security Implementation

### Query Validation

All SQL queries are validated before execution to prevent SQL injection and unauthorized operations:

```javascript
function validateQuery(sql) {
  const sqlLower = sql.toLowerCase().trim();
  
  // Check for read-only operations if write is not allowed
  if (!config.ALLOW_WRITE_OPERATIONS) {
    if (
      sqlLower.startsWith("insert") ||
      sqlLower.startsWith("update") ||
      sqlLower.startsWith("delete") ||
      sqlLower.startsWith("drop") ||
      sqlLower.startsWith("create") ||
      sqlLower.startsWith("alter")
    ) {
      throw new Error("Write operations are not allowed");
    }
  }
  
  // Check for system-level operations (always prohibited)
  if (
    sqlLower.includes("sys.users") ||
    sqlLower.includes("sys.roles") ||
    sqlLower.includes("_sys_repo")
  ) {
    throw new Error("Access to system tables is restricted");
  }
  
  return true;
}
```

### Parameter Binding

All user inputs are passed as parameters to prevent SQL injection:

```javascript
// UNSAFE: Direct string concatenation
const query = `SELECT * FROM USERS WHERE USERNAME = '${username}'`;

// SAFE: Parameter binding
const query = "SELECT * FROM USERS WHERE USERNAME = ?";
const params = [username];
const results = await hanaClient.executeQuery(query, params);
```

### Connection Security

Secure connections to SAP HANA are established using TLS:

```javascript
const connectionConfig = {
  host: config.HANA_HOST,
  port: config.HANA_PORT,
  uid: config.HANA_USER,
  pwd: config.HANA_PASSWORD,
  encrypt: true, // Enable TLS
  sslValidateCertificate: true, // Validate server certificate
};
```

## Deployment Options

### 1. NPM Package

The server can be published as an npm package for easy installation:

```json
{
  "name": "hana-mcp-server",
  "version": "1.0.0",
  "description": "Model Context Protocol server for SAP HANA",
  "main": "src/index.js",
  "type": "module",
  "bin": {
    "hana-mcp-server": "./bin/cli.js"
  },
  "scripts": {
    "start": "node src/index.js"
  }
}
```

### 2. Docker Container

The server can be containerized for consistent deployment:

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3000

CMD ["node", "src/index.js"]
```

### 3. Direct Integration

The server can be integrated directly with AI assistants:

```json
{
  "mcpServers": {
    "hana-mcp-server": {
      "command": "node",
      "args": [
        "/path/to/hana-mcp-server/src/index.js"
      ],
      "env": {
        "HANA_HOST": "your-hana-host",
        "HANA_PORT": "30015",
        "HANA_USER": "your-username",
        "HANA_PASSWORD": "your-password"
      }
    }
  }
}
```

## Performance Considerations

### Connection Pooling

For improved performance, connection pooling can be implemented:

```javascript
import { Pool } from 'generic-pool';

const pool = Pool({
  create: async () => {
    const conn = hana.createConnection();
    await new Promise((resolve, reject) => {
      conn.connect(connectionConfig, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    return conn;
  },
  destroy: (conn) => {
    return new Promise((resolve) => {
      conn.disconnect(() => resolve());
    });
  },
  max: 10,
  min: 2,
  idleTimeoutMillis: 30000,
  acquireTimeoutMillis: 5000
});

async function executeQuery(sql, params = []) {
  const conn = await pool.acquire();
  try {
    return new Promise((resolve, reject) => {
      conn.exec(sql, params, (err, results) => {
        if (err) reject(err);
        else resolve(results);
      });
    });
  } finally {
    await pool.release(conn);
  }
}
```

### Result Pagination

For large result sets, pagination can be implemented:

```javascript
server.tool(
  "hana_query_paginated",
  {
    sql: z.string().describe("SQL query to execute"),
    params: z.array(z.any()).optional().describe("Query parameters"),
    page: z.number().min(1).default(1).describe("Page number"),
    pageSize: z.number().min(1).max(1000).default(100).describe("Page size"),
  },
  async (params) => {
    const offset = (params.page - 1) * params.pageSize;
    
    // Add pagination to the query
    let paginatedSql = params.sql;
    if (!paginatedSql.toLowerCase().includes("limit")) {
      paginatedSql += ` LIMIT ${params.pageSize} OFFSET ${offset}`;
    }
    
    const results = await hanaClient.executeQuery(
      paginatedSql,
      params.params || []
    );
    
    // Get total count for pagination info
    const countSql = `SELECT COUNT(*) AS total FROM (${params.sql}) AS subquery`;
    const countResult = await hanaClient.executeQuery(
      countSql,
      params.params || []
    );
    
    const total = countResult[0].TOTAL;
    const totalPages = Math.ceil(total / params.pageSize);
    
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            data: results,
            pagination: {
              page: params.page,
              pageSize: params.pageSize,
              total,
              totalPages,
            }
          }, null, 2),
        },
      ],
    };
  }
);
```

## Verified SQL Queries

The following SQL queries have been tested and verified to work with SAP HANA:

### List All Schemas
```sql
SELECT SCHEMA_NAME 
FROM SYS.SCHEMAS;
```

### List Tables in a Schema
```sql
SELECT TABLE_NAME
FROM SYS.TABLES
WHERE SCHEMA_NAME = '61000330C5F74440BC7E6784B1745EB6';
```

### List Indexes for a Table
```sql
SELECT 
    INDEX_NAME, 
    SCHEMA_NAME, 
    TABLE_NAME, 
    INDEX_TYPE
FROM SYS.INDEXES    
WHERE SCHEMA_NAME = '61000330C5F74440BC7E6784B1745EB6'
  AND TABLE_NAME = 'ATOM_DB_FINANCE_CLEARINGTABLEUSERVARIANTS';
```

### Detailed Index Information
```sql
SELECT 
    i.INDEX_NAME AS index_name,
    STRING_AGG(ic.COLUMN_NAME, ', ' ORDER BY ic.POSITION) AS column_names,
    CASE 
        WHEN c.CONSTRAINT_NAME IS NOT NULL AND c.CONSTRAINT_NAME = i.INDEX_NAME THEN 'TRUE'
        ELSE 'FALSE'
    END AS is_primary,
    CASE 
        WHEN c.CONSTRAINT_NAME IS NOT NULL THEN 'TRUE'
        ELSE 'FALSE'
    END AS is_unique
FROM SYS.INDEXES i
JOIN SYS.INDEX_COLUMNS ic
  ON i.SCHEMA_NAME = ic.SCHEMA_NAME
 AND i.TABLE_NAME = ic.TABLE_NAME
 AND i.INDEX_NAME = ic.INDEX_NAME
LEFT JOIN SYS.CONSTRAINTS c
  ON i.SCHEMA_NAME = c.SCHEMA_NAME
 AND i.TABLE_NAME = c.TABLE_NAME
 AND i.INDEX_NAME = c.CONSTRAINT_NAME
WHERE i.SCHEMA_NAME = '61000330C5F74440BC7E6784B1745EB6'
  AND i.TABLE_NAME = 'ATOM_DB_FINANCE_CLEARINGTABLEUSERVARIANTS'
GROUP BY i.INDEX_NAME, c.CONSTRAINT_NAME
ORDER BY i.INDEX_NAME;
```

These queries form the foundation for the schema exploration tools in the HANA MCP server, providing reliable access to database metadata.

## Testing Strategy

### Unit Tests

Unit tests will be implemented using Jest:

```javascript
// test/hana-client.test.js
import { HanaClient } from "../src/hana-client.js";
import { jest } from "@jest/globals";

describe("HanaClient", () => {
  let mockConnection;
  let hanaClient;
  
  beforeEach(() => {
    mockConnection = {
      connect: jest.fn((config, callback) => callback()),
      disconnect: jest.fn((callback) => callback()),
      exec: jest.fn((sql, params, callback) => callback(null, [])),
    };
    
    global.hana = {
      createConnection: jest.fn(() => mockConnection),
    };
    
    hanaClient = new HanaClient({
      host: "test-host",
      port: 30015,
    });
  });
  
  test("connects to HANA database", async () => {
    await hanaClient.connect();
    expect(mockConnection.connect).toHaveBeenCalled();
  });
  
  test("executes query", async () => {
    const results = await hanaClient.executeQuery("SELECT * FROM TEST");
    expect(mockConnection.exec).toHaveBeenCalledWith(
      "SELECT * FROM TEST",
      [],
      expect.any(Function)
    );
  });
});
```

### Integration Tests

Integration tests will verify the interaction between components:

```javascript
// test/integration.test.js
import { createServer } from "../src/server.js";
import { HanaClient } from "../src/hana-client.js";
import { registerSchemaTools } from "../src/tools/schema.js";

describe("Integration Tests", () => {
  let server;
  let hanaClient;
  
  beforeEach(() => {
    hanaClient = new MockHanaClient();
    server = createServer();
    registerSchemaTools(server, hanaClient);
  });
  
  test("list schemas tool returns schemas", async () => {
    // Mock the executeQuery method to return test data
    hanaClient.executeQuery = jest.fn().mockResolvedValue([
      { SCHEMA_NAME: "TEST_SCHEMA" },
      { SCHEMA_NAME: "ANOTHER_SCHEMA" },
    ]);
    
    // Simulate tool execution
    const result = await server.executeToolByName("hana_list_schemas", {});
    
    // Verify the result
    expect(result.content[0].text).toContain("TEST_SCHEMA");
    expect(result.content[0].text).toContain("ANOTHER_SCHEMA");
  });
  
  // Test for the new index tools
  test("list indexes tool returns indexes", async () => {
    // Mock the executeQuery method to return test data
    hanaClient.executeQuery = jest.fn().mockResolvedValue([
      { 
        INDEX_NAME: "PK_TEST", 
        SCHEMA_NAME: "TEST_SCHEMA", 
        TABLE_NAME: "TEST_TABLE", 
        INDEX_TYPE: "BTREE" 
      }
    ]);
    
    // Simulate tool execution
    const result = await server.executeToolByName("hana_list_indexes", {
      schema: "TEST_SCHEMA",
      tableName: "TEST_TABLE"
    });
    
    // Verify the result
    expect(result.content[0].text).toContain("PK_TEST");
    expect(result.content[0].text).toContain("BTREE");
  });
});
```

## Conclusion

This technical plan provides a comprehensive blueprint for implementing the HANA MCP Server. By following this plan, developers can create a robust, secure, and efficient bridge between AI assistants and SAP HANA databases, enabling powerful natural language interactions with database content.

The modular architecture allows for easy extension and maintenance, while the security considerations ensure responsible use of database resources. The implementation leverages standard Node.js practices and the official MCP SDK to ensure compatibility with the MCP ecosystem.

The inclusion of verified SQL queries for schema exploration ensures that the server will work reliably with real SAP HANA instances, providing accurate metadata about schemas, tables, and indexes to AI assistants.
