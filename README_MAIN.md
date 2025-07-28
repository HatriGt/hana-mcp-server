# HANA MCP Server - Main Implementation

A Model Context Protocol (MCP) server for SAP HANA databases that allows AI agents to interact with HANA databases through natural language.

## 🎯 Features

### ✅ **Core Functionality**
- **Real HANA Database Integration**: Connect to actual SAP HANA databases
- **Environment Variable Configuration**: Secure credential management
- **MCP Protocol Compliance**: Full JSON-RPC 2.0 implementation
- **Claude Desktop Integration**: Works seamlessly with Claude Desktop
- **STDIO Transport**: Optimized for AI client communication

### 🔧 **Available Tools**

#### **Configuration Tools**
- `hana_show_config` - Show HANA database configuration
- `hana_test_connection` - Test connection to HANA database
- `hana_show_env_vars` - Show all HANA environment variables

#### **Schema Exploration Tools**
- `hana_list_schemas` - List all schemas in the database
- `hana_list_tables` - List tables in a specific schema
- `hana_describe_table` - Describe table structure with columns and constraints

#### **Index Management Tools**
- `hana_list_indexes` - List indexes for a table
- `hana_describe_index` - Describe index details and columns

#### **Query Tools** (from query.js)
- Execute custom SQL queries
- Query with parameters
- Result formatting

#### **Admin Tools** (from admin.js)
- Database administration tasks
- User management
- System monitoring

## 🚀 Quick Start

### 1. **Setup**
```bash
# Run the setup script
./setup-main.sh
```

### 2. **Configure Claude Desktop**
```bash
# Copy the configuration template
cp claude_config_main.json ~/.config/claude/claude_desktop_config.json

# Edit with your HANA details
nano ~/.config/claude/claude_desktop_config.json
```

### 3. **Configuration Example**
```json
{
  "mcpServers": {
    "HANA Database": {
      "command": "/opt/homebrew/bin/node",
      "args": [
        "/Users/Common/ProjectsRepo/tools/hana-mcp-server/bin/cli.js",
        "start"
      ],
      "env": {
        "HANA_HOST": "your-hana-host.com",
        "HANA_PORT": "443",
        "HANA_USER": "your-username",
        "HANA_PASSWORD": "your-password",
        "HANA_SCHEMA": "your-schema",
        "HANA_SSL": "true",
        "MCP_TRANSPORT": "stdio",
        "LOG_LEVEL": "info"
      }
    }
  }
}
```

### 4. **Restart Claude Desktop**

### 5. **Test the Tools**
Try these commands in Claude Desktop:
- "Show my HANA database configuration"
- "Test the connection to my HANA database"
- "List all schemas in the database"
- "List tables in the SYSTEM schema"

## 🔧 Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `HANA_HOST` | HANA database host | Yes | - |
| `HANA_PORT` | HANA database port | No | 443 |
| `HANA_USER` | HANA database username | Yes | - |
| `HANA_PASSWORD` | HANA database password | Yes | - |
| `HANA_SCHEMA` | HANA database schema | No | - |
| `HANA_SSL` | Enable SSL connection | No | true |
| `MCP_TRANSPORT` | Transport type | No | stdio |
| `LOG_LEVEL` | Logging level | No | info |

## 📁 Project Structure

```
hana-mcp-server/
├── src/
│   ├── server.js              # Main server with STDIO transport
│   ├── mcp-adapter.js         # MCP protocol adapter
│   ├── hana-client.js         # HANA database client
│   ├── tools/
│   │   ├── index.js           # Tool registration
│   │   ├── config.js          # Configuration tools
│   │   ├── schema.js          # Schema exploration tools
│   │   ├── query.js           # Query execution tools
│   │   └── admin.js           # Administrative tools
│   └── utils/
│       ├── config.js          # Configuration loading
│       └── logger.js          # Logging utilities
├── bin/
│   └── cli.js                 # Command-line interface
├── POC/                       # Proof of Concept implementations
├── claude_config_main.json    # Claude Desktop configuration
├── setup-main.sh              # Setup script
└── README_MAIN.md             # This file
```

## 🔄 Key Improvements from POC

### **Protocol Compliance**
- ✅ Correct MCP method names (`tools/call` instead of `tools/execute`)
- ✅ Proper response format with `content` array
- ✅ Correct schema format (`inputSchema` instead of `parameters`)
- ✅ Added `initialize` and `notifications/initialized` handlers

### **Process Management**
- ✅ Process persistence with `setInterval()` and `process.stdin.resume()`
- ✅ Proper signal handling (SIGINT, SIGTERM)
- ✅ Graceful shutdown and cleanup

### **Environment Variables**
- ✅ Secure credential passing through environment variables
- ✅ Configuration validation and error handling
- ✅ Debug tools for environment inspection

### **Real Database Integration**
- ✅ Actual HANA database queries
- ✅ Connection testing and validation
- ✅ Error handling for database operations

## 🧪 Testing

### **Manual Testing**
```bash
# Test with environment variables
HANA_HOST="test-host.com" \
HANA_PORT="443" \
HANA_USER="testuser" \
HANA_PASSWORD="testpass" \
HANA_SCHEMA="TEST" \
HANA_SSL="true" \
MCP_TRANSPORT="stdio" \
node bin/cli.js start
```

### **Connection Testing**
```bash
# Test HANA connection
HANA_HOST="your-host" \
HANA_USER="your-user" \
HANA_PASSWORD="your-password" \
node bin/cli.js test-connection
```

## 🔍 Debugging

### **Common Issues**

1. **"Missing required HANA configuration"**
   - Ensure all required environment variables are set
   - Check Claude Desktop configuration file

2. **"Connection failed"**
   - Verify HANA database is accessible
   - Check network connectivity
   - Validate credentials

3. **"Tool not found"**
   - Ensure server is running with STDIO transport
   - Check tool registration in `src/tools/index.js`

### **Debug Tools**
- Use `hana_show_config` to verify configuration
- Use `hana_test_connection` to test database connectivity
- Use `hana_show_env_vars` to inspect environment variables

## 🔒 Security

- **Environment Variables**: Credentials passed securely through environment variables
- **Password Hiding**: Passwords are hidden in logs and responses
- **SSL Support**: Encrypted connections to HANA database
- **Read-Only Mode**: Optional read-only mode for safety

## 📚 Usage Examples

### **Schema Exploration**
```
User: "List all schemas in my HANA database"
Claude: [Uses hana_list_schemas tool]

User: "Show me the structure of the CUSTOMERS table in the SALES schema"
Claude: [Uses hana_describe_table tool]
```

### **Connection Testing**
```
User: "Test my HANA database connection"
Claude: [Uses hana_test_connection tool]

User: "Show my current HANA configuration"
Claude: [Uses hana_show_config tool]
```

### **Index Management**
```
User: "List all indexes on the ORDERS table"
Claude: [Uses hana_list_indexes tool]

User: "Describe the PK_ORDERS index"
Claude: [Uses hana_describe_index tool]
```

## 🎯 Success Criteria

✅ **Claude Desktop Integration**
- Claude Desktop can start the MCP server
- Tools appear in Claude Desktop interface
- Tools execute successfully

✅ **Real Database Integration**
- Connects to actual HANA database
- Executes real queries
- Returns actual data

✅ **Protocol Compliance**
- Proper MCP protocol implementation
- Correct JSON-RPC 2.0 formatting
- Process persistence and stability

✅ **Configuration Management**
- Environment variables work correctly
- Configuration validation functions
- Secure credential handling

## 🔄 Next Steps

1. **Enhanced Features**
   - Add more sophisticated query tools
   - Implement connection pooling
   - Add performance monitoring

2. **Security Enhancements**
   - Add connection encryption
   - Implement user authentication
   - Add audit logging

3. **Documentation**
   - Create user guides
   - Add troubleshooting guides
   - Document advanced features

## 📝 Notes

- This implementation builds on the successful POC learnings
- All tools use the correct MCP response format
- Environment variables provide secure configuration
- Real HANA database integration is fully functional
- Claude Desktop integration is tested and working

The main implementation is now ready for production use with real HANA databases! 