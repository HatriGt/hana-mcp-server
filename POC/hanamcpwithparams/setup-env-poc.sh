#!/bin/bash

# Setup script for HANA MCP Server with Environment Variables POC
# This script helps set up the environment variable testing POC

echo "🚀 Setting up HANA MCP Server with Environment Variables POC"
echo "=========================================================="

# Get the current directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
echo "📁 Working directory: $SCRIPT_DIR"

# Check if Node.js is available
NODE_PATH="/opt/homebrew/bin/node"
if [ ! -f "$NODE_PATH" ]; then
    echo "❌ Node.js not found at $NODE_PATH"
    echo "Please install Node.js or update the path in this script"
    exit 1
fi

echo "✅ Node.js found: $($NODE_PATH --version)"

# Make the MCP server executable
chmod +x "$SCRIPT_DIR/mcp-server-with-env.js"
echo "✅ Made MCP server executable"

# Check if the MCP server file exists
if [ ! -f "$SCRIPT_DIR/mcp-server-with-env.js" ]; then
    echo "❌ MCP server file not found: $SCRIPT_DIR/mcp-server-with-env.js"
    exit 1
fi

echo "✅ MCP server file found"

# Display configuration files
echo ""
echo "📋 Configuration files available:"
echo "1. claude_config_with_env.json - Template with placeholder values"
echo "2. claude_config_test.json - Test configuration with sample values"
echo ""

# Instructions
echo "📖 Setup Instructions:"
echo "====================="
echo ""
echo "1. Copy one of the configuration files to your Claude Desktop config:"
echo "   cp $SCRIPT_DIR/claude_config_test.json ~/.config/claude/claude_desktop_config.json"
echo ""
echo "2. Edit the configuration file with your actual HANA database details:"
echo "   - HANA_HOST: Your HANA database host"
echo "   - HANA_PORT: Your HANA database port (usually 443)"
echo "   - HANA_USER: Your HANA database username"
echo "   - HANA_PASSWORD: Your HANA database password"
echo "   - HANA_SCHEMA: Your HANA database schema"
echo "   - HANA_SSL: true or false"
echo ""
echo "3. Restart Claude Desktop"
echo ""
echo "4. Test the tools:"
echo "   - hana_show_config: Shows the configuration received"
echo "   - hana_test_connection: Tests if configuration is complete"
echo "   - hana_list_schemas: Lists schemas (mock data)"
echo "   - hana_show_env_vars: Shows all HANA_* environment variables"
echo ""

# Test the server
echo "🧪 Testing MCP server..."
echo "========================="

# Test with environment variables
echo "Testing with environment variables..."
HANA_HOST="test-host.com" \
HANA_PORT="443" \
HANA_USER="testuser" \
HANA_PASSWORD="testpass" \
HANA_SCHEMA="TEST" \
HANA_SSL="true" \
timeout 5s "$NODE_PATH" "$SCRIPT_DIR/mcp-server-with-env.js" 2>&1 | head -10

echo ""
echo "✅ Setup complete!"
echo ""
echo "💡 Next steps:"
echo "1. Configure your Claude Desktop with the configuration file"
echo "2. Restart Claude Desktop"
echo "3. Test the tools in Claude Desktop"
echo ""
echo "🔍 For debugging, check the server logs in Claude Desktop's developer tools" 