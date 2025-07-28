# HANA MCP Server with Environment Variables POC

This POC demonstrates how to pass HANA database configuration parameters from Claude Desktop to an MCP server using environment variables.

## 🎯 Purpose

Test whether environment variables can be successfully passed from Claude Desktop configuration to the MCP server and accessed by the server code.

## 📁 Files

- `mcp-server-with-env.js` - MCP server that reads environment variables
- `claude_config_with_env.json` - Template Claude Desktop configuration
- `claude_config_test.json` - Test configuration with sample values
- `setup-env-poc.sh` - Setup script
- `README.md` - This file

## 🚀 Quick Start

1. **Run the setup script:**
   ```bash
   cd POC/hanamcpwithparams
   chmod +x setup-env-poc.sh
   ./setup-env-poc.sh
   ```

2. **Configure Claude Desktop:**
   ```bash
   cp claude_config_test.json ~/.config/claude/claude_desktop_config.json
   ```

3. **Edit the configuration with your HANA details:**
   ```json
   {
     "mcpServers": {
       "HANA Database Test": {
         "command": "/opt/homebrew/bin/node",
         "args": [
           "/Users/Common/ProjectsRepo/tools/hana-mcp-server/POC/hanamcpwithparams/mcp-server-with-env.js"
         ],
         "env": {
           "HANA_HOST": "your-actual-hana-host.com",
           "HANA_PORT": "443",
           "HANA_USER": "your-actual-username",
           "HANA_PASSWORD": "your-actual-password",
           "HANA_SCHEMA": "your-actual-schema",
           "HANA_SSL": "true"
         }
       }
     }
   }
   ```

4. **Restart Claude Desktop**

5. **Test the tools in Claude Desktop:**
   - `hana_show_config` - Shows the configuration received
   - `hana_test_connection` - Tests if configuration is complete
   - `hana_list_schemas` - Lists schemas (mock data)
   - `hana_show_env_vars` - Shows all HANA_* environment variables

## 🔧 Environment Variables

The MCP server reads these environment variables:

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `HANA_HOST` | HANA database host | Yes | - |
| `HANA_PORT` | HANA database port | No | 443 |
| `HANA_USER` | HANA database username | Yes | - |
| `HANA_PASSWORD` | HANA database password | Yes | - |
| `HANA_SCHEMA` | HANA database schema | No | - |
| `HANA_SSL` | Enable SSL connection | No | true |

## 🧪 Testing

### Test 1: With Environment Variables
```bash
HANA_HOST="test-host.com" \
HANA_PORT="443" \
HANA_USER="testuser" \
HANA_PASSWORD="testpass" \
HANA_SCHEMA="TEST" \
HANA_SSL="true" \
node mcp-server-with-env.js
```

### Test 2: Without Environment Variables
```bash
node mcp-server-with-env.js
```

## 📊 Expected Results

### With Proper Configuration:
- ✅ `hana_show_config` shows all values
- ✅ `hana_test_connection` shows "Connection test successful!"
- ✅ `hana_list_schemas` shows mock schema list
- ✅ `hana_show_env_vars` shows all HANA_* variables

### Without Configuration:
- ❌ `hana_show_config` shows "NOT SET" for required values
- ❌ `hana_test_connection` shows "Connection test failed!"
- ❌ `hana_list_schemas` shows "Cannot list schemas - configuration incomplete"
- ✅ `hana_show_env_vars` shows "No HANA_* environment variables found"

## 🔍 Debugging

1. **Check Claude Desktop logs** for any connection issues
2. **Use `hana_show_env_vars` tool** to see what environment variables are received
3. **Check server logs** in Claude Desktop's developer tools
4. **Verify Node.js path** in the configuration matches your system

## 🎯 Success Criteria

This POC is successful if:
1. ✅ Claude Desktop can start the MCP server
2. ✅ Environment variables are passed to the server
3. ✅ Server can read and display the environment variables
4. ✅ Tools work correctly based on configuration presence/absence
5. ✅ Real HANA database connection can be established (future enhancement)

## 🔄 Next Steps

Once this POC is successful:
1. Apply the environment variable pattern to the main HANA MCP server
2. Integrate real HANA database client
3. Implement actual database queries
4. Add more sophisticated error handling
5. Add connection pooling and security features 