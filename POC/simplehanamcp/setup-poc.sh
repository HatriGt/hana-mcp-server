#!/bin/bash

# HANA MCP Server POC Setup Script
# This script sets up the HANA MCP Server POC for Claude Desktop

echo "🚀 Setting up HANA MCP Server POC..."

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js first."
    echo "   Expected path: /opt/homebrew/bin/node"
    exit 1
fi

echo "✅ Node.js found: $(which node)"

# Make the server executable
chmod +x mcp-server-final.js
echo "✅ Made server executable"

# Copy configuration to Claude Desktop
CLAUDE_CONFIG_DIR="/Users/ajeethkumar.ravichandran/Library/Application Support/Claude"
CLAUDE_CONFIG_FILE="$CLAUDE_CONFIG_DIR/claude_desktop_config.json"

# Create directory if it doesn't exist
mkdir -p "$CLAUDE_CONFIG_DIR"

# Backup existing config if it exists
if [ -f "$CLAUDE_CONFIG_FILE" ]; then
    cp "$CLAUDE_CONFIG_FILE" "$CLAUDE_CONFIG_FILE.backup.$(date +%Y%m%d_%H%M%S)"
    echo "✅ Backed up existing Claude Desktop configuration"
fi

# Copy new configuration
cp claude_config.json "$CLAUDE_CONFIG_FILE"
echo "✅ Copied configuration to Claude Desktop"

echo ""
echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Restart Claude Desktop completely"
echo "2. Look for 'HANA Database' in the tools list"
echo "3. Test with: 'Show me the schemas in my HANA database'"
echo ""
echo "📁 POC files:"
echo "   - mcp-server-final.js (MCP server)"
echo "   - claude_config.json (Claude Desktop config)"
echo "   - README.md (Basic instructions)"
echo "   - POC_DOCUMENTATION.md (Comprehensive docs)"
echo ""
echo "🔧 Troubleshooting:"
echo "   - Check POC_DOCUMENTATION.md for detailed troubleshooting"
echo "   - Test server manually: echo '{\"jsonrpc\":\"2.0\",\"id\":\"1\",\"method\":\"initialize\"}' | node mcp-server-final.js" 