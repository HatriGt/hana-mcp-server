# Changelog

All notable changes to this project are documented here. Versions follow [Semantic Versioning](https://semver.org/).

> **Note:** If you mean “version 2” informally, the package line is **`0.x`** (there is no `2.0.0` tag). This log starts at **`0.2.0`**; the current release is **`0.3.1`**.

## [Unreleased]

_No changes yet._

## [0.3.3] — 2026-07-15

**Patch** release. Fixes zombie server processes on stdio.

### Fixed

- STDIO server now shuts down cleanly when the MCP client closes stdin. Previously the readline `close` handler kept the process alive and `lifecycle-manager` ran a `setInterval` keep-alive, so every Cursor/IDE restart or MCP refresh left an orphaned server process holding open HANA connections (leading to connection buildup and UI hangs). The keep-alive interval was removed; the stdin reader keeps the event loop active while connected and triggers a graceful shutdown on close.

## [0.3.2] — 2026-07-15

**Patch** release. Fixes query results being reported as counts only in MCP clients.

### Fixed

- `hana_execute_query` / `hana_query_next_page` now render the returned rows as a markdown table inside the `content[].text` block in addition to `structuredContent`. Many MCP clients only surface `content[].text` to the model and ignore `structuredContent`, which caused clients to report row counts instead of actual results even when explicitly asked to fetch them. `structuredContent` (rows, paging metadata, `snapshotId`) is unchanged.

## [0.3.1] — 2026-05-20

**Patch** release. Adds 11 extended discovery tools covering DDL, column profiling, functions, calculation views, session context, cross-schema search, performance monitoring, dependency analysis, partitions, and sequences.

### Added

- **11 extended discovery tools:**
  - `hana_get_ddl` — DDL (CREATE statement) for any object from `SYS.OBJECT_DEFINITION`; supports TABLE, VIEW, PROCEDURE, FUNCTION, TRIGGER, SEQUENCE.
  - `hana_get_column_stats` — column statistics from `SYS.COLUMN_STATISTICS` (cached) or live `COUNT(DISTINCT)` / null-count queries (`live=true`).
  - `hana_list_functions` / `hana_describe_function` — scalar and table functions from `SYS.FUNCTIONS` / `SYS.FUNCTION_PARAMETERS`; prefix filter and pagination.
  - `hana_list_calculation_views` — SAP calculation views from `_SYS_BIC`; useful for BW/S4 analytics landscapes.
  - `hana_get_session_info` — `CURRENT_USER`, `CURRENT_SCHEMA`, database name, `SYSTEM_ID`, and HANA version from `DUMMY` and `M_DATABASE`.
  - `hana_search_tables` — cross-schema table-name search via `SYS.TABLES` LIKE pattern; optional schema filter; capped at 2000.
  - `hana_get_expensive_queries` — top N expensive statements from `M_EXPENSIVE_STATEMENTS` ordered by duration; requires MONITORING privilege.
  - `hana_get_dependencies` — object dependency graph from `SYS.OBJECT_DEPENDENCIES`; `direction` param (`base`, `dependent`, `both`); capped at 200.
  - `hana_get_partition_info` — partition metadata (type, level, record count, loaded state) from `SYS.TABLE_PARTITIONS`; returns `partitioned=false` for unpartitioned tables.
  - `hana_list_sequences` — sequences from `SYS.SEQUENCES` with start, min, max, increment, cycle, cache, and create-time; prefix filter and pagination.

- **Live integration tests** — `test-all-tools.js` extended with coverage for all 11 new tools.

---

## [0.3.0] — 2026-05-19

**Minor** release. Adds 12 discovery tools, opt-in DML guard, explicit connection pool configuration, query limits opt-in flag, and fixes for HANA Cloud catalog column names discovered during live testing.

### Added

- **12 discovery tools** — comprehensive schema inspection without writing SQL:
  - `hana_list_constraints` — primary key, unique, and check constraints for a table.
  - `hana_list_foreign_keys` — referential constraints with referenced table and delete rule.
  - `hana_get_table_stats` — row count (live `COUNT(*)`), table type, column-store flag, disk size.
  - `hana_get_sample_data` — `TOP N` rows from any table.
  - `hana_search_columns` — find columns by pattern across all tables in a schema.
  - `hana_list_views` / `hana_describe_view` — list views and fetch their SQL definition and columns.
  - `hana_list_synonyms` — synonyms with target object schema, name, and type.
  - `hana_list_procedures` / `hana_describe_procedure` — list stored procedures and inspect their parameters.
  - `hana_explain_plan` — `EXPLAIN PLAN` for any `SELECT`/`WITH` query; returns the operator tree.
  - `hana_list_privileges` — effective privileges for the current user or a named grantee.

- **DML restrictions** — INSERT, UPDATE, DELETE, and TRUNCATE are **blocked by default**. Opt-in per operation via `HANA_ALLOW_INSERT`, `HANA_ALLOW_UPDATE`, `HANA_ALLOW_DELETE`. Error returned before the statement reaches HANA.

- **Connection pool** — `ConnectionPool` class with lazy slot creation, FIFO request queue, `markForReset` on connection error, and graceful `drain` on shutdown. Configurable via `HANA_CONNECTION_POOL_SIZE` (default `3`, max `20`).

- **`HANA_QUERY_LIMITS_ENABLED`** — query guardrails are now **opt-in** (default `false`). Server-side row/column/cell caps apply only when set to `true`; user-supplied `maxRows`, `offset`, and `includeTotal` always work.

- **`HANA_QUERY_TIMEOUT_MS`** — statement-level timeout for `hana_execute_query`; `0` = disabled. Per-call `timeout_ms` argument overrides.

- **Audit logger** — optional per-query audit trail (`HANA_AUDIT_ENABLED`, `HANA_AUDIT_LOG_FILE`). Each entry is a JSON line with timestamp, query preview, duration, row count, and error details.

- **Live integration tests** — `test-all-tools.js` extended with DML restriction checks (all four operations verified blocked; SELECT still passes), concurrent pool queries (3 parallel), and snapshot/next-page round-trip against real HANA.

- **Unit tests** — `test-connection-pool.js` (9 cases: acquire, release, reuse, queue, reset, drain, stats), `test-dml-restrictions.js` (validators, config env parsing, query-tools gate), expanded `test-config-limits.js` (pool size, timeout, limits-enabled flag).

### Fixed

- **`hana_list_constraints`** — replaced non-existent `CONSTRAINT_TYPE` column with `IS_PRIMARY_KEY` and `IS_UNIQUE_KEY` boolean flags (`SYS.CONSTRAINTS` on HANA Cloud).
- **`hana_get_table_stats`** — `RECORD_COUNT` absent from `SYS.TABLES` on HANA Cloud; row count now via a separate `COUNT(*)` query.
- **`hana_explain_plan`** — `OBJECT_NAME`/`OBJECT_SCHEMA` not present in `EXPLAIN_PLAN_TABLE` on HANA Cloud; corrected to `TABLE_NAME`/`SCHEMA_NAME`.
- **`hana_search_columns`** — live test was passing `pattern` instead of the required `column_pattern` parameter name.
- **Query runner** — `maxRows`, `offset`, and `includeTotal` were silently ignored when `HANA_QUERY_LIMITS_ENABLED=false`; all three now work independently of the limits flag.

### Changed

- **README** — Capabilities table lists all 12 discovery tools and DML guard; Configuration table adds `HANA_QUERY_LIMITS_ENABLED`, `HANA_QUERY_TIMEOUT_MS`, `HANA_CONNECTION_POOL_SIZE`.
- **`docs/ENVIRONMENT.md`** — §3 clarifies `maxRows`/`offset`/`includeTotal` are honoured regardless of `HANA_QUERY_LIMITS_ENABLED`; §3a–§3c document pool, audit logging, and DML restrictions.
- **`.markdownlint.json`** — suppresses pre-existing project-wide MD013/MD051/MD060 warnings.

---

## [0.2.2] — 2026-03-22

**Patch** release after **`0.2.1`**: cross-tenant SYS metadata (`HANA_METADATA_CATALOG_DATABASE` / `catalog_database`), semantics for **`hana_explain_table`**, query paging (**`hana_query_next_page`** / snapshots), sensitive value redaction, expanded docs (`docs/ENVIRONMENT.md`, configuration samples, local HTTP guide), and broader automated test coverage.

### Added

- **`hana_explain_table`** — column metadata from `SYS.TABLE_COLUMNS` merged with optional business semantics (see `HANA_SEMANTICS_*` below).
- **`hana_query_next_page`** — continue large `SELECT`/`WITH` result sets using `snapshotId` from `hana_execute_query` structured output.
- **Cross-tenant / MDC catalog reads** — `HANA_METADATA_CATALOG_DATABASE` env and per-tool optional **`catalog_database`** on `hana_list_tables`, `hana_describe_table`, `hana_explain_table`, `hana_list_indexes`, and `hana_describe_index` to read `SYS.*` from another database (e.g. HSP) while connected to a different tenant.
- **Semantics loader** — `HANA_SEMANTICS_PATH` (local JSON) and/or `HANA_SEMANTICS_URL` (HTTP); table keys as `DATABASE.SCHEMA.TABLE` where applicable.
- **Sensitive value redaction** — utilities to scrub secrets/host patterns from logs and tool-facing text where wired.
- **Documentation** — `docs/ENVIRONMENT.md` (authoritative env reference), `docs/configuration-samples.md`, `docs/local-http-mcp.md`, and `docs/README.md` index; README documentation table expanded.
- **HTTP helper / tests** — `src/server/http-origin.js` and automated coverage for origin allowlists, JWT auth (mock OIDC), semantics URL, metadata catalog, snapshots, query runner, schema/table tools, and related env validation (`test-config-all-env.js`, etc.).
- **Semantics samples** — JSON shape and env wiring in `docs/configuration-samples.md`; optional local file `config/finance-fi-ca-semantics.json` is gitignored.
- **Scripts** — `scripts/start-http-mcp.sh` for local HTTP MCP.
- **Live query scenarios** — `tests/automated/run-live-query-scenarios.js` for optional HANA-backed scenario runs.

### Changed

- **`hana_execute_query`** — structured content reports truncation, `nextOffset`, optional **`snapshotId`** for paging; aligns with configurable row limits / guardrails.
- **`npm test`** — expanded chain of automated tests (config, resources URI, formatters, redaction, catalog, snapshots, semantics, query runner, HTTP, MCP inspector, etc.).

---

## [0.2.1] — 2026-03-16

### Added

- **Optional HTTP JWT auth** — when `MCP_HTTP_AUTH_ENABLED=true`, validate `Authorization: Bearer <JWT>` via OIDC JWKS (`jose`). Configure **`MCP_HTTP_JWT_ISSUER`**, optional **`MCP_HTTP_JWT_AUDIENCE`** and **`MCP_HTTP_JWT_SCOPES_REQUIRED`**. On **SAP BTP**, issuer can be inferred from bound **XSUAA** (`VCAP_SERVICES`) when `MCP_HTTP_JWT_ISSUER` is omitted.
- **SAP BTP deploy artifacts** — `mta.yaml`, `xs-security.json` for hosting the HTTP MCP entrypoint.
- **`GET /health`** — lightweight JSON health response for load balancers and probes.
- **README** — hosted/HTTP discoverability and configuration pointers for the above.

---

## [0.2.0] — 2026-03-13

### Added

- **Streamable HTTP transport** — `npm run start:http` / `src/server/http-index.js`: `POST /mcp` for JSON-RPC, `GET` on MCP path for server info; configurable **`MCP_HTTP_HOST`**, **`MCP_HTTP_PORT`**, optional **`MCP_HTTP_ALLOWED_ORIGINS`** (browser CORS).
- **MCP protocol alignment (2025-11-25)** — resources, tasks, and related handler updates (see merge `feature/mcp-2025-http-resources-tasks`).

### Fixed

- **MDC** — connection / catalog behavior fixes for multi-database-container setups (per merge description).

### Changed

- **Testing & resources** — expanded automated tests and resource handling around the new transport and protocol surface.

---

## Earlier releases

For **`0.1.x`** history, see git tags (e.g. `v0.1.1`, `v0.1.3`) and commit messages prior to `0.2.0`.

[0.2.2]: https://github.com/hatrigt/hana-mcp-server/compare/e0aebdf...v0.2.2
[0.2.1]: https://github.com/hatrigt/hana-mcp-server/compare/24b12ae...6d3b735
[0.2.0]: https://github.com/hatrigt/hana-mcp-server/compare/v0.1.3...24b12ae
