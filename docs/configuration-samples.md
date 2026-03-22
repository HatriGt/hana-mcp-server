# Configuration samples

Copy-paste examples for **connection profiles** and **optional business/domain JSON**. Authoritative variable names, defaults, and limits are in [ENVIRONMENT.md](ENVIRONMENT.md).

## Contents

- [Connection profiles (env JSON)](#connection-profiles-env-json)
- [Business and domain knowledge (`hana_explain_table`)](#business-and-domain-knowledge-hana_explain_table)
- [Query caps and paging (pointer)](#query-caps-and-paging-pointer)

---

## Connection profiles (env JSON)

Use these key/value sets inside your MCP client’s `env` object (same shape for Claude Desktop, Claude Code, VS Code, etc.). Adjust host, ports, and credentials for your landscape.

### Single-container

**Required:** `HANA_HOST`, `HANA_USER`, `HANA_PASSWORD`. **Optional:** `HANA_PORT`, `HANA_SCHEMA`.

```json
{
  "HANA_HOST": "hana.company.com",
  "HANA_PORT": "443",
  "HANA_USER": "DBADMIN",
  "HANA_PASSWORD": "password",
  "HANA_SCHEMA": "SYSTEM",
  "HANA_CONNECTION_TYPE": "single_container"
}
```

### MDC system database

**Required:** `HANA_HOST`, `HANA_PORT`, `HANA_INSTANCE_NUMBER`, `HANA_USER`, `HANA_PASSWORD`.

```json
{
  "HANA_HOST": "192.168.1.100",
  "HANA_PORT": "31013",
  "HANA_INSTANCE_NUMBER": "10",
  "HANA_USER": "SYSTEM",
  "HANA_PASSWORD": "password",
  "HANA_SCHEMA": "SYSTEM",
  "HANA_CONNECTION_TYPE": "mdc_system"
}
```

### MDC tenant database

**Required:** `HANA_HOST`, `HANA_PORT`, `HANA_INSTANCE_NUMBER`, `HANA_DATABASE_NAME`, `HANA_USER`, `HANA_PASSWORD`.

```json
{
  "HANA_HOST": "192.168.1.100",
  "HANA_PORT": "31013",
  "HANA_INSTANCE_NUMBER": "10",
  "HANA_DATABASE_NAME": "HQQ",
  "HANA_USER": "DBADMIN",
  "HANA_PASSWORD": "password",
  "HANA_SCHEMA": "SYSTEM",
  "HANA_CONNECTION_TYPE": "mdc_tenant"
}
```

### Auto-detection (`HANA_CONNECTION_TYPE=auto`, default)

| Condition | Inferred type |
|-----------|----------------|
| `HANA_INSTANCE_NUMBER` + `HANA_DATABASE_NAME` | MDC tenant |
| `HANA_INSTANCE_NUMBER` only | MDC system |
| Neither | Single-container |

Omit `HANA_CONNECTION_TYPE` or set it to `auto` to use the table above.

---

## Business and domain knowledge (`hana_explain_table`)

In code and env vars this is **semantics**: a **curated overlay** on HANA’s physical schema (descriptions, status/code maps). Same idea as a **data dictionary** or small **custom knowledge file** in JSON—not embeddings or RAG.

The server expects a top-level **`tables`** object. **`HANA_SEMANTICS_PATH`** (file) wins over **`HANA_SEMANTICS_URL`** when both are set.

### Table key lookup

For schema `MySchema` and table `MY_TABLE`, lookup order:

1. If `catalog_database` (or `HANA_METADATA_CATALOG_DATABASE`) is set when calling `hana_explain_table`: `Db.MySchema.MY_TABLE`, then uppercased variant.
2. `MySchema.MY_TABLE`
3. `MYSCHEMA.MY_TABLE` (uppercased)
4. `MY_TABLE` (table name only)

Prefer `SCHEMA.TABLE` keys aligned with HANA; use `DB.SCHEMA.TABLE` when semantics apply to objects in another MDC database.

### Column overlay fields

| Field | Role |
|-------|------|
| `description` or `meaning` | Exposed as `semantics.description` in tool output |
| `values` or `enum` | Code → label map as `semantics.values` |

HANA column comments stay in `dbComments`; semantics add your curated layer.

### Example: `hana-semantics.json`

```json
{
  "tables": {
    "SAPABAP1.ZSALES_HEADER": {
      "description": "Sales order header; one row per order.",
      "columns": {
        "STATUS": {
          "description": "Order lifecycle status.",
          "values": {
            "N": "New",
            "O": "Open",
            "F": "Fulfilled",
            "C": "Cancelled"
          }
        },
        "DOCTYPE": {
          "meaning": "SD document category.",
          "enum": { "A": "Inquiry", "B": "Quotation", "C": "Order" }
        }
      }
    },
    "SAPABAP1.ZSALES_ITEM": {
      "description": "Sales order line items.",
      "columns": {
        "REJECTION_REASON": {
          "description": "Rejection code when line is not fulfilled.",
          "values": { "01": "Credit block", "02": "Out of stock", "99": "Other" }
        }
      }
    }
  }
}
```

### MCP `env`: local file (`HANA_SEMANTICS_PATH`)

Paths resolve from the **server process working directory**.

```json
{
  "HANA_SEMANTICS_PATH": "/etc/hana-mcp/hana-semantics.json",
  "HANA_SEMANTICS_TTL_MS": "120000"
}
```

```json
{
  "HANA_SEMANTICS_PATH": "./config/hana-semantics.json"
}
```

### MCP `env`: hosted JSON (`HANA_SEMANTICS_URL`)

Use when **`HANA_SEMANTICS_PATH`** is unset. Server `GET`s the URL; response must be HTTP 2xx JSON.

```json
{
  "HANA_SEMANTICS_URL": "https://config.example.com/tenant-prod/hana-semantics.json",
  "HANA_SEMANTICS_TTL_MS": "300000"
}
```

Sensitive dictionaries: use HTTPS, network restrictions, or signed URLs. There is no env-based auth header for the semantics URL.

### Caching

- **`HANA_SEMANTICS_TTL_MS`**: in-memory TTL for URL and file (when TTL > 0). **`0`**: URL refetched as needed; file still reloads on mtime change.
- Restart MCP after changing semantics env vars.

---

## Query caps and paging (pointer)

Relevant variables: `HANA_MAX_RESULT_ROWS`, `HANA_MAX_RESULT_COLS`, `HANA_MAX_CELL_CHARS`, `HANA_QUERY_DEFAULT_OFFSET`, `HANA_QUERY_SNAPSHOT_TTL_MS`. Tools: `hana_execute_query` (`offset`, `maxRows`, `includeTotal`), `hana_query_next_page` when a snapshot id is returned.

**Defaults, bounds, and behavior:** [ENVIRONMENT.md §3 Query limits](ENVIRONMENT.md#3-query-result-limits-and-agent-context-mcp-tools) and [§6 Snapshots](ENVIRONMENT.md#6-paged-query-snapshots-hana_query_next_page).
