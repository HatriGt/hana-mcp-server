# HANA MCP Server Tests

This folder contains various testing approaches for the HANA MCP Server.

## Folder Structure

```
tests/
├── README.md                 # This file
├── mcpInspector/            # MCP Inspector configuration and setup
│   └── mcp-inspector-config.json
├── manual/                  # Manual testing scripts
│   └── manual-test.js
└── automated/               # Automated testing scripts
    └── test-mcp-inspector.js
```

## Testing Approaches

### 1. MCP Inspector (Recommended)
**Location**: `tests/mcpInspector/`

The MCP Inspector provides a web-based UI for testing MCP servers.

**Setup**:
1. Open https://modelcontextprotocol.io/inspector
2. Use the configuration from `mcp-inspector-config.json`
3. Connect and test tools interactively

**Configuration**:
- Command: `/opt/homebrew/bin/node`
- Arguments: `/Users/Common/ProjectsRepo/tools/hana-mcp-server/hana-mcp-server.js`
- Environment variables: See `mcp-inspector-config.json`

### 2. Manual Testing
**Location**: `tests/manual/`

Interactive command-line testing with menu-driven interface.

**Usage**:
```bash
cd tests/manual
node manual-test.js
```

### 3. Automated Testing
**Location**: `tests/automated/`

Automated test suite that runs all tools and validates responses.

**Usage**:
```bash
cd tests/automated
node test-mcp-inspector.js
```

## Environment Variables Required

All tests require these environment variables:
- `HANA_HOST`: HANA database host
- `HANA_PORT`: HANA database port (usually 443)
- `HANA_USER`: HANA database username
- `HANA_PASSWORD`: HANA database password
- `HANA_SCHEMA`: HANA database schema
- `HANA_SSL`: SSL enabled (true/false)
- `HANA_ENCRYPT`: Encryption enabled (true/false)
- `HANA_VALIDATE_CERT`: Certificate validation (true/false)

## Quick Start

1. **For interactive testing**: Use MCP Inspector
2. **For quick validation**: Run automated tests
3. **For debugging**: Use manual testing 