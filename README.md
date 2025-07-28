# HANA MCP Server

A Model Context Protocol (MCP) server for SAP HANA database integration with AI agents like Claude Desktop.

## 🚀 Features

- **Real HANA Database Integration**: Connect to actual SAP HANA databases
- **Schema Exploration**: List schemas, tables, columns, and indexes
- **Query Execution**: Execute SQL queries with parameterized support
- **Administrative Tools**: System information, user management, and monitoring
- **Configuration Management**: Environment-based configuration with secure credential handling
- **Graceful Fallback**: Mock tools for testing when database connection is unavailable
- **Clean JSON-RPC**: Proper MCP protocol implementation without interference

## 📋 Prerequisites

- Node.js 18+ 
- SAP HANA database access
- Claude Desktop (for AI agent integration)

## 🛠️ Installation

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd hana-mcp-server
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Make the server executable**:
   ```bash
   chmod +x hana-mcp-server.js
   ```

## ⚙️ Configuration

### Environment Variables

Create a configuration file or set environment variables:

```bash
# Required HANA Database Configuration
export HANA_HOST="your-hana-host.com"
export HANA_PORT="443"
export HANA_USER="your-username"
export HANA_PASSWORD="your-password"
export HANA_SCHEMA="your-schema"

# Optional Configuration
export HANA_SSL="true"
export HANA_ENCRYPT="true"
export HANA_VALIDATE_CERT="true"

# Logging Configuration
export LOG_LEVEL="info"
export ENABLE_FILE_LOGGING="true"
export ENABLE_CONSOLE_LOGGING="false"
```

### Claude Desktop Configuration

Create `~/.config/claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "HANA Database": {
      "command": "/opt/homebrew/bin/node",
      "args": [
        "/path/to/hana-mcp-server/hana-mcp-server.js"
      ],
      "env": {
        "HANA_HOST": "your-hana-host.com",
        "HANA_PORT": "443",
        "HANA_USER": "your-username",
        "HANA_PASSWORD": "your-password",
        "HANA_SCHEMA": "your-schema",
        "HANA_SSL": "true",
        "LOG_LEVEL": "info",
        "ENABLE_FILE_LOGGING": "true",
        "ENABLE_CONSOLE_LOGGING": "false"
      }
    }
  }
}
```

## 🚀 Usage

### Quick Start

1. **Configure your HANA database details** in the Claude Desktop configuration
2. **Restart Claude Desktop**
3. **Test the connection** using the `hana_test_connection` tool
4. **Explore your database** using the available tools

### Available Tools

#### Configuration Tools
- `hana_show_config` - Display current HANA configuration
- `hana_test_connection` - Test database connectivity
- `hana_show_env_vars` - Show environment variables (debugging)

#### Schema Exploration Tools
- `hana_list_schemas` - List all database schemas
- `hana_list_tables` - List tables in a schema
- `hana_describe_table` - Show table structure and metadata
- `hana_list_indexes` - List indexes for a table
- `hana_describe_index` - Show index details

#### Query Execution Tools
- `hana_execute_query` - Execute SQL queries
- `hana_execute_parameterized_query` - Execute parameterized queries
- `hana_get_sample_data` - Get sample data from a table
- `hana_count_rows` - Count rows in a table

#### Administrative Tools
- `hana_get_system_info` - Get system information
- `hana_get_user_info` - Get current user information
- `hana_get_memory_usage` - Get memory usage statistics

## 🧪 Testing

The project includes comprehensive testing tools organized in the `tests/` folder:

### 1. MCP Inspector (Recommended)
Web-based UI for interactive testing:
```bash
# Open MCP Inspector
open https://modelcontextprotocol.io/inspector

# Use configuration from tests/mcpInspector/mcp-inspector-config.json
```

### 2. Automated Testing
Run automated test suite:
```bash
cd tests/automated
node test-mcp-inspector.js
```

### 3. Manual Testing
Interactive command-line testing:
```bash
cd tests/manual
node manual-test.js
```

### 4. Quick Manual Testing
Test the server manually:

```bash
# Test initialization
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}' | node hana-mcp-server.js

# Test tools listing
echo '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}' | node hana-mcp-server.js
```

### Integration Testing

1. **Start Claude Desktop** with the MCP configuration
2. **Ask Claude** to test the HANA connection
3. **Verify tools** are available and functional

See `tests/README.md` for detailed testing documentation.

## 🔧 Development

### Project Structure

```
hana-mcp-server/
├── hana-mcp-server.js          # Main MCP server implementation
├── src/
│   └── hana-client.js          # HANA database client wrapper
├── POC/                        # Proof of Concept implementations
│   ├── simplehanamcp/          # Simple working POC
│   └── hanamcpwithparams/      # POC with environment variables
├── package.json                # Node.js dependencies
├── .gitignore                  # Git ignore rules
└── README.md                   # This file
```

### Key Components

#### `hana-mcp-server.js`
- Main MCP server implementation
- JSON-RPC 2.0 protocol handling
- Tool registration and execution
- Environment variable configuration
- Graceful error handling

#### `src/hana-client.js`
- SAP HANA database connection wrapper
- Query execution utilities
- Connection management
- Error handling

### Adding New Tools

1. **Define the tool** in the `tools` object:
   ```javascript
   my_new_tool: {
     description: "Description of the tool",
     inputSchema: {
       type: "object",
       properties: {
         // Define input parameters
       },
       required: []
     },
     readOnly: true, // or false
     async handler(args) {
       // Tool implementation
       return {
         content: [
           {
             type: "text",
             text: "Tool result"
           }
         ]
       };
     }
   }
   ```

2. **Test the tool** using Claude Desktop

## 🐛 Troubleshooting

### Common Issues

#### "MCP server not visible"
- Check Claude Desktop configuration path
- Verify Node.js executable path
- Ensure server file is executable

#### "Tools disabled"
- Check JSON-RPC protocol implementation
- Verify tool structure matches MCP specification
- Review server logs for errors

#### "Connection failed"
- Verify HANA database credentials
- Check network connectivity
- Ensure HANA client libraries are installed

#### "Handler is not a function"
- Check tool definition structure
- Verify handler function is properly defined
- Review tool registration process

### Debugging

#### Enable File Logging
```bash
export ENABLE_FILE_LOGGING="true"
export LOG_LEVEL="debug"
```

#### Check Logs
```bash
tail -f hana-mcp-server.log
```

#### Test Server Manually
```bash
# Test with environment variables
HANA_HOST="test" HANA_USER="test" HANA_PASSWORD="test" node hana-mcp-server.js
```

## 📚 MCP Protocol

This server implements the Model Context Protocol (MCP) specification:

- **JSON-RPC 2.0**: All communication uses JSON-RPC 2.0
- **STDIO Transport**: Communication via stdin/stdout
- **Tool Discovery**: Automatic tool listing and registration
- **Error Handling**: Proper error codes and messages

### Supported Methods

- `initialize` - Server initialization
- `tools/list` - List available tools
- `tools/call` - Execute tools
- `prompts/list` - List available prompts
- `notifications/initialized` - Handle initialization notification

## 🤝 Contributing

1. **Fork the repository**
2. **Create a feature branch**
3. **Make your changes**
4. **Test thoroughly**
5. **Submit a pull request**

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- SAP for HANA database technology
- Anthropic for Claude Desktop and MCP specification
- The MCP community for protocol development

## 📞 Support

For issues and questions:
- Check the troubleshooting section
- Review the POC implementations
- Test with manual commands
- Check server logs for detailed error information

---