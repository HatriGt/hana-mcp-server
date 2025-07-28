#!/bin/bash

# HANA MCP Server Setup Script
echo "🚀 Setting up HANA MCP Server"
echo "============================="

# Get the current directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
echo "📁 Working directory: $SCRIPT_DIR"

# Check if Node.js is available
NODE_PATH="/opt/homebrew/bin/node"
if [ ! -f "$NODE_PATH" ]; then
    # Try alternative paths
    if command -v node >/dev/null 2>&1; then
        NODE_PATH=$(which node)
    else
        echo "❌ Node.js not found"
        echo "Please install Node.js or update the path in this script"
        exit 1
    fi
fi

echo "✅ Node.js found: $($NODE_PATH --version)"

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    if [ $? -eq 0 ]; then
        echo "✅ Dependencies installed successfully"
    else
        echo "❌ Failed to install dependencies"
        echo "Please run 'npm install' manually"
        exit 1
    fi
else
    echo "✅ Dependencies already installed"
fi

# Make the server executable
chmod +x "$SCRIPT_DIR/hana-mcp-server.js"
echo "✅ Made server executable"

# Display configuration instructions
echo ""
echo "📖 Configuration Instructions:"
echo "=============================="
echo ""
echo "1. Copy the configuration template:"
echo "   cp $SCRIPT_DIR/claude_config_template.json ~/.config/claude/claude_desktop_config.json"
echo ""
echo "2. Edit the configuration file with your HANA database details:"
echo "   - Update the path to hana-mcp-server.js"
echo "   - Set your HANA_HOST, HANA_USER, HANA_PASSWORD, etc."
echo ""
echo "3. Restart Claude Desktop"
echo ""
echo "4. Test the connection using the hana_test_connection tool"
echo ""
echo "📚 For more information, see README.md"
echo ""
echo "✅ Setup complete!" 