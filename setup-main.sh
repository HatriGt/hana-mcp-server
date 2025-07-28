#!/bin/bash

# Setup script for Main HANA MCP Server Implementation
# This script helps set up the main implementation with environment variables

echo "🚀 Setting up Main HANA MCP Server Implementation"
echo "================================================="

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

# Make the CLI executable
chmod +x "$SCRIPT_DIR/bin/cli.js"
echo "✅ Made CLI executable"

# Check if the CLI file exists
if [ ! -f "$SCRIPT_DIR/bin/cli.js" ]; then
    echo "❌ CLI file not found: $SCRIPT_DIR/bin/cli.js"
    exit 1
fi

echo "✅ CLI file found"

# Display configuration files
echo ""
echo "📋 Configuration files available:"
echo "1. claude_config_main.json - Template with placeholder values"
echo ""

# Instructions
echo "📖 Setup Instructions:"
echo "====================="
echo ""
echo "1. Copy the configuration file to your Claude Desktop config:"
echo "   cp $SCRIPT_DIR/claude_config_main.json ~/.config/claude/claude_desktop_config.json"
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
echo "   - hana_list_schemas: Lists all schemas in the database"
echo "   - hana_list_tables: Lists tables in a specific schema"
echo "   - hana_describe_table: Describes table structure"
echo "   - hana_list_indexes: Lists indexes for a table"
echo "   - hana_describe_index: Describes index details"
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
MCP_TRANSPORT="stdio" \
timeout 5s "$NODE_PATH" "$SCRIPT_DIR/bin/cli.js" start 2>&1 | head -10

echo ""
echo "✅ Setup complete!"
echo ""
echo "💡 Next steps:"
echo "1. Configure your Claude Desktop with the configuration file"
echo "2. Restart Claude Desktop"
echo "3. Test the tools in Claude Desktop"
echo ""
echo "🔍 For debugging, check the server logs in Claude Desktop's developer tools"
echo ""
echo "📚 Available tools:"
echo "- Configuration tools: hana_show_config, hana_test_connection, hana_show_env_vars"
echo "- Schema tools: hana_list_schemas, hana_list_tables, hana_describe_table"
echo "- Index tools: hana_list_indexes, hana_describe_index"
echo "- Query tools: (from query.js)"
echo "- Admin tools: (from admin.js)" 