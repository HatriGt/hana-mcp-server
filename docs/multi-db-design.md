# Multi-Database Support (single app, per-request DB selection)

> **Status:** Implemented on this branch (tests: `tests/automated/test-multi-db.js`).
> **Branch:** `feat/multi-db-personal`
> **Scope:** Personal/self-hosted use. Lets one BTP app instance serve several HANA
> databases, with the MCP client choosing the target per call, to avoid running (and
> paying for) one BTP app per database.

## 1. Goal

Today the server connects to **one** HANA database, taken from flat `HANA_*` environment
variables at boot. This design raises that one level: the app holds **multiple** database
credentials in its environment, and the **MCP client selects the target database on every
tool call** via a `database` parameter. Each database carries its own **CRUD permissions**.

Non-goals: this is not multi-tenant SaaS, not per-user credential isolation, and not a
replacement for XSUAA. It is a cost optimization for a single trusted operator.

## 2. Current architecture (what changes)

```
mcp-handler.handleToolsCall
  → ToolRegistry.validateToolArgs(name, args)
  → ToolRegistry.executeTool(name, args)
     → <tool>.execute(args)
        → queryExecutor.* → connectionManager.withConnection(fn)
             → createHanaClient(config)            // config = singleton, env-derived
             → ConnectionPool (one, global)
  DML gate: config.getQueryLimits() {allowInsert, allowUpdate, allowDelete}
            → Validators.validateDmlRestrictions(sql, limits)
```

Two singletons make the DB implicit and global:
- `src/utils/config.js` — reads env **once** into `config.hana` + `config.server`.
- `src/database/connection-manager.js` — a **single** pool bound to that one config.

To support multiple DBs selected per request, the database must become **request-scoped**
rather than process-global.

## 3. Target architecture

```
mcp-handler.handleToolsCall
  → validate required args.database against profile keys           [NEW]
  → runWithProfile(profile, () => executeTool(name, args))          [NEW: AsyncLocalStorage]
       → <tool>.execute(args)
          → queryExecutor → connectionManager.withConnection(fn)
               → pool = pools.get(profile.key)   // per-profile pool  [CHANGED]
               → createHanaClient(profile)        // per-profile creds [CHANGED]
  DML gate: profile.permissions {insert, update, delete}             [CHANGED]
            → Validators.validateDmlRestrictions(sql, permissions)
```

### 3.1 Profile registry (env)

A single JSON env var holds all database profiles:

```jsonc
// HANA_DATABASES
{
  "salesqa": {
    "host": "10.0.0.1", "port": 443, "user": "MCP_RO", "password": "***",
    "databaseName": "HSQ", "schema": "SAPABAP1", "connectionType": "mdc_tenant",
    "encrypt": true, "validateCert": true,
    "permissions": { "insert": false, "update": false, "delete": false }
  },
  "salesprod": {
    "host": "10.0.0.2", "port": 443, "user": "MCP_RO", "password": "***",
    "databaseName": "HQP", "schema": "SAPABAP1", "connectionType": "mdc_tenant",
    "encrypt": true, "validateCert": true,
    "permissions": { "insert": false, "update": false, "delete": false }
  }
}
```

Rules:
- **Key** = the profile name the client passes as `database` (case-sensitive; `[a-zA-Z0-9_-]`).
- Per-field defaults mirror the current flat config (`port` 443, `encrypt`/`validateCert`
  true, `connectionType` `auto`).
- **`permissions`** is the per-DB CRUD gate. Read is always allowed. Any of
  `insert`/`update`/`delete` omitted ⇒ `false` (default-deny writes). **Full CRUD** is
  supported: a profile may set `delete: true` to permit `DELETE`/`TRUNCATE`.
- Parsing failure (bad JSON, missing required host/user/password in a profile) fails
  **fast at boot** with a clear error naming the offending profile — never silently.

### 3.2 Backward compatibility

If `HANA_DATABASES` is absent, the server builds a single implicit profile named `default`
from the existing flat `HANA_*` vars and the existing `HANA_ALLOW_INSERT/UPDATE/DELETE`
flags. Existing deployments keep working unchanged and no `database` parameter is
added. The current BTP deployment (`mta.yaml`) is unaffected until its env
is migrated.

### 3.3 The `database` parameter

- Added as an **optional** property to every DB-touching tool's input schema in
  `src/constants/tool-definitions.js`, described as "Target database profile".
- Populated as an **enum** of the configured profile keys at startup so clients can
  discover valid values from `tools/list`.
- **Required** in multi-database mode: a call without `database` is rejected
  (`Missing required parameters: database`) before any connection attempt. There is no
  implicit default, so a prod database is never hit by accident.
- Unknown key ⇒ validation error listing the valid keys.
- `hana_show_env_vars` and `hana_list_databases` never touch a DB and take no `database`.
- In single-database mode the parameter is not added at all.

### 3.4 Request-scoped profile via AsyncLocalStorage

To avoid threading a `profile` argument through every tool and executor signature, a single
`AsyncLocalStorage` holds the resolved profile for the lifetime of one `tools/call`:

- `src/server/mcp-handler.js` resolves the profile and wraps execution:
  `dbContext.run(profile, () => ToolRegistry.executeTool(name, args))`.
- `connection-manager.js` and `config.js` read the active profile from the store.
- Concurrency-safe: each inbound HTTP request runs in its own async context, so
  simultaneous calls to different databases never cross wires. (Node ≥ 16; we run 20.)

A thin accessor module (`src/database/db-context.js`) owns the store and exposes
`getActiveProfile()` / `runWithProfile()`.

### 3.5 Per-profile connection pools

`connection-manager.js` changes from one pool to `Map<profileKey, ConnectionPool>`:
- `withConnection(fn)` reads the active profile, lazily creates that profile's pool, and
  acquires from it.
- `createHanaClient(profileConfig)` and `getConnectionParams(profileConfig)` /
  `getHanaDatabaseType(profileConfig)` take the profile instead of the global singleton.
- Pool size stays global (`HANA_CONNECTION_POOL_SIZE`), applied per profile.
- `disconnect()` drains all pools on shutdown.

### 3.6 DML gate becomes per-profile

`config.getQueryLimits()` returns the **active profile's** `permissions` for
`allowInsert/allowUpdate/allowDelete`. Caps and timeouts are global by default; a profile
may override them with an optional `limits` object:

```jsonc
"limits": { "maxResultRows": 100, "maxResultCols": 50, "maxCellChars": 200,
            "queryTimeoutMs": 30000, "listDefaultLimit": 200, "queryLimitsEnabled": true }
```

Setting any result cap (`maxResultRows`, `maxResultCols`, `maxCellChars`) on a profile
switches query limits on for that profile unless `queryLimitsEnabled` is explicitly
`false`. TTLs and `resourceListMaxItems` stay global. Blocked-write errors name the
profile, e.g. `INSERT operations are not enabled on database "prod" (enable "insert" in
HANA_DATABASES["prod"].permissions to permit)`. `Validators.validateDmlRestrictions` is unchanged — it already takes a permissions
object. First-keyword checks keep their current caveats (e.g. `CALL`/DDL not covered).

### 3.7 New tool: `hana_list_databases`

Returns the configured profile keys with, per profile: non-secret target (host, port,
`databaseName`, `schema`, `connectionType`), resolved `permissions`, and effective
`limits`. Lets an agent discover what to pass as `database`. Never returns user/password.

### 3.8 Config/visibility tools

- `hana_show_config` reports the selected profile and its permissions; secrets stay masked.
- `hana_test_connection` tests the active profile.
- `hana_show_env_vars` shows `HANA_DATABASES` only as `SET (N profiles: a, b)` — never the JSON.
- `hana_query_next_page`: snapshots are bound to the database they came from; paging
  with a different `database` is rejected.
- Startup validation checks every profile.
- **Limitation:** MCP *resources* (`hana:///schemas…`) take no arguments, so in
  multi-database mode they return "No database selected". Use the tools instead.

## 4. Files touched (estimate)

| File | Change |
|------|--------|
| `src/utils/config.js` | Parse `HANA_DATABASES`; build profiles; `default` fallback; profile-aware getters. |
| `src/database/db-context.js` | **New.** AsyncLocalStorage accessor. |
| `src/database/connection-manager.js` | Per-profile pool map; profile-aware `withConnection`/`testConnection`. |
| `src/database/hana-client.js` | `createHanaClient(profileConfig)`. |
| `src/server/mcp-handler.js` | Resolve profile per `tools/call`; wrap in `runWithProfile`. |
| `src/constants/tool-definitions.js` | Add required `database` to schemas; new `hana_list_databases`. |
| `src/query-snapshot-store.js`, `src/tools/query-tools.js` | Bind snapshots to their database. |
| `src/utils/validators.js` | Profile-aware blocked-write messages. |
| `src/tools/*` | Discovery tool impl; config tools read active profile. |
| `src/utils/sensitive-redact.js` | Redact passwords inside the JSON blob. |
| `docs/multi-db-design.md` | This document (configuration reference for the feature). |
| `tests/automated/*` | Profile parsing, resolution, per-profile DML gate, redaction. |

## 5. Security considerations

- **Blast radius.** One app now holds credentials for every configured database behind a
  **single** bearer/XSUAA token. Anyone with that token can reach any profile, subject only
  to its CRUD flags. This is the explicit cost tradeoff. Keep the token tightly held and
  rotate it if exposed.
- **Least privilege at the DB.** Prefer dedicated HANA technical users per profile with
  only the grants that profile needs; do not reuse a personal/admin account.
- **Default-deny writes.** All write permissions default to `false`. `delete: true` must be
  set explicitly and should be rare. Consider leaving prod profiles fully read-only.
- **No secret leakage.** Passwords are redacted from logs, `hana_show_env_vars`,
  `hana_show_config`, and `hana_list_databases`. The JSON blob is never echoed.
- **DML gate is first-keyword only.** It does not catch write-capable `CALL`/procedures or
  DDL; a read-only DB user remains the real safeguard.
- **Audit.** If `HANA_AUDIT_ENABLED`, include the active profile key in audit records.

## 6. Rollout

1. Implement behind backward-compatible config (no `HANA_DATABASES` ⇒ current behavior).
2. Add tests; verify single-profile path is unchanged.
3. For personal use: set `HANA_DATABASES` on the BTP app (section 8) and have clients
   pass `database` per call.
4. Keep this off the shared/production deployment unless the team adopts it.

## 7. Decisions

- `database` is **required** in multi-database mode (no default).
- Caps/timeouts: **global defaults with optional per-profile overrides**.
- Full CRUD per profile; all writes default to `false`.

Open: cap the number of profiles / total pool connections to bound memory on the 512M
app (each profile opens up to `HANA_CONNECTION_POOL_SIZE` connections on first use).

## 8. Configuring on BTP

Do **not** put `HANA_DATABASES` in `mta.yaml` — that would commit passwords. Keep the JSON
in a local, git-ignored file and set it on the app:

```bash
cf set-env hana-mcp-server HANA_DATABASES "$(cat ~/secure/hana-databases.json)"
cf restage hana-mcp-server
```

Remove the flat `HANA_HOST/USER/PASSWORD…` vars once `HANA_DATABASES` is in place (they
are ignored in multi-database mode). Clients then pass `database` on every call; an agent
can call `hana_list_databases` first to discover the values.
