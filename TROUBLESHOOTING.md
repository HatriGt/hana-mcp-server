# HANA MCP Server Troubleshooting

## 🚨 Issue: MCP Server Not Visible in Claude Desktop

### **Problem Description**
The HANA MCP server was not appearing in Claude Desktop after fixing the JSON parsing errors. The server was configured correctly but not showing up in the MCP servers list.

### **Root Cause Analysis**

#### **CLI Approach Issues**
The original main implementation used a CLI approach:
```json
{
  "mcpServers": {
    "HANA Database": {
      "command": "/opt/homebrew/bin/node",
      "args": [
        "/Users/Common/ProjectsRepo/tools/hana-mcp-server/bin/cli.js",
        "start"
      ],
      "env": { ... }
    }
  }
}
```

**Problems with CLI approach:**
1. **Additional Overhead**: CLI parsing and argument processing
2. **Startup Delays**: Commander.js initialization and option parsing
3. **Potential Failures**: CLI argument validation and error handling
4. **Complexity**: Multiple layers of abstraction

#### **Working POC Approach**
The successful POC used a direct standalone server:
```json
{
  "mcpServers": {
    "HANA Database": {
      "command": "/opt/homebrew/bin/node",
      "args": [
        "/Users/Common/ProjectsRepo/tools/hana-mcp-server/mcp-server-final.js"
      ]
    }
  }
}
```

**Advantages of standalone approach:**
1. **Direct Execution**: No CLI overhead
2. **Immediate Response**: Server starts immediately
3. **Clean JSON-RPC**: Direct protocol communication
4. **Simpler Debugging**: Fewer layers to troubleshoot

### **Solution: Standalone Server Approach**

#### **Created New Standalone Server**
- **File**: `mcp-server-main.js`
- **Approach**: Direct MCP server implementation (like POC)
- **Features**: 
  - Environment variable configuration
  - Real HANA database integration
  - Fallback to mock tools if connection fails
  - Clean JSON-RPC output

#### **Key Features of Standalone Server**

1. **Immediate Startup**
   ```javascript
   // Server starts immediately without CLI overhead
   log('Starting HANA MCP Server (Main Implementation)...');
   ```

2. **Environment Variable Configuration**
   ```javascript
   const config = {
     hana: {
       host: process.env.HANA_HOST,
       port: parseInt(process.env.HANA_PORT) || 443,
       user: process.env.HANA_USER,
       password: process.env.HANA_PASSWORD,
       // ...
     }
   };
   ```

3. **Graceful Fallback**
   ```javascript
   if (!config.hana.host || !config.hana.user || !config.hana.password) {
     log('Missing required HANA configuration. Using mock tools for testing.');
     // Use mock tools if no HANA configuration
   }
   ```

4. **Real HANA Integration**
   ```javascript
   // Create real HANA client connection
   hanaClient = await createHanaClient(config.hana);
   tools = registerTools(hanaClient);
   ```

### **New Configuration**

#### **Standalone Configuration**
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

### **Setup Instructions**

1. **Use Standalone Setup**
   ```bash
   ./setup-standalone.sh
   ```

2. **Configure Claude Desktop**
   ```bash
   cp claude_config_standalone.json ~/.config/claude/claude_desktop_config.json
   ```

3. **Edit Configuration**
   - Update with your actual HANA database details
   - Ensure all required environment variables are set

4. **Restart Claude Desktop**

### **Testing**

#### **Manual Test**
```bash
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}' | /opt/homebrew/bin/node mcp-server-main.js
```

#### **Expected Output**
```
[HANA MCP Main] Starting HANA MCP Server (Main Implementation)...
[HANA MCP Main] Server initialized successfully
[HANA MCP Main] Handling method: initialize
{"jsonrpc":"2.0","id":1,"result":{"protocolVersion":"2024-11-05","capabilities":{"tools":{}},"serverInfo":{"name":"HANA MCP Server (Main)","version":"1.0.0"}}}
```

### **Available Tools**

#### **With Mock Data (No HANA Connection)**
- `hana_show_config` - Show configuration status
- `hana_test_connection` - Test connection (simulation)
- `hana_list_schemas` - List schemas (mock data)

#### **With Real HANA Connection**
- All schema exploration tools
- All query execution tools
- All administrative tools

### **Key Differences**

| Aspect | CLI Approach | Standalone Approach |
|--------|-------------|-------------------|
| **Startup** | CLI parsing + server start | Direct server start |
| **Overhead** | Commander.js + argument parsing | Minimal |
| **Debugging** | Multiple layers | Single layer |
| **Reliability** | Potential CLI failures | Direct execution |
| **JSON-RPC** | Through CLI layer | Direct output |

### **Success Criteria**

✅ **MCP Server Visibility**
- Server appears in Claude Desktop MCP servers list
- Tools are available and functional
- No JSON parsing errors

✅ **Real Database Integration**
- Connects to actual HANA database
- Executes real queries
- Returns actual data

✅ **Graceful Fallback**
- Works without HANA configuration
- Provides mock tools for testing
- Clear error messages

### **Next Steps**

1. **Test Standalone Server**
   - Use `claude_config_standalone.json`
   - Restart Claude Desktop
   - Verify MCP server appears

2. **Test with Real HANA**
   - Configure real HANA database details
   - Test actual database queries
   - Verify all tools work

3. **Production Deployment**
   - Use standalone approach for production
   - Remove CLI approach files
   - Update documentation

The standalone approach should resolve the MCP visibility issue and provide a more reliable, faster, and cleaner implementation. 