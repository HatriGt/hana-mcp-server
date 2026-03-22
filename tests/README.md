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
    ├── test-config-limits.js      # Config class: limit env vars + clamps + auto MDC inference
    ├── test-config-all-env.js     # Remaining HANA_* / logging env, validate(), connection params
    ├── test-resources-uri.js      # parseHanaUri / buildUri
    ├── test-formatters-query.js   # formatQueryToolResult, formatNameListToolResult
    ├── test-sensitive-redact.js   # HANA_PASSWORD / JWT substrings redacted from strings
    ├── test-metadata-catalog.js   # MDC catalog_database validation, SYS prefix, env default
    ├── test-snapshot-store.js     # snapshot TTL (test clock), delete, unknown id
    ├── test-semantics-loader.js   # HANA_SEMANTICS_PATH file load + key variants
    ├── test-semantics-url-env.js  # HANA_SEMANTICS_URL HTTP fetch (local mock server)
    ├── test-query-runner-mocked.js # executeUserQuery: SELECT wrap, includeTotal, non-SELECT
    ├── test-schema-table-tools-mocked.js # list_schemas / list_tables limit clamp
    ├── test-query-tools-mocked.js # executeQuery snapshotId, queryNextPage, invalid snapshot
    ├── test-query-runner-unit.js  # isSingleSelectableStatement, trimRow, shapeRows
    ├── test-http-origin-env.js    # MCP_HTTP_ALLOWED_ORIGINS parsing (shared with http-index)
    ├── test-http-auth-env.js      # JWT issuer (env + VCAP), validateBearer, CORS + auth spawn
    ├── test-mcp-inspector.js      # Basic stdio sanity checks
    ├── test-new-features.js       # MCP spec, resources, tasks, HTTP /mcp initialize
    ├── test-all-tools.js          # Real DB: all tools + includeTotal + paging + resources/read
    └── run-query-once.js          # One-off SQL via hana_execute_query
```

## Recommended workflows

### 1. Full protocol & HTTP check (no real DB required)

From the project root:

```bash
npm test
```

This runs (in order) every `test-*.js` above **except** `test-all-tools.js` — no real HANA required.

Coverage highlights:

| Area | Tests |
|------|--------|
| Env limits | `HANA_MAX_*`, `HANA_LIST_DEFAULT_LIMIT`, `HANA_RESOURCE_LIST_MAX_ITEMS`, `HANA_SEMANTICS_TTL_MS`, `HANA_QUERY_SNAPSHOT_TTL_MS`, offsets, auto `mdc_*` |
| Env (connection + logging) | `test-config-all-env.js`: `HANA_HOST`…`HANA_VALIDATE_CERT`, `LOG_LEVEL`, `ENABLE_*`, explicit `HANA_CONNECTION_TYPE`, `validate()` |
| HTTP MCP env | `MCP_HTTP_PORT` / `MCP_HTTP_HOST` (via spawn), `MCP_HTTP_ALLOWED_ORIGINS`, `MCP_HTTP_AUTH_ENABLED`, `MCP_HTTP_JWT_*`, `VCAP_SERVICES` xsuaa URL → issuer |
| Query pipeline | Mocked `executeUserQuery` (wrap, COUNT total, procedural), `QueryTools` + snapshots |
| Semantics | `HANA_SEMANTICS_PATH` file + `HANA_SEMANTICS_URL` HTTP mock |
| MCP surface | Inspector + `test-new-features` (tools, resources, tasks, HTTP POST) |

**Live DB:** `npm run test:live` runs **`test-all-tools.js`**, which discovers schema/table from the connected tenant (no fixed `DFKKOP` requirement) and checks **`resources/read`** for `hana:///schemas`, `hana:///schemas/{schema}`, and table URIs. **`hana-mcp-ui`** (`PORT`, `NODE_ENV`) is not run by `npm test`.

### 2. Real HANA integration (all tools + resources)

Set your HANA environment (for example, the same values as your MCP config):

```bash
export HANA_HOST=...
export HANA_PORT=...
export HANA_USER=...
export HANA_PASSWORD=...
export HANA_SCHEMA=SAPABAP1
export HANA_DATABASE_NAME=HSQ   # MDC tenant when applicable
export HANA_SSL=false
export HANA_ENCRYPT=false
export HANA_VALIDATE_CERT=false
```

Optional:

```bash
export HANA_LIVE_STRICT=1          # exit 1 if any scenario after connect fails
export HANA_LIVE_TIMEOUT_MS=120000 # per-request timeout (default 60000, max 300000)

# Pin a real table (no hard-coded names in the repo — you set this):
export HANA_LIVE_TABLE_REF=HSP.SAPABAP1.DFKKOP   # SQL FROM fragment for execute_query live tests
# Optional: MCP metadata tools use these; default = last two segments of TABLE_REF
export HANA_LIVE_TOOL_SCHEMA=SAPABAP1
export HANA_LIVE_TOOL_TABLE=DFKKOP
export HANA_LIVE_DISTINCT_COLUMN=YYATYPE         # optional: extra SELECT DISTINCT on that column

# Or two-part pin only (quoted two-part SQL in tests):
export HANA_LIVE_SAMPLE_SCHEMA=SAPABAP1
export HANA_LIVE_SAMPLE_TABLE=DFKKOP

# Discovery-only work table + real SQL (needs SELECT on discovered table):
export HANA_LIVE_TRY_REAL_TABLE=1
```

**Shell note:** prefix form `HANA_HOST=… npm test && npm run test:live` only applies env to the **first** command. Use `export HANA_HOST=…` (and other vars) before `npm run test:live`, or one line: `HANA_HOST=… … sh -c 'npm test && HANA_LIVE_STRICT=1 npm run test:live'`.

Run:

```bash
npm run test:live
# same as:
node tests/automated/test-all-tools.js
```

**Behaviour:** exits **1** if `hana_test_connection` fails (no usable DB). **`HANA_LIVE_TABLE_REF`** supplies the SQL `FROM` for live **`hana_execute_query`** tests. **`hana_describe_table`** is tried on **`HANA_LIVE_TOOL_SCHEMA` / `HANA_LIVE_TOOL_TABLE`** if set, else the last two dot segments of `TABLE_REF`. If describe fails but `SELECT … FROM <ref> WHERE 1=0` succeeds, the ref is still pinned and live SQL runs; **describe / explain / indexes / resources/read table** are skipped for that run (fix by setting tool schema/table so describe succeeds). **`HANA_LIVE_DISTINCT_COLUMN`** adds `SELECT DISTINCT`. Alternatively **`HANA_LIVE_SAMPLE_SCHEMA` + `HANA_LIVE_SAMPLE_TABLE`**, or **`list_tables` discovery** with **`HANA_LIVE_TRY_REAL_TABLE=1`** for quoted two-part SQL. **Portable** `DUMMY` `UNION ALL` queries always run for engine checks.

**Tools exercised:** `hana_show_config`, `hana_test_connection`, `hana_show_env_vars`, `hana_list_schemas` (plain + **prefix**), `hana_list_tables` (paged + **prefix**), `hana_describe_table`, `hana_explain_table`, `hana_list_indexes`, optional `hana_describe_index`, `hana_execute_query` (DUMMY, **WITH**, **includeTotal**, DUMMY-union COUNT/paging/offset, live-table tests when pinned or `TRY_REAL`, optional DISTINCT), **`hana_query_next_page` invalid snapshot** (expects `isError`).

**MCP smoke:** `resources/list` (+ **cursor** if returned), `resources/templates/list`, `resources/read` for `hana:///schemas`, `hana:///schemas/{schema}`, `hana:///schemas/{schema}/tables/{table}`, `prompts/list`, `tools/list` (+ cursor if returned).

### 3. One-off SQL query

To execute a single SQL statement via `hana_execute_query`:

```bash
export HANA_HOST=... HANA_PASSWORD=... HANA_DATABASE_NAME=HQP   # MDC tenant you connect to
node tests/automated/run-query-once.js "SELECT 1 AS ok FROM DUMMY"
```

**Connection tenant vs. names in SQL:** `HANA_DATABASE_NAME` is only the database/tenant the client opens. Your SQL may still need a **three-part** object name (`<db>.<schema>.<table>`) when the engine resolves objects that way—for example:

```bash
export HANA_DATABASE_NAME=HQP
node tests/automated/run-query-once.js \
  "SELECT DISTINCT YYATYPE FROM HSP.SAPABAP1.DFKKOP"
```

Use the exact qualification your HANA/S/4 instance expects; `hana_execute_query` sends the string through unchanged.

If no query argument is provided, `run-query-once.js` runs `SELECT 1 AS ok FROM DUMMY`. Optional: `HANA_RUN_QUERY_TIMEOUT_MS` (default 120000).

**Live limits matrix:** `run-live-query-scenarios.js` spawns one server process per scenario so `HANA_MAX_RESULT_ROWS` / `HANA_MAX_RESULT_COLS` are applied correctly. Set `HANA_LIVE_TABLE_REF` to the SQL `FROM` fragment (same HANA env as MCP).

```bash
export HANA_LIVE_TABLE_REF=HSP.YOURSCHEMA.YOURTABLE
node tests/automated/run-live-query-scenarios.js
```

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