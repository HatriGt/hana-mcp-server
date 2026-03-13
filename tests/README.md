# HANA MCP Server Tests

This folder contains a small, focused test suite for the HANA MCP Server, covering protocol behaviour, HTTP transport, and real‑database tool calls.

## Folder Structure

```text
tests/
├── README.md                      # This file
├── mcpInspector/                  # MCP Inspector configuration
│   ├── mcp-inspector-config.json
│   └── mcp-inspector-config.template.json
├── manual/                        # Interactive CLI tester
│   └── manual-test.js
└── automated/                     # Scripted tests
    ├── test-mcp-inspector.js      # Basic stdio sanity checks
    ├── test-new-features.js       # MCP spec, resources, tasks, HTTP transport
    ├── test-all-tools.js          # Exercise every HANA tool against a real DB
    └── run-query-once.js          # One-off SQL via hana_execute_query
```

## Recommended workflows

### 1. Full protocol & HTTP check (no real DB required)

From the project root:

```bash
npm test
```

This runs:

- `tests/automated/test-mcp-inspector.js` – basic stdio initialization and core tools.
- `tests/automated/test-new-features.js` – MCP 2025‑11‑25 alignment, resources, tasks, and HTTP `/mcp` endpoint.

### 2. Real HANA integration (all tools)

Set your HANA environment (for example, using the same values as your MCP config):

```bash
export HANA_HOST=...
export HANA_PORT=...
export HANA_USER=...
export HANA_PASSWORD=...
export HANA_SCHEMA=SAPABAP1
export HANA_DATABASE_NAME=HSQ   # or your tenant
export HANA_SSL=false
export HANA_ENCRYPT=false
export HANA_VALIDATE_CERT=false
```

Then run:

```bash
node tests/automated/test-all-tools.js
```

This will:

- Initialize the server.
- Call each HANA tool (`hana_show_config`, `hana_test_connection`, `hana_list_schemas`, `hana_list_tables`, `hana_describe_table`, `hana_list_indexes`, `hana_execute_query`).
- Optionally call `hana_describe_index` for the first index it finds.

### 3. One-off SQL query

To execute a single SQL statement via `hana_execute_query`:

```bash
HANA_HOST=... HANA_PASSWORD=... HANA_DATABASE_NAME=HSQ \
node tests/automated/run-query-once.js \
  "SELECT COUNT(*) AS cnt, YYATYPE FROM SAPABAP1.DFKKOP WHERE yyELSCLAIMNUM != '' GROUP BY YYATYPE"
```

If no query argument is provided, `run-query-once.js` uses its built‑in default.

### 4. Interactive manual tester

**Location**: `tests/manual/manual-test.js`

```bash
cd tests/manual
node manual-test.js
```

You will get a simple menu to:

- Show config
- Test connection
- List schemas and tables
- Describe tables
- List indexes
- Execute arbitrary SQL
- Show effective environment variables

The script uses the same MCP JSON‑RPC protocol as real clients; it is useful for debugging tool behaviour against your own database.

### 5. MCP Inspector

**Location**: `tests/mcpInspector/`

You can use either the web Inspector or the CLI package.

- Web: open `https://modelcontextprotocol.io/inspector` and point it at your local `hana-mcp-server` command with appropriate `HANA_*` envs.
- CLI: install the Inspector and use the config file in this repo:

```bash
npm install -g @modelcontextprotocol/inspector

cd tests/mcpInspector
mcp-inspector --config mcp-inspector-config.json
```

The Inspector lets you inspect available tools, call them interactively, and inspect raw JSON‑RPC traffic.

## HTTP transport quick check

The server can also run over HTTP. One JSON‑RPC request per POST; no persistent session.

From the project root:

```bash
# Default: http://127.0.0.1:3100/mcp
npm run start:http

# Custom port/host
MCP_HTTP_PORT=3200 MCP_HTTP_HOST=127.0.0.1 npm run start:http
```

Then from another terminal:

```bash
# 1. GET /mcp — server info
curl -s http://127.0.0.1:3100/mcp

# 2. POST — initialize (required first)
curl -s -X POST http://127.0.0.1:3100/mcp \
  -H "Content-Type: application/json" \
  -H "MCP-Protocol-Version: 2025-11-25" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-11-25","capabilities":{},"clientInfo":{"name":"curl","version":"1.0"}}}'

# 3. POST — list tools
curl -s -X POST http://127.0.0.1:3100/mcp \
  -H "Content-Type: application/json" \
  -H "MCP-Protocol-Version: 2025-11-25" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}'

# 4. POST — call a tool (e.g. show config)
curl -s -X POST http://127.0.0.1:3100/mcp \
  -H "Content-Type: application/json" \
  -H "MCP-Protocol-Version: 2025-11-25" \
  -d '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"hana_show_config","arguments":{}}}'
```

The automated suite in `test-new-features.js` also runs an HTTP initialize call against `/mcp` (see section 8 in that file).

## Environment variables

Most tests expect the following variables when talking to a real HANA instance:

- `HANA_HOST`: HANA database host
- `HANA_PORT`: HANA database port
- `HANA_USER`: HANA database username
- `HANA_PASSWORD`: HANA database password
- `HANA_SCHEMA`: default schema (e.g. `SAPABAP1`)
- `HANA_DATABASE_NAME`: tenant database name for MDC setups (e.g. `HSQ`, `HQQ`)
- `HANA_SSL`: SSL enabled (`true`/`false`)
- `HANA_ENCRYPT`: Encryption enabled (`true`/`false`)
- `HANA_VALIDATE_CERT`: Certificate validation (`true`/`false`)

If these are not set, the automated scripts fall back to dummy values and you should expect connection‑failure messages instead of real data.