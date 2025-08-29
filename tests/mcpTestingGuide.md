# HANA MCP Server Testing Guide

This guide shows you how to test your HANA MCP server using different methods, including MCP Inspector.

## 🎯 Testing Methods

### 1. **MCP Inspector (Recommended)**

MCP Inspector is the official tool for testing MCP servers. Here's how to use it:

#### Installation
```bash
# Install MCP Inspector globally
npm install -g @modelcontextprotocol/inspector

# Or install locally
npm install @modelcontextprotocol/inspector
```

#### Usage
```bash
# Start MCP Inspector with your server
mcp-inspector --config mcp-inspector-config.json

# Or run directly with command
mcp-inspector --command "/opt/homebrew/bin/node" --args "hana-mcp-server.js" --env-file .env
```

### 2. **Manual Testing Scripts**

We've created custom testing scripts for your convenience:

#### Automated Test Suite
```bash
# Run all tests automatically
/opt/homebrew/bin/node test-mcp-inspector.js
```

#### Interactive Manual Tester
```bash
# Interactive menu for testing individual tools
/opt/homebrew/bin/node manual-test.js
```

### 3. **Command Line Testing**

Test individual commands manually:

```bash
# Test initialization
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}' | /opt/homebrew/bin/node hana-mcp-server.js

# Test tools listing
echo '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}' | /opt/homebrew/bin/node hana-mcp-server.js

# Test a specific tool
echo '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"hana_show_config","arguments":{}}}' | /opt/homebrew/bin/node hana-mcp-server.js
```

## 🔧 Configuration Files

### MCP Inspector Config (`mcp-inspector-config.json`)
```json
{
  "mcpServers": {
    "HANA Database": {
      "command": "/opt/homebrew/bin/node",
      "args": [
        "/Users/Common/ProjectsRepo/tools/hana-mcp-server/hana-mcp-server.js"
      ],
      "env": {
        "HANA_HOST": "your-hana-host.com",
        "HANA_PORT": "443",
        "HANA_USER": "your-username",
        "HANA_PASSWORD": "your-password",
        "HANA_SCHEMA": "your-schema",
        "HANA_SSL": "true",
        "HANA_ENCRYPT": "true",
        "HANA_VALIDATE_CERT": "true",
        "HANA_DATABASE": "your-tenant-database"
      }
    }
  }
}
```

### Environment File (`.env`)
```bash
HANA_HOST=your-hana-host.com
HANA_PORT=443
HANA_USER=your-username
HANA_PASSWORD=your-password
HANA_SCHEMA=your-schema
HANA_SSL=true
HANA_ENCRYPT=true
HANA_VALIDATE_CERT=true
HANA_DATABASE=your-tenant-database
```

## 🧪 Test Scenarios

### Basic Functionality Tests
1. **Server Initialization** - Verify server starts correctly
2. **Tools Discovery** - Check all 9 tools are available
3. **Configuration Display** - Show HANA connection details
4. **Connection Test** - Verify HANA database connectivity

### Database Operation Tests
1. **Schema Listing** - List all available schemas
2. **Table Discovery** - List tables in a specific schema
3. **Table Structure** - Describe table columns and types
4. **Index Information** - List and describe indexes
5. **Query Execution** - Run custom SQL queries

### Error Handling Tests
1. **Missing Parameters** - Test required parameter validation
2. **Invalid Credentials** - Test connection failure handling
3. **Invalid Queries** - Test SQL error handling
4. **Missing Tables/Schemas** - Test not found scenarios

## 📋 Expected Test Results

### Successful Initialization
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "protocolVersion": "2024-11-05",
    "capabilities": {
      "tools": {}
    },
    "serverInfo": {
      "name": "HANA MCP Server",
      "version": "1.0.0"
    }
  }
}
```

### Tools List Response
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {
    "tools": [
      {
        "name": "hana_show_config",
        "description": "Show the HANA database configuration",
        "inputSchema": {
          "type": "object",
          "properties": {},
          "required": []
        }
      },
      // ... 8 more tools
    ]
  }
}
```

### Tool Execution Response
```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "📋 Available schemas in HANA database:\n\n- SCHEMA1\n- SCHEMA2\n..."
      }
    ]
  }
}
```

## 🚨 Troubleshooting

### Common Issues

1. **"HANA client not connected"**
   - Check environment variables are set correctly
   - Verify HANA credentials are valid
   - Ensure network connectivity to HANA host

2. **"Tool not found"**
   - Verify tool name spelling
   - Check tools/list response includes the tool
   - Ensure server is properly initialized

3. **"Missing required parameters"**
   - Check tool documentation for required parameters
   - Verify parameter names match exactly
   - Ensure parameters are in correct format

4. **"Parse error"**
   - Verify JSON-RPC format is correct
   - Check for extra/missing commas in JSON
   - Ensure proper escaping of special characters

### Debug Mode
Enable debug logging by setting environment variables:
```bash
export LOG_LEVEL=debug
export ENABLE_FILE_LOGGING=true
```

## 📊 Performance Testing

### Load Testing
```bash
# Test multiple concurrent requests
for i in {1..10}; do
  echo '{"jsonrpc":"2.0","id":'$i',"method":"tools/call","params":{"name":"hana_list_schemas","arguments":{}}}' | /opt/homebrew/bin/node hana-mcp-server.js &
done
wait
```

### Response Time Testing
```bash
# Measure response time
time echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"hana_list_schemas","arguments":{}}}' | /opt/homebrew/bin/node hana-mcp-server.js
```

## 🔄 Continuous Testing

### Automated Test Script
Create a CI/CD pipeline script:

```bash
#!/bin/bash
set -e

echo "🧪 Running HANA MCP Server Tests..."

# Start server
node hana-mcp-server.js &
SERVER_PID=$!

# Wait for server to start
sleep 2

# Run tests
node test-mcp-inspector.js

# Cleanup
kill $SERVER_PID

echo "✅ All tests passed!"
```

## 📝 Test Checklist

- [ ] Server initializes correctly
- [ ] All 9 tools are discoverable
- [ ] Configuration tool shows correct settings
- [ ] Connection test passes
- [ ] Schema listing works
- [ ] Table listing works
- [ ] Table description works
- [ ] Index listing works
- [ ] Query execution works
- [ ] Error handling works correctly
- [ ] Performance is acceptable
- [ ] No memory leaks detected

## 🎉 Success Criteria

Your HANA MCP server is ready for production when:
- All tests pass consistently
- Response times are under 5 seconds
- Error handling is robust
- Documentation is complete
- Integration with Claude Desktop works seamlessly 