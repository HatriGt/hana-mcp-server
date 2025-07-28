# HANA MCP Server

A Model Context Protocol (MCP) server for SAP HANA database integration with AI agents like Claude Desktop.

## 🚀 Features

- **Real HANA Database Integration**: Connect to actual SAP HANA databases
- **Schema Exploration**: List schemas, tables, columns, and indexes
- **Query Execution**: Execute SQL queries with parameterized support
- **Administrative Tools**: System information, user management, and monitoring
- **Configuration Management**: Environment-based configuration with secure credential handling
- **Modular Architecture**: Clean, maintainable codebase with separation of concerns
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
export HANA_SCHEMA="your-default-schema"  # Used as default for tools that require schema_name

# Optional Configuration
export HANA_SCHEMA="your-default-schema"  # Used as default for tools that require schema_name
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

## 🏗️ Architecture

The HANA MCP Server is built with a modular, maintainable architecture that follows Node.js best practices. The design separates concerns, improves testability, and ensures long-term maintainability.

### Project Structure:
```
hana-mcp-server/
├── hana-mcp-server.js          # Main entry point (thin wrapper)
├── src/                        # Source code
│   ├── server/                 # Server layer
│   │   ├── index.js            # Main server entry point
│   │   ├── mcp-handler.js      # MCP protocol handler
│   │   └── lifecycle-manager.js # Server lifecycle management
│   ├── tools/                  # Tool implementations
│   │   ├── index.js            # Tool registry
│   │   ├── config-tools.js     # Configuration tools
│   │   ├── schema-tools.js     # Schema exploration tools
│   │   ├── table-tools.js      # Table management tools
│   │   ├── index-tools.js      # Index management tools
│   │   └── query-tools.js      # Query execution tools
│   ├── database/               # Database layer
│   │   ├── hana-client.js      # HANA client wrapper
│   │   ├── connection-manager.js # Connection management
│   │   └── query-executor.js   # Query execution utilities
│   ├── utils/                  # Utility modules
│   │   ├── logger.js           # Centralized logging
│   │   ├── config.js           # Configuration management
│   │   ├── validators.js       # Input validation
│   │   └── formatters.js       # Response formatting
│   └── constants/              # Constants and definitions
│       ├── mcp-constants.js    # MCP protocol constants
│       └── tool-definitions.js # Tool schemas and definitions
├── tests/                      # Testing framework
├── POC/                        # Proof of Concept implementations
├── package.json                # Dependencies and scripts
└── setup.sh                    # Setup script
```

### Architecture Layers:

#### 1. Server Layer (`src/server/`)
Handles MCP protocol communication and server lifecycle:
- **MCP Protocol Handler**: JSON-RPC 2.0 implementation
- **Lifecycle Management**: Startup, shutdown, and process events
- **STDIO Transport**: Client communication via stdin/stdout

#### 2. Tools Layer (`src/tools/`)
Modular tool implementations organized by functionality:
- **Tool Registry**: Centralized tool management and discovery
- **Configuration Tools**: Connection testing and config display
- **Schema Tools**: Database schema exploration
- **Table Tools**: Table structure and metadata
- **Index Tools**: Index management and details
- **Query Tools**: Custom SQL execution

#### 3. Database Layer (`src/database/`)
Manages HANA database connections and operations:
- **Connection Manager**: Connection pooling and health checks
- **Query Executor**: Query execution with validation
- **HANA Client**: Low-level database wrapper

#### 4. Utilities Layer (`src/utils/`)
Shared utilities across the application:
- **Logger**: Structured logging with levels
- **Config**: Environment variable management
- **Validators**: Input validation and sanitization
- **Formatters**: Response formatting utilities

#### 5. Constants Layer (`src/constants/`)
Centralized constants and definitions:
- **MCP Constants**: Protocol constants and error codes
- **Tool Definitions**: Tool schemas and metadata

### Benefits of Modular Architecture

- **Maintainability**: Clear separation of concerns with single-responsibility modules
- **Testability**: Each module can be tested independently with clear interfaces
- **Scalability**: Easy to add new tools and features without affecting existing code
- **Debugging**: Structured logging and modular error handling
- **Code Reuse**: Shared utilities and consistent patterns across modules
- **Team Collaboration**: Clear module boundaries and responsibilities

## 🚀 Usage

### Quick Start

1. **Configure your HANA database details** in the Claude Desktop configuration
2. **Restart Claude Desktop**
3. **Test the connection** using the `hana_test_connection` tool
4. **Explore your database** using the available tools

### Default Schema Behavior

The server supports using a default schema from the `HANA_SCHEMA` environment variable:

- **When `HANA_SCHEMA` is set**: Tools that accept optional `schema_name` parameters will use this schema if no `schema_name` is provided
- **When `HANA_SCHEMA` is not set**: Users must explicitly provide the `schema_name` parameter for tools that require it

**Examples:**
```bash
# With HANA_SCHEMA="MY_SCHEMA" set in environment:
# This will use MY_SCHEMA automatically
{"name":"hana_list_tables","arguments":{}}

# This will override and use CUSTOM_SCHEMA
{"name":"hana_list_tables","arguments":{"schema_name":"CUSTOM_SCHEMA"}}

# Without HANA_SCHEMA set:
# This will return an error asking for schema_name
{"name":"hana_list_tables","arguments":{}}

# This will work as expected
{"name":"hana_list_tables","arguments":{"schema_name":"MY_SCHEMA"}}
```

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
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}' | /opt/homebrew/bin/node hana-mcp-server.js

# Test tools listing
echo '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}' | /opt/homebrew/bin/node hana-mcp-server.js

# Test with environment variables
HANA_HOST="test" HANA_USER="test" HANA_PASSWORD="test" echo '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"hana_show_config","arguments":{}}}' | /opt/homebrew/bin/node hana-mcp-server.js
```

### Integration Testing

1. **Start Claude Desktop** with the MCP configuration
2. **Ask Claude** to test the HANA connection
3. **Verify tools** are available and functional

See `tests/README.md` for detailed testing documentation.

## 🔧 Development

### Key Components

#### `hana-mcp-server.js`
- Main entry point that starts the modular server
- Thin wrapper for backward compatibility
- Delegates to `src/server/index.js`

#### `src/server/index.js`
- Main server entry point that coordinates all components
- STDIO transport setup
- Process lifecycle management

#### `src/tools/index.js`
- Tool registry that manages all tool implementations
- Centralized tool discovery and execution
- Input validation and error handling

#### `src/database/connection-manager.js`
- HANA database connection management
- Connection pooling and health checks
- Retry logic and error recovery

#### `src/utils/logger.js`
- Centralized logging with structured output
- Log levels and formatting
- Non-interfering with JSON-RPC communication

### Adding New Tools

1. **Create a new tool file** in `src/tools/` (e.g., `my-tools.js`):
   ```javascript
   const { logger } = require('../utils/logger');
   const Formatters = require('../utils/formatters');
   
   class MyTools {
     static async myNewTool(args) {
       logger.tool('my_new_tool', args);
       
       // Tool implementation
       const result = "Tool result";
       
       return Formatters.createResponse(result);
     }
   }
   
   module.exports = MyTools;
   ```

2. **Register the tool** in `src/tools/index.js`:
   ```javascript
   const MyTools = require('./my-tools');
   
   const TOOL_IMPLEMENTATIONS = {
     // ... existing tools
     my_new_tool: MyTools.myNewTool
   };
   ```

3. **Add tool definition** in `src/constants/tool-definitions.js`:
   ```javascript
   {
     name: "my_new_tool",
     description: "Description of the tool",
     inputSchema: {
       type: "object",
       properties: {
         // Define input parameters
       },
       required: []
     }
   }
   ```

4. **Test the tool** using Claude Desktop or MCP Inspector

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