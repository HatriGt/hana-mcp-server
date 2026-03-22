# Local HTTP MCP (IDE / Cursor)

The server exposes **Streamable HTTP** MCP at **`POST /mcp`** (default `http://127.0.0.1:3100/mcp`). HANA credentials apply to the **Node process** that runs the HTTP server, not to the IDE MCP entry (the IDE only needs the URL).

## 1. Start the HTTP server

From this repo root, set **`HANA_*`** the same way as for stdio MCP, then:

```bash
export MCP_HTTP_HOST=127.0.0.1
export MCP_HTTP_PORT=3100
# If your client sends an Origin header and gets 403, allow it (local dev only):
export MCP_HTTP_ALLOWED_ORIGINS='*'
npm run start:http
```

Optional: `MCP_HTTP_AUTH_ENABLED=true` and JWT / XSUAA — see [ENVIRONMENT.md §7](ENVIRONMENT.md#7-http-transport-npm-run-starthttp).

Or use the helper (defaults above):

```bash
./scripts/start-http-mcp.sh
```

Keep this terminal open while using the IDE.

## 2. Cursor `mcp.json`

Add an HTTP MCP entry pointing at the same host/port. Cursor builds vary: use **`"type": "fetch"`** or **`"type": "http"`** with the same `url` (both target Streamable HTTP to this endpoint).

```json
"hana-mcp-local-http": {
  "type": "fetch",
  "url": "http://127.0.0.1:3100/mcp"
}
```

Reload MCP servers in Cursor after editing.

## 3. Smoke checks

```bash
curl -s http://127.0.0.1:3100/mcp
curl -s -X POST http://127.0.0.1:3100/mcp \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"curl","version":"1"}}}'
```

## 4. OAuth 2.0 and Bearer JWT (optional)

The HTTP transport does **not** implement a full OAuth 2.0 **authorization-server** flow (no hosted `/authorize` or `/token` on this app). It behaves as a **resource endpoint**: callers send **`Authorization: Bearer <token>`** on **`POST /mcp`**, and when **`MCP_HTTP_AUTH_ENABLED=true`** the server validates the token as a **JWT** via **OIDC discovery** (issuer → `/.well-known/openid-configuration` → JWKS). That matches common **OAuth 2.0 bearer** usage when your IdP issues **JWT access tokens**.

| Role | Responsibility |
|------|----------------|
| **Identity provider** (Entra ID, Okta, Keycloak, SAP XSUAA, etc.) | Issues access tokens using the grant your client or gateway uses (e.g. client credentials, authorization code + PKCE). |
| **MCP client, app, or API gateway** | Obtains the token and sends it on every MCP request as `Authorization: Bearer …`. |
| **hana-mcp-server (HTTP)** | Verifies the JWT (signature, issuer; optional audience and required scopes). It does not exchange authorization codes or refresh tokens. |

**Env vars and BTP:** [ENVIRONMENT.md §7 — HTTP transport](ENVIRONMENT.md#7-http-transport-npm-run-starthttp) (`MCP_HTTP_AUTH_ENABLED`, `MCP_HTTP_JWT_ISSUER`, `MCP_HTTP_JWT_AUDIENCE`, `MCP_HTTP_JWT_SCOPES_REQUIRED`). On **SAP BTP**, a bound **XSUAA** service can supply the issuer via **`VCAP_SERVICES`** when `MCP_HTTP_JWT_ISSUER` is omitted.

**Opaque (non-JWT) access tokens:** Current validation expects a **JWT** verifiable with JWKS. Opaque tokens require either JWT access tokens from the IdP, or a **gateway** that validates opaque tokens and forwards a JWT—or terminates trust before traffic reaches this server.

**Smoke `POST` with auth enabled:** add `-H 'Authorization: Bearer <your-jwt>'` to the `curl` example in §3.

## 5. Using a local clone vs `npx`

`npm run start:http` always uses **this repo’s** `src/server/http-index.js`. To hit a different checkout, run `node src/server/http-index.js` from that directory with the same env.
