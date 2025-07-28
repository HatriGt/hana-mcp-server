# HANA MCP Server - Proof of Concept Documentation

## Overview

This Proof of Concept (POC) demonstrates a working Model Context Protocol (MCP) server for SAP HANA DB that integrates with Claude Desktop. The server allows AI agents to interact with HANA databases through natural language.

## Project Status

✅ **COMPLETED** - Working MCP server with Claude Desktop integration

## Architecture

### Components

1. **MCP Server** (`mcp-server-final.js`)
   - Node.js-based MCP server implementation
   - Uses STDIO transport for Claude Desktop communication
   - Implements JSON-RPC 2.0 protocol
   - Provides mock HANA database tools

2. **Claude Desktop Configuration** (`claude_config.json`)
   - Configuration file for Claude Desktop
   - Points to the MCP server executable
   - Enables HANA Database tools in Claude Desktop

3. **Documentation** (`README.md`, `POC_DOCUMENTATION.md`)
   - Setup instructions
   - Usage examples
   - Troubleshooting guide

### Protocol Flow

```
Claude Desktop → MCP Server (STDIO) → JSON-RPC 2.0 → Tool Execution → Response
```

## Setup Instructions

### Prerequisites

- Node.js installed (tested with `/opt/homebrew/bin/node` on macOS)
- Claude Desktop installed
- Access to the project directory

### Installation Steps

1. **Copy Configuration to Claude Desktop**:
   ```bash
   cp claude_config.json "/Users/ajeethkumar.ravichandran/Library/Application Support/Claude/claude_desktop_config.json"
   ```

2. **Make Server Executable**:
   ```bash
   chmod +x mcp-server-final.js
   ```

3. **Restart Claude Desktop**:
   - Close Claude Desktop completely
   - Wait a few seconds
   - Open Claude Desktop again

### Verification

After setup, you should see:
- "HANA Database" tool appears in Claude Desktop
- Tool shows as enabled (not disabled)
- Available tools: `hana_list_schemas`, `hana_test_connection`

## Available Tools

### 1. hana_list_schemas
- **Description**: List all schemas in the HANA database
- **Input**: None required
- **Output**: List of available schemas
- **Example Response**: "Available schemas: SCHEMA1, SCHEMA2, SCHEMA3, SYSTEM, SYS"

### 2. hana_test_connection
- **Description**: Test connection to HANA database
- **Input**: None required
- **Output**: Connection status
- **Example Response**: "Connection to HANA database is working successfully!"

## Usage Examples

### In Claude Desktop

1. **List Schemas**:
   ```
   User: "Show me the schemas in my HANA database"
   Claude: [Uses hana_list_schemas tool] → Returns schema list
   ```

2. **Test Connection**:
   ```
   User: "Test the connection to my HANA database"
   Claude: [Uses hana_test_connection tool] → Returns connection status
   ```

### Manual Testing

Test the server manually:
```bash
# Test initialization
echo '{"jsonrpc":"2.0","id":"1","method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"Claude Desktop","version":"1.0.0"}}}' | /opt/homebrew/bin/node mcp-server-final.js

# Test tools/list
echo '{"jsonrpc":"2.0","id":"2","method":"tools/list"}' | /opt/homebrew/bin/node mcp-server-final.js

# Test tools/call
echo '{"jsonrpc":"2.0","id":"3","method":"tools/call","params":{"name":"hana_list_schemas","arguments":{}}}' | /opt/homebrew/bin/node mcp-server-final.js
```

## Technical Details

### MCP Protocol Implementation

- **Protocol Version**: 2024-11-05
- **Transport**: STDIO (standard input/output)
- **Message Format**: JSON-RPC 2.0
- **Tool Schema**: Uses `inputSchema` format
- **Response Format**: `content` array with `type: "text"`

### Server Features

- **Persistent Process**: Stays alive for entire Claude Desktop session
- **Error Handling**: Proper JSON-RPC error codes
- **Logging**: Timestamped logs to stderr
- **Graceful Shutdown**: Handles SIGINT/SIGTERM signals

### File Structure

```
POC/
├── mcp-server-final.js      # Working MCP server
├── claude_config.json       # Claude Desktop configuration
├── README.md               # Basic usage instructions
└── POC_DOCUMENTATION.md    # This comprehensive documentation
```

## Troubleshooting

### Common Issues

1. **"HANA Database" shows as Disabled**
   - Check Node.js path in configuration
   - Verify server file is executable
   - Restart Claude Desktop completely

2. **"No tools available"**
   - Check server logs for errors
   - Verify MCP protocol implementation
   - Ensure server stays alive (not exiting)

3. **Server not starting**
   - Check Node.js installation
   - Verify file permissions
   - Check for port conflicts

### Debug Steps

1. **Check Server Process**:
   ```bash
   ps aux | grep mcp-server-final
   ```

2. **Test Server Manually**:
   ```bash
   echo '{"jsonrpc":"2.0","id":"1","method":"initialize"}' | /opt/homebrew/bin/node mcp-server-final.js
   ```

3. **Check Claude Desktop Logs**:
   - Look for MCP-related errors in Claude Desktop logs
   - Check for connection failures

## Development Notes

### Key Learnings

1. **MCP Protocol Requirements**:
   - Must use `tools/call` method (not `tools/execute`)
   - Tool schema must use `inputSchema` format
   - Response must use `content` array with `type: "text"`

2. **Process Management**:
   - Server must stay alive for entire session
   - Use `setInterval()` to keep event loop active
   - Handle stdin closure without exiting

3. **Claude Desktop Integration**:
   - Requires absolute paths in configuration
   - Server must respond to all required MCP methods
   - Proper error handling is essential

### Future Enhancements

1. **Real HANA Integration**:
   - Replace mock data with actual HANA client
   - Add connection pooling
   - Implement real SQL queries

2. **Additional Tools**:
   - Table listing
   - Data querying
   - Schema exploration
   - Administrative functions

3. **Production Features**:
   - Authentication
   - Connection security
   - Performance monitoring
   - Error recovery

## Success Criteria Met

✅ **MCP Server Implementation**: Working Node.js MCP server  
✅ **Claude Desktop Integration**: Tools appear and are functional  
✅ **Tool Execution**: Tools respond correctly to queries  
✅ **Protocol Compliance**: Follows MCP specification correctly  
✅ **Process Management**: Server stays alive for entire session  
✅ **Error Handling**: Proper error responses and logging  

## Conclusion

This POC successfully demonstrates:
- MCP server development for SAP HANA
- Claude Desktop integration
- Tool implementation and execution
- Protocol compliance and error handling

The foundation is solid and ready for production development with real HANA database integration.

---

**Created**: July 28, 2025  
**Status**: ✅ COMPLETED  
**Next Phase**: Production Development 