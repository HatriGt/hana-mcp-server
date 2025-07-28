#!/bin/bash

# Setup script for Standalone HANA MCP Server
# This script helps set up the standalone server approach

echo "🚀 Setting up Standalone HANA MCP Server"
echo "======================================="

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

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

echo "✅ Dependencies installed"

# Make the standalone server executable
chmod +x "$SCRIPT_DIR/mcp-server-main.js"
echo "✅ Made standalone server executable"

# Check if the standalone server file exists
if [ ! -f "$SCRIPT_DIR/mcp-server-main.js" ]; then
    echo "❌ Standalone server file not found: $SCRIPT_DIR/mcp-server-main.js"
    exit 1
fi

echo "✅ Standalone server file found"

# Display configuration files
echo ""
echo "📋 Configuration files available:"
echo "1. claude_config_standalone.json - Standalone server configuration"
echo ""

# Instructions
echo "📖 Setup Instructions:"
echo "====================="
echo ""
echo "1. Copy the standalone configuration file to your Claude Desktop config:"
echo "   cp $SCRIPT_DIR/claude_config_standalone.json ~/.config/claude/claude_desktop_config.json"
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
echo "   - hana_list_schemas: Lists schemas (mock data if no real connection)"
echo ""

# Test the server
echo "🧪 Testing standalone server..."
echo "==============================="

# Test with environment variables
echo "Testing with environment variables..."
HANA_HOST="test-host.com" \
HANA_PORT="443" \
HANA_USER="testuser" \
HANA_PASSWORD="testpass" \
HANA_SCHEMA="TEST" \
HANA_SSL="true" \
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}' | "$NODE_PATH" "$SCRIPT_DIR/mcp-server-main.js" 2>&1 | head -5

echo ""
echo "✅ Setup complete!"
echo ""
echo "💡 Next steps:"
echo "1. Configure your Claude Desktop with the standalone configuration file"
echo "2. Restart Claude Desktop"
echo "3. Test the tools in Claude Desktop"
echo ""
echo "🔍 For debugging, check the server logs in Claude Desktop's developer tools"
echo ""
echo "📚 Available tools:"
echo "- Configuration tools: hana_show_config, hana_test_connection"
echo "- Schema tools: hana_list_schemas (with real HANA connection)"
echo "- Additional tools will be available with real HANA connection"
echo ""
echo "🎯 Key differences from CLI approach:"
echo "- Direct standalone server (no CLI overhead)"
echo "- Immediate startup and response"
echo "- Clean JSON-RPC output"
echo "- Fallback to mock tools if HANA connection fails" 