# Environment variables reference

Authoritative list of **hana-mcp-server** environment variables (stdio and HTTP). For how to wire clients and copy-paste profiles, start at the [README](../README.md) and [configuration-samples.md](configuration-samples.md). For a `/docs` index, see [docs/README.md](README.md).

Variables are read at process start. Restart the MCP server after changing them.

## Contents

1. [SAP HANA connection](#1-sap-hana-connection)
2. [Logging](#2-logging)
3. [Query result limits and agent context](#3-query-result-limits-and-agent-context-mcp-tools)
4. [Schema and table listing](#4-schema-and-table-listing)
5. [Business / domain knowledge (semantics)](#5-business--domain-knowledge--semantics-json-hana_explain_table)
6. [Paged query snapshots](#6-paged-query-snapshots-hana_query_next_page)
7. [HTTP transport](#7-http-transport-npm-run-starthttp)
8. [Quick reference: which subsystem reads what](#8-quick-reference-which-subsystem-reads-what)
9. [Security notes](#9-security-notes)

---

## 1. SAP HANA connection

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `HANA_HOST` | Yes | — | Database hostname or IP. |
| `HANA_USER` | Yes | — | Database user. |
| `HANA_PASSWORD` | Yes | — | Database password. Never log or return raw values in tools; `hana_show_config` / `hana_show_env_vars` mask this. |
| `HANA_PORT` | No | `443` | SQL port (often `3XX13` for MDC tenant, e.g. `31013`). |
| `HANA_SCHEMA` | No | — | Default schema when tools omit `schema_name`. Strongly recommended for single-container and for IDE workflows. |
| `HANA_CONNECTION_TYPE` | No | `auto` | `auto`, `single_container`, `mdc_system`, `mdc_tenant`. With `auto`: tenant if both `HANA_INSTANCE_NUMBER` and `HANA_DATABASE_NAME` are set; system DB if only instance number; else single-container. |
| `HANA_INSTANCE_NUMBER` | MDC | — | Two-digit instance id (e.g. `10`). Required for MDC system and tenant. |
| `HANA_DATABASE_NAME` | MDC tenant | — | Tenant database name (e.g. `HQQ`). Wrong or missing value often causes auth failures while the same schema name exists elsewhere. |
| `HANA_SSL` | No | `true` | Set to `false` for non-TLS SQL ports if appropriate. |
| `HANA_ENCRYPT` | No | `true` | Encryption flag passed to `@sap/hana-client`. |
| `HANA_VALIDATE_CERT` | No | `true` | Set to `false` only for dev/labs with self-signed certs. |

**Implementation:** [`src/utils/config.js`](../src/utils/config.js) (`loadConfig`, `getConnectionParams`, `validate`).

---

## 2. Logging

| Variable | Default | Description |
|----------|---------|-------------|
| `LOG_LEVEL` | `INFO` | `error`, `warn`, `info`, `debug`. Also read by [`src/utils/logger.js`](../src/utils/logger.js). |
| `ENABLE_FILE_LOGGING` | `false` in code default; README examples often `true` | Must be exactly `true` to enable file logs. |
| `ENABLE_CONSOLE_LOGGING` | `true` unless set to `false` | Stderr logging for stdio MCP (many clients capture stderr). |

---

## 3. Query result limits and agent context (MCP tools)

These apply to **user-facing** `hana_execute_query` (and shape how much data enters the model context). Internal metadata queries used by the server bypass the SELECT wrapper but still use the shared HANA client.

| Variable | Default | Hard bounds (code) | Description |
|----------|---------|--------------------|-------------|
| `HANA_MAX_RESULT_ROWS` | `50` | 1–10000 | Maximum rows returned **per page** for a single-statement `SELECT` / `WITH` after server wrapping with `LIMIT`/`OFFSET`. Tool arg `maxRows` (or legacy `limit`) is clamped to this. |
| `HANA_MAX_RESULT_COLS` | `50` | 1–500 | Maximum columns per row in tool output; extra columns are omitted (`columnsOmitted` in `structuredContent`). |
| `HANA_MAX_CELL_CHARS` | `200` | 1–10000 | String length per cell after coercion; longer values are truncated with `…`. |
| `HANA_QUERY_DEFAULT_OFFSET` | `0` | ≥0 | Row offset when the tool does not pass `offset`. |

**Related tool arguments:** `hana_execute_query` supports `query`, `parameters`, `offset`, `maxRows`, `limit` (alias), `includeTotal` / `include_total` (optional `COUNT(*)` over the same subquery; extra DB cost).

**Non-SELECT statements** are executed without the wrapper; the server still caps the **returned** row array length in memory to `maxRows + 1` for safety. Very large procedural result sets are a known limitation—prefer narrower SQL or pagination at the source.

**Implementation:** [`src/database/query-runner.js`](../src/database/query-runner.js), [`src/tools/query-tools.js`](../src/tools/query-tools.js).

---

## 4. Schema and table listing

| Variable | Default | Hard bounds | Description |
|----------|---------|-------------|-------------|
| `HANA_LIST_DEFAULT_LIMIT` | `200` | 1–5000 | Default page size for `hana_list_schemas` and `hana_list_tables` when `limit` is omitted; also the **maximum** allowed `limit` from the client. |
| `HANA_RESOURCE_LIST_MAX_ITEMS` | `500` | 1–10000 | Max names embedded in `resources/read` for `hana:///schemas` and `hana:///schemas/{schema}` JSON bodies; adds `truncated` and totals in the payload. |

**Implementation:** [`src/database/query-executor.js`](../src/database/query-executor.js) (`getSchemasPage`, `getTablesPage`), [`src/server/resources.js`](../src/server/resources.js).

---

## 5. Business / domain knowledge — semantics JSON (`hana_explain_table`)

Optional **curated business or domain knowledge** (table/column meaning and code lists) in JSON—the same role as a small **data dictionary** or **custom knowledge file** for agents. Env names keep the **`HANA_SEMANTICS_*`** prefix for compatibility.

| Variable | Default | Description |
|----------|---------|-------------|
| `HANA_SEMANTICS_PATH` | — | Filesystem path to a JSON file. If set, it takes precedence over URL for loading (see loader order in code). |
| `HANA_SEMANTICS_URL` | — | HTTPS URL returning semantics JSON. Used when `HANA_SEMANTICS_PATH` is unset. |
| `HANA_SEMANTICS_TTL_MS` | `60000` | Cache TTL (ms) before reload; max `86400000`. `0` disables positive TTL caching behavior for the in-memory cache (file still re-read when mtime changes). |

**JSON shape (minimal):** top-level `tables` object keyed by `SCHEMA.TABLE`. Column-level entries can include `description` / `meaning` and `values` / `enum` maps.

**Configuration samples (multi-table JSON, PATH/URL env, lookup order):** [configuration-samples.md](configuration-samples.md).

**Implementation:** [`src/semantics/loader.js`](../src/semantics/loader.js), [`src/tools/table-tools.js`](../src/tools/table-tools.js) (`explainTable`).

### Cross-tenant metadata catalog (MDC)

When the MCP session is connected to one tenant (e.g. `HANA_DATABASE_NAME=HQP`) but application tables live in another (e.g. `HSP.SAPABAP1.TABLE`), `hana_execute_query` can use three-part SQL while metadata tools normally read `SYS.*` in the **connected** tenant only.

| Variable | Default | Description |
|----------|---------|-------------|
| `HANA_METADATA_CATALOG_DATABASE` | — | If set, `hana_list_tables`, `hana_describe_table`, `hana_explain_table`, `hana_list_indexes`, and `hana_describe_index` read `SYS.TABLES` / `SYS.TABLE_COLUMNS` / `SYS.INDEXES` from this database (e.g. `HSP`). Tool argument `catalog_database` overrides when provided. |

Semantics JSON may use keys `DB.SCHEMA.TABLE` (e.g. `HSP.SAPABAP1.DFKKOP`) when merging with `hana_explain_table` and `catalog_database` / env is set accordingly.

**Implementation:** [`src/database/query-executor.js`](../src/database/query-executor.js) (`_sysCatalogRef`, `getTablesPage`, `getTableColumns`, `getTableIndexes`, `getIndexDetails`), [`src/tools/table-tools.js`](../src/tools/table-tools.js), [`src/tools/index-tools.js`](../src/tools/index-tools.js).

---

## 6. Paged query snapshots (`hana_query_next_page`)

| Variable | Default | Hard bounds | Description |
|----------|---------|-------------|-------------|
| `HANA_QUERY_SNAPSHOT_TTL_MS` | `300000` (5 min) | 10000–3600000 | Lifetime of `snapshotId` stored in memory after a **truncated** `hana_execute_query` (SELECT/WITH with wrap). After expiry, clients must re-run the original query. |

Snapshots store the original `query` and `parameters` only (not result rows). In-memory only; lost on process restart.

**Implementation:** [`src/query-snapshot-store.js`](../src/query-snapshot-store.js).

---

## 7. HTTP transport (`npm run start:http`)

Used by [`src/server/http-index.js`](../src/server/http-index.js) and [`src/server/http-auth.js`](../src/server/http-auth.js).

| Variable | Default | Description |
|----------|---------|-------------|
| `MCP_HTTP_PORT` | `3100` | Listen port. |
| `MCP_HTTP_HOST` | `127.0.0.1` | Bind address. Use `0.0.0.0` only behind a reverse proxy and firewall. |
| `MCP_HTTP_ALLOWED_ORIGINS` | `null` | Comma-separated allowed `Origin` values for browser clients, or `*` to allow any. Mismatch returns `403`. |
| `MCP_HTTP_AUTH_ENABLED` | — | Set to `true` to require `Authorization: Bearer <JWT>` on `POST /mcp`. |
| `MCP_HTTP_JWT_ISSUER` | — | OIDC issuer URL (JWKS from `/.well-known/openid-configuration`). On **SAP BTP** with bound XSUAA, can be omitted; issuer is taken from `VCAP_SERVICES`. |
| `MCP_HTTP_JWT_AUDIENCE` | — | Optional expected JWT `aud`. |
| `MCP_HTTP_JWT_SCOPES_REQUIRED` | — | Optional comma-separated scopes that must be present on the token. |

**BTP:** `VCAP_SERVICES` is standard for bound services; do not commit credentials to git.

---

## 8. Quick reference: which subsystem reads what

| Subsystem | Variables |
|-----------|-----------|
| HANA client | `HANA_*` (connection block) |
| Logging | `LOG_LEVEL`, `ENABLE_FILE_LOGGING`, `ENABLE_CONSOLE_LOGGING` |
| `hana_execute_query` / `hana_query_next_page` | `HANA_MAX_RESULT_ROWS`, `HANA_MAX_RESULT_COLS`, `HANA_MAX_CELL_CHARS`, `HANA_QUERY_DEFAULT_OFFSET`, `HANA_QUERY_SNAPSHOT_TTL_MS` |
| `hana_list_schemas` / `hana_list_tables` | `HANA_LIST_DEFAULT_LIMIT` |
| `hana_explain_table` (business/domain semantics JSON) | `HANA_SEMANTICS_PATH`, `HANA_SEMANTICS_URL`, `HANA_SEMANTICS_TTL_MS`, `HANA_METADATA_CATALOG_DATABASE`, tool `catalog_database` |
| `hana:///` resources | `HANA_RESOURCE_LIST_MAX_ITEMS` (and HANA connectivity) |
| HTTP server | `MCP_HTTP_*`, `VCAP_SERVICES` (BTP) |

---

## 9. Security notes

- Treat all `HANA_*` and JWT secrets as **credentials**. Prefer env injection from the MCP client or secret store, not committed files.
- Lowering `HANA_MAX_RESULT_*` reduces token cost and data exfiltration surface in agent chats; raising them increases load on HANA and on LLM context.
- `hana_show_env_vars` is intended for debugging; disable or restrict in production if it exposes deployment metadata.
