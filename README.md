# SAP HANA MCP Server

[![npm version](https://img.shields.io/npm/v/hana-mcp-server.svg)](https://www.npmjs.com/package/hana-mcp-server)
[![npm downloads](https://img.shields.io/npm/dy/hana-mcp-server.svg)](https://www.npmjs.com/package/hana-mcp-server)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![MCP](https://badge.mcpx.dev?type=server)](https://modelcontextprotocol.io/)

**SAP HANA MCP Server** implements the [Model Context Protocol](https://modelcontextprotocol.io/) for **SAP HANA** and **SAP HANA Cloud**. AI clients discover schema, run SQL with guardrails, and optionally merge **business/domain metadata** so agents interpret codes and tables consistently—without replacing your database as the system of record.

---

## 📚 Documentation

| Document | Purpose |
|----------|---------|
| This README | Prerequisites, install, **how to wire each client**, capability summary, configuration cheat sheet, troubleshooting |
| [CHANGELOG.md](CHANGELOG.md) | **Release history** — features and fixes by version (`0.2.x`, latest `0.2.2`) |
| [docs/README.md](docs/README.md) | Index of `/docs` |
| [docs/ENVIRONMENT.md](docs/ENVIRONMENT.md) | **Authoritative** env reference: every variable, defaults, **hard bounds**, HTTP auth, security notes |
| [docs/configuration-samples.md](docs/configuration-samples.md) | **Copy-paste**: connection profiles (single-container, MDC), semantics JSON, paging pointers |
| [docs/local-http-mcp.md](docs/local-http-mcp.md) | Local **HTTP** MCP: `npm run start:http`, Cursor `mcp.json`, curl smoke checks |

---

## ✅ Prerequisites

- **Node.js** 18+
- A **SAP HANA** or **SAP HANA Cloud** database reachable on the SQL port from the machine running the server
- An **MCP client** (Claude Desktop, Claude Code, VS Code, Cursor, Cline, Windsurf, or custom HTTP client)
- **Credentials** supplied via env (see [Security](#security))

---

## 📦 Installation

| Method | Use when |
|--------|----------|
| `npx` + `-y hana-mcp-server` in MCP config | **Default** — no global install |
| `npm install -g hana-mcp-server` | You need `hana-mcp-server` on `PATH` |
| Clone + `node hana-mcp-server.js` | Developing or pinning a local build |

**HTTP entrypoint** (from a clone): `npm run start:http` — default bind `127.0.0.1:3100`, path `/mcp`. See [Hosted & HTTP](#-hosted--http).

---

## 🎯 Use cases

| Audience | Transport | Next step |
|----------|-----------|-----------|
| Chat / lite users | stdio | [Claude Desktop](#-claude-desktop) |
| Developers (Claude Code, VS Code, Cline, Cursor, Windsurf) | stdio | [IDEs & code agents](#-ides--code-agents) |
| Business apps with AI agents (you host MCP over HTTP) | HTTP | [Hosted & HTTP](#-hosted--http) |

---

## 🖥️ Claude Desktop

1. Config file path:
   - **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
   - **Windows:** `%APPDATA%\claude\claude_desktop_config.json`
   - **Linux:** `~/.config/claude/claude_desktop_config.json`

2. Register the server; put connection settings in `env` (see [Configuration](#configuration); full profile JSON in [configuration-samples.md](docs/configuration-samples.md)). The example below includes **`HANA_INSTANCE_NUMBER`** / **`HANA_DATABASE_NAME`** for **MDC**—remove them if you use a single-container database.

```json
{
  "mcpServers": {
    "HANA Database": {
      "command": "npx",
      "args": ["-y", "hana-mcp-server"],
      "env": {
        "HANA_HOST": "your-hana-host.com",
        "HANA_PORT": "443",
        "HANA_USER": "your-username",
        "HANA_PASSWORD": "your-password",
        "HANA_SCHEMA": "your-schema",
        "HANA_SSL": "true",
        "HANA_ENCRYPT": "true",
        "HANA_VALIDATE_CERT": "true",
        "HANA_CONNECTION_TYPE": "auto",
        "HANA_INSTANCE_NUMBER": "10",
        "HANA_DATABASE_NAME": "HQQ",
        "LOG_LEVEL": "info",
        "ENABLE_FILE_LOGGING": "true",
        "ENABLE_CONSOLE_LOGGING": "false"
      }
    }
  }
}
```

If the CLI is on `PATH`, you may use `"command": "hana-mcp-server"` and omit `args`.

3. Restart Claude Desktop.

**Optional:** [HANA MCP UI](https://www.npmjs.com/package/hana-mcp-ui) — `npx hana-mcp-ui` for editing envs and deploying to Claude Desktop.

---

## 💻 IDEs & code agents

**stdio** only; same `env` keys as above. **Canonical example — Claude Code** (`~/.claude.json` or project `.mcp.json`). The `env` block below includes **`HANA_DATABASE_NAME`** for **MDC tenant** HANA; omit it for most single-container setups.

```json
{
  "mcpServers": {
    "hana": {
      "type": "stdio",
      "timeout": 600,
      "command": "npx",
      "args": ["-y", "hana-mcp-server"],
      "env": {
        "HANA_HOST": "<host>",
        "HANA_PORT": "31013",
        "HANA_USER": "<user>",
        "HANA_PASSWORD": "<password>",
        "HANA_SCHEMA": "SAPABAP1",
        "HANA_DATABASE_NAME": "HQQ",
        "HANA_SSL": "false",
        "HANA_ENCRYPT": "false",
        "HANA_VALIDATE_CERT": "false",
        "LOG_LEVEL": "info",
        "ENABLE_FILE_LOGGING": "true",
        "ENABLE_CONSOLE_LOGGING": "false"
      }
    }
  }
}
```

Use the same `command`, `args`, and `env` in VS Code, Cline, Cursor, and Windsurf. After any change to `env`, restart the MCP server connection in the IDE.

---

## 🌐 Hosted & HTTP

Run the HTTP transport **from a checkout of this repository** (after `npm install`). The published `npx hana-mcp-server` path is **stdio** only.

```bash
npm run start:http
```

**Cursor / local IDE over HTTP:** set `HANA_*` in the shell (or process manager) that runs `start:http`, then add an HTTP MCP entry with `url` `http://127.0.0.1:3100/mcp` (`"type": "fetch"` or `"type": "http"`, depending on Cursor version). See [docs/local-http-mcp.md](docs/local-http-mcp.md) and `./scripts/start-http-mcp.sh`.

| Topic | Detail |
|--------|--------|
| Endpoint | `POST` JSON-RPC to `/mcp` (default base `http://127.0.0.1:3100`) |
| Tuning | `MCP_HTTP_HOST`, `MCP_HTTP_PORT` |
| Health | `GET /health` → `200` |
| CORS | `MCP_HTTP_ALLOWED_ORIGINS` — [ENVIRONMENT.md §7](docs/ENVIRONMENT.md#7-http-transport-npm-run-starthttp) |

### Optional Bearer JWT (OAuth2 / OIDC)

| Variable | Role |
|----------|------|
| `MCP_HTTP_AUTH_ENABLED` | `true` → require `Authorization: Bearer <token>` on `POST /mcp` |
| `MCP_HTTP_JWT_ISSUER` | Issuer / JWKS (omit on **SAP BTP** with bound XSUAA) |
| `MCP_HTTP_JWT_AUDIENCE` | Optional expected `aud` |
| `MCP_HTTP_JWT_SCOPES_REQUIRED` | Optional scope list |

**SAP BTP:** bind XSUAA, `MCP_HTTP_AUTH_ENABLED=true`, assign role collections. Details: [ENVIRONMENT.md §7](docs/ENVIRONMENT.md#7-http-transport-npm-run-starthttp).

---

## 🔒 Security

- **Secrets:** `HANA_PASSWORD`, JWT material, and URLs with embedded credentials belong in env or a secret manager — not in git.
- **Supply chain:** Prefer **`npx -y`** from the published package in CI and shared desktops instead of a mutable global install.
- **HTTP:** Enable JWT validation for anything beyond localhost; put the service behind a reverse proxy for TLS termination and network policy.

Further notes: [ENVIRONMENT.md §9](docs/ENVIRONMENT.md#9-security-notes).

---

## 🎯 Capabilities

| Area | What callers get |
|------|-------------------|
| **Schema** | Paged schema/table lists, column metadata, connectivity checks |
| **SQL** | Parameterized execution; caps on SELECT/WITH rows, columns, and cell size; optional totals and continuation via `hana_query_next_page` where supported |
| **Resources** | `hana:///` URIs for list/read; large payloads flagged with `truncated` metadata |
| **Domain knowledge (optional)** | JSON overlay for **`hana_explain_table`** — [configuration-samples.md](docs/configuration-samples.md) |

---

## 🛠️ Configuration

Variables apply to **stdio** (`env` in the client config) and **HTTP** (process environment). **Restart** after changes.

**Source of truth for names, defaults, and clamp ranges:** [docs/ENVIRONMENT.md](docs/ENVIRONMENT.md).  
**Copy-paste connection JSON (single-container / MDC):** [docs/configuration-samples.md#connection-profiles-env-json](docs/configuration-samples.md#connection-profiles-env-json).

### Required

| Parameter | Description | Example |
|-----------|-------------|---------|
| `HANA_HOST` | Hostname or IP | `hana.company.com` |
| `HANA_USER` | Database user | `DBADMIN` |
| `HANA_PASSWORD` | Database password | *(secret)* |

### Connection & TLS

| Parameter | Default | Notes |
|-----------|---------|--------|
| `HANA_PORT` | `443` | MDC SQL ports often `3NN13` (e.g. `31013`) |
| `HANA_SCHEMA` | — | Default when a tool omits `schema_name` |
| `HANA_CONNECTION_TYPE` | `auto` | `auto`, `single_container`, `mdc_system`, `mdc_tenant` |
| `HANA_INSTANCE_NUMBER` | — | MDC instance id (e.g. `10`) |
| `HANA_DATABASE_NAME` | — | **Tenant** name for MDC (e.g. `HQQ`, `HQP`) — session database only |
| `HANA_SSL` / `HANA_ENCRYPT` / `HANA_VALIDATE_CERT` | `true` | TLS and cert validation flags for the driver |

### Logging

| Parameter | Default | Notes |
|-----------|---------|--------|
| `LOG_LEVEL` | `info` | `error` … `debug` |
| `ENABLE_FILE_LOGGING` | `false`* | `true` enables file logs |
| `ENABLE_CONSOLE_LOGGING` | `true` | Often `false` for stdio to reduce stderr noise |

\*Code default; examples frequently set file logging to `true`.

### Limits (queries, lists, resources)

| Parameter | Default | Purpose |
|-----------|---------|---------|
| `HANA_MAX_RESULT_ROWS` | `50` | Max rows per `hana_execute_query` page (SELECT/WITH) |
| `HANA_MAX_RESULT_COLS` | `50` | Max columns per row returned |
| `HANA_MAX_CELL_CHARS` | `200` | Truncate long cell text |
| `HANA_QUERY_DEFAULT_OFFSET` | `0` | Default `offset` |
| `HANA_LIST_DEFAULT_LIMIT` | `200` | List tools: default and max page size |
| `HANA_RESOURCE_LIST_MAX_ITEMS` | `500` | Cap embedded names in `hana:///` payloads |
| `HANA_QUERY_SNAPSHOT_TTL_MS` | `300000` | Snapshot id lifetime for query paging |

### Business / domain JSON (`HANA_SEMANTICS_*`)

| Parameter | Default | Purpose |
|-----------|---------|---------|
| `HANA_SEMANTICS_PATH` | — | File path to dictionary JSON (wins over URL) |
| `HANA_SEMANTICS_URL` | — | HTTPS URL to same format |
| `HANA_SEMANTICS_TTL_MS` | `60000` | Cache / reload behavior |

Samples: [configuration-samples.md](docs/configuration-samples.md).

---

## 🔧 Troubleshooting

| Symptom | Check |
|---------|--------|
| Connection refused | `HANA_HOST`, `HANA_PORT`, network path |
| Auth failed / no client | Password, user, **`HANA_DATABASE_NAME`** on tenants; use connection test tool for driver message |
| TLS errors | `HANA_VALIDATE_CERT`, trust store |
| Wrong or empty objects | MDC: tenant drives visibility; identical schema names can differ by tenant |
| SQL needs another database prefix | `hana_execute_query` does not rewrite SQL; use the three-part names your HANA expects (e.g. `HSP.SAPABAP1.TABLE`) while `HANA_DATABASE_NAME` stays the tenant you connect to (e.g. `HQP`) |

**Debug:** `LOG_LEVEL=debug`, `ENABLE_CONSOLE_LOGGING=true`, restart.

---

## 🖥️ HANA MCP UI

```bash
npx hana-mcp-ui
```

![HANA MCP UI](docs/hana_mcp_ui.gif)

---

## 🏗️ Architecture

![HANA MCP Server Architecture](docs/hana_mcp_architecture.svg)

```
hana-mcp-server/
├── src/
│   ├── server/           # MCP lifecycle, resources, HTTP transport
│   ├── tools/            # Schema, table, query, index, config tools
│   ├── database/         # HANA client, connection manager, executor, query runner
│   ├── semantics/        # Optional semantics / domain JSON loader
│   ├── utils/            # Logger, config, validators, formatters
│   ├── query-snapshot-store.js
│   └── constants/        # MCP constants, tool definitions
├── tests/
├── docs/                 # README index, ENVIRONMENT.md, configuration-samples.md, diagrams
└── hana-mcp-server.js    # stdio entry point
```

---

## 📦 Package

| | |
|--|--|
| **Runtime** | Node.js 18+ |
| **Platforms** | macOS, Linux, Windows |
| **Dependencies** | `@sap/hana-client`, `axios`, `jose` |

---

## 🤝 Support

- **Issues:** [GitHub Issues](https://github.com/hatrigt/hana-mcp-server/issues)
- **UI:** [HANA MCP UI](https://www.npmjs.com/package/hana-mcp-ui)

## 📄 License

MIT — see [LICENSE](LICENSE).
