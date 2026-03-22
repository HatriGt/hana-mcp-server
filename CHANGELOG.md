# Changelog

All notable changes to this project are documented here. Versions follow [Semantic Versioning](https://semver.org/).

> **Note:** If you mean “version 2” informally, this package line is **`0.2.x`** (there is no `2.0.0` tag). This log starts at **`0.2.0`**.

## [Unreleased]

_No changes yet._

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
