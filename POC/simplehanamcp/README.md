# HANA MCP Server

This is a Model Context Protocol (MCP) server for SAP HANA DB. It allows AI agents like Claude to interact with HANA databases through natural language.

## Quick Start

1. **Prerequisites**:
   - Node.js installed (the server uses `/opt/homebrew/bin/node` on macOS)
   - Claude Desktop installed

2. **Configure Claude Desktop**:
   - Copy the `claude_config.json` to `~/Library/Application Support/Claude/claude_desktop_config.json`
   - Restart Claude Desktop completely

3. **Use the HANA Database tool in Claude Desktop**:
   - Open Claude Desktop
   - Look for the "HANA Database" tool in the tools list
   - Use it to interact with your HANA database

## Files

- `persistent-mcp-server.js`: The main MCP server implementation (Node.js with STDIO transport)
- `claude_config.json`: Claude Desktop configuration file
- `package.json`: Node.js project configuration

## Testing

You can test the MCP server manually:

```bash
# Test initialize
echo '{"jsonrpc":"2.0","id":"1","method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"Claude Desktop","version":"1.0.0"}}}' | /opt/homebrew/bin/node persistent-mcp-server.js

# Test tools/list
echo '{"jsonrpc":"2.0","id":"2","method":"tools/list"}' | /opt/homebrew/bin/node persistent-mcp-server.js

# Test prompts/list
echo '{"jsonrpc":"2.0","id":"3","method":"prompts/list"}' | /opt/homebrew/bin/node persistent-mcp-server.js

# Test tools/execute
echo '{"jsonrpc":"2.0","id":"4","method":"tools/execute","params":{"name":"hana_test_connection","arguments":{}}}' | /opt/homebrew/bin/node persistent-mcp-server.js
```

## Troubleshooting

If the HANA Database tool doesn't appear in Claude Desktop:

1. **Check Node.js path**: Make sure `/opt/homebrew/bin/node` exists on your system
2. **Verify configuration**: Ensure `claude_config.json` is correctly copied to the Claude Desktop config directory
3. **Restart Claude Desktop**: Close and reopen Claude Desktop completely
4. **Check logs**: Look for any error messages in Claude Desktop logs

## Available Tools

- `hana_list_schemas`: Lists all schemas in the HANA database
- `hana_test_connection`: Tests the connection to the HANA database

## Development

To add more tools, edit the `persistent-mcp-server.js` file and add new tool implementations to the `tools` array and `toolImplementations` object.

## Architecture

This MCP server uses:
- **STDIO transport**: Communicates with Claude Desktop through standard input/output
- **JSON-RPC 2.0**: Follows the MCP protocol specification
- **Node.js**: Provides a robust runtime environment
- **Persistent process**: Stays alive for the entire Claude Desktop session
- **Mock data**: Currently returns sample data (can be extended to connect to real HANA database)
