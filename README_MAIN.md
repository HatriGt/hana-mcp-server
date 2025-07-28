# HANA MCP Server

A Model Context Protocol (MCP) server for SAP HANA database integration with AI agents like Claude Desktop.

## 🚀 Features

- **Real HANA Database Integration** - All tools execute actual SQL queries against your HANA database
- **9 Complete Tools** - Full schema exploration and query execution capabilities
- **Lazy Connection** - Fast startup with on-demand HANA connection
- **Claude Desktop Ready** - Optimized for seamless integration
- **No Mock Data** - Everything returns real data from your HANA instance

## 🛠️ Available Tools

1. **`hana_show_config`** - Display HANA database configuration
2. **`hana_test_connection`** - Test actual HANA database connectivity
3. **`hana_list_schemas`** - List all schemas in the HANA database
4. **`hana_show_env_vars`** - Show HANA-related environment variables
5. **`hana_list_tables`** - List all tables in a specific schema
6. **`hana_describe_table`** - Describe table structure and columns
7. **`hana_list_indexes`** - List all indexes for a specific table
8. **`hana_describe_index`** - Describe index structure and details
9. **`hana_execute_query`** - Execute custom SQL queries against HANA

## ⚡ Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Claude Desktop

Copy the contents of `claude_config_main.json` to your Claude Desktop configuration file:

```json
{
  "mcpServers": {
    "HANA Database": {
      "command": "/opt/homebrew/bin/node",
      "args": [
        "/Users/Common/ProjectsRepo/tools/hana-mcp-server/mcp-server-main.js"
      ],
      "env": {
        "HANA_HOST": "your-hana-host.com",
        "HANA_PORT": "443",
        "HANA_USER": "your-username",
        "HANA_PASSWORD": "your-password",
        "HANA_SCHEMA": "your-schema",
        "HANA_SSL": "true"
      }
    }
  }
}
```

### 3. Update Configuration
Replace the environment variables in the config with your actual HANA database details:
- `HANA_HOST` - Your HANA database host
- `HANA_PORT` - Database port (default: 443)
- `HANA_USER` - Database username
- `HANA_PASSWORD` - Database password
- `HANA_SCHEMA` - Default schema
- `HANA_SSL` - SSL enabled (true/false)

### 4. Restart Claude Desktop
Restart Claude Desktop to load the new MCP server configuration.

## 🔧 Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `HANA_HOST` | HANA database host | Yes | - |
| `HANA_PORT` | Database port | No | 443 |
| `HANA_USER` | Database username | Yes | - |
| `HANA_PASSWORD` | Database password | Yes | - |
| `HANA_SCHEMA` | Default schema | No | - |
| `HANA_SSL` | Enable SSL | No | true |
| `HANA_ENCRYPT` | Enable encryption | No | true |
| `HANA_VALIDATE_CERT` | Validate SSL certificate | No | true |

## 📁 Project Structure

```
hana-mcp-server/
├── mcp-server-main.js          # Main MCP server (working implementation)
├── claude_config_main.json     # Claude Desktop configuration
├── src/
│   ├── hana-client.js          # HANA database client
│   ├── tools/                  # Tool implementations
│   └── utils/                  # Utilities and logging
├── POC/                        # Proof of Concept files
│   ├── simplehanamcp/          # Original working POC
│   └── hanamcpwithparams/      # Environment variable POC
└── README_MAIN.md              # This file
```

## 🎯 Usage Examples

### Test Connection
```
Test my HANA database connection
```

### List Schemas
```
Show me all schemas in the HANA database
```

### Explore Tables
```
List all tables in schema 'MY_SCHEMA'
```

### Describe Table
```
Describe the structure of table 'CUSTOMERS' in schema 'SALES'
```

### Execute Custom Query
```
Show me all records from the ATOM_DB_FINANCE_CLEARINGLOG table that were cleared last Friday
```

## 🔍 Key Improvements

### From POC to Production
- **Real HANA Integration** - All tools use actual SQL queries
- **Lazy Connection** - Fast startup, connects only when needed
- **Complete Tool Set** - 9 tools covering all major use cases
- **Error Handling** - Proper error messages and fallbacks
- **Claude Desktop Optimized** - No startup delays or timeouts

### Technical Features
- **JSON-RPC 2.0 Compliant** - Full MCP protocol support
- **STDIO Transport** - Direct integration with Claude Desktop
- **Process Persistence** - Server stays alive throughout session
- **Custom Logging** - No interference with JSON-RPC communication
- **Parameter Support** - Prepared statements for secure queries

## 🚨 Troubleshooting

### Server Not Visible in Claude Desktop
1. Check that the Node.js path is correct in the config
2. Ensure the server file path is absolute
3. Verify all environment variables are set

### Tools Not Available
1. Restart Claude Desktop after configuration changes
2. Check server logs for initialization errors
3. Verify HANA connection details

### Connection Errors
1. Verify HANA host, port, and credentials
2. Check network connectivity to HANA database
3. Ensure SSL settings match your HANA configuration

## 📝 Development

### Adding New Tools
1. Add tool implementation to `toolImplementations` object
2. Add tool definition to `tools` array
3. Test with Claude Desktop

### Testing
```bash
# Test server startup
node mcp-server-main.js

# Test with environment variables
HANA_HOST=your-host HANA_USER=your-user HANA_PASSWORD=your-pass node mcp-server-main.js
```

## 📄 License

This project is designed for integration with SAP HANA databases and follows the Model Context Protocol specification.

## 🤝 Contributing

This implementation provides a complete, working HANA MCP server that can be extended with additional tools as needed. 