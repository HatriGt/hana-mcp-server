#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
export MCP_HTTP_HOST="${MCP_HTTP_HOST:-127.0.0.1}"
export MCP_HTTP_PORT="${MCP_HTTP_PORT:-3100}"
# IDE clients may send Origin; * is for local dev only.
export MCP_HTTP_ALLOWED_ORIGINS="${MCP_HTTP_ALLOWED_ORIGINS:-*}"
# Finance FI-CA semantics for hana_explain_table (override with HANA_SEMANTICS_PATH).
export HANA_SEMANTICS_PATH="${HANA_SEMANTICS_PATH:-$ROOT/config/finance-fi-ca-semantics.json}"
export HANA_SEMANTICS_TTL_MS="${HANA_SEMANTICS_TTL_MS:-0}"
exec node src/server/http-index.js
