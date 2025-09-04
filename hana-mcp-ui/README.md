# HANA MCP UI

[![npm version](https://img.shields.io/npm/v/hana-mcp-ui.svg)](https://www.npmjs.com/package/hana-mcp-ui)
[![npm downloads](https://img.shields.io/npm/dm/hana-mcp-ui.svg)](https://www.npmjs.com/package/hana-mcp-ui)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![MCP](https://badge.mcpx.dev?type=ui)](https://modelcontextprotocol.io/)

> **UI for managing HANA MCP server configurations with Claude Desktop integration.**

## 📋 Prerequisites

Before using HANA MCP UI, you must install the core HANA MCP server:

```bash
npm install -g hana-mcp-server
```

The UI is a management interface that works with the installed [hana-mcp-server](https://www.npmjs.com/package/hana-mcp-server) package.

## 🎯 Overview

HANA MCP UI provides an intuitive interface that simplifies database configuration management while maintaining the robust functionality of the existing CLI-based HANA MCP server. It allows you to manage multiple database environments (Production, Development, Staging) and deploy them seamlessly to Claude Desktop.

![HANA MCP UI](hana_mcp_ui.gif)

## ✨ Features

- **🌐 Web Interface**: Modern, responsive UI built with React
- **🔄 Multi-Environment Support**: Configure Production, Development, and Staging environments per server
- **🤖 Claude Desktop Integration**: Add configurations directly to Claude Desktop
- **⚙️ Environment Management**: Only one environment per database server active in Claude at a time
- **📊 Real-time Status**: Monitor configured and active servers
- **✅ Form Validation**: Comprehensive validation for database connection parameters
- **🚀 One-Command Launch**: NPX package for instant launch

## 🚀 Quick Start

Run the application with a single command:

```bash
npx hana-mcp-ui
```

This will:
1. 📦 Download and install the package (if not cached)
2. 🔧 Start the backend server on port 3001
3. ⚡ Start the React frontend on port 5173
4. 🌐 Automatically open your browser

## 🛠️ First-Time Setup

When you first run the application, you'll be prompted to configure your Claude Desktop config file path:

- **🍎 macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **🪟 Windows**: `%APPDATA%/Claude/claude_desktop_config.json`
- **🐧 Linux**: `~/.config/claude/claude_desktop_config.json`

The system will suggest the appropriate default path for your operating system.

## ⚙️ Configuration Schema

Each HANA server supports multiple environments with the following parameters:

### 🔑 Mandatory Fields
- `HANA_HOST`: Database hostname or IP address
- `HANA_PORT`: Database port (default: 443)
- `HANA_USER`: Database username
- `HANA_PASSWORD`: Database password
- `HANA_SCHEMA`: Default schema name

### 🔒 Optional Security Fields
- `HANA_SSL`: Enable SSL connection (default: true)
- `HANA_ENCRYPT`: Enable encryption (default: true)
- `HANA_VALIDATE_CERT`: Validate certificates (default: true)

### 📝 Optional Logging Fields
- `LOG_LEVEL`: Logging level (debug, info, warn, error)
- `ENABLE_FILE_LOGGING`: Enable file logging (default: true)
- `ENABLE_CONSOLE_LOGGING`: Enable console logging (default: false)

### 🤖 Claude Desktop Configuration

Update your Claude Desktop configuration file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`  
**Linux**: `~/.config/claude/claude_desktop_config.json`  
**Windows**: `%APPDATA%\claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "HANA Database": {
      "command": "hana-mcp-server",
      "env": {
        "HANA_HOST": "your-hana-host.com",
        "HANA_PORT": "443",
        "HANA_USER": "your-username",
        "HANA_PASSWORD": "your-password",
        "HANA_SCHEMA": "your-schema",
        "HANA_SSL": "true",
        "HANA_ENCRYPT": "true",
        "HANA_VALIDATE_CERT": "true",
        "LOG_LEVEL": "info"
      }
    }
  }
}
```

## 🔄 Usage Workflow

1. **➕ Add Server Configuration**: Click "Add Server" to create a new HANA database configuration
2. **⚙️ Configure Environments**: Set up Production, Development, and/or Staging environments
3. **💾 Save Configuration**: Store the server configuration locally
4. **🚀 Deploy to Claude**: Select an environment and deploy to Claude Desktop
5. **📊 Manage Active Servers**: Monitor and manage servers currently active in Claude

## 🔌 API Endpoints

The application runs a local Express backend with the following endpoints:

- `GET /api/hana-servers`: Get all local server configurations
- `POST /api/hana-servers`: Create new server configuration
- `PUT /api/hana-servers/:name`: Update existing server
- `DELETE /api/hana-servers/:name`: Delete server configuration
- `GET /api/claude`: Get servers active in Claude Desktop
- `POST /api/apply-to-claude`: Deploy server environment to Claude
- `DELETE /api/claude/:serverName`: Remove server from Claude
- `GET/POST /api/claude/config-path`: Manage Claude config path

## 🛠️ Development

### Development Mode
```bash
cd hana-mcp-ui
npm install
npm run dev
```

### Production Build
```bash
npm run build
npm run preview
```

## ⚡ Performance Specifications

- **🚀 Startup time**: < 5 seconds
- **📡 API response time**: < 500ms
- **🎯 UI interactions**: < 100ms
- **📦 Bundle size**: ~264KB (gzipped: ~83KB)

## 📋 Requirements

- **Node.js** 18.0.0 or higher
- **Claude Desktop** application (for deployment features)
- Access to SAP HANA database instances

## 🏗️ Architecture

- **Frontend**: React 19.1.1 with Vite build system
- **Backend**: Express.js REST API server
- **Launcher**: NPX CLI tool for one-command deployment
- **Storage**: Local file system for configurations
- **Integration**: Claude Desktop configuration management
- **Styling**: Inline styles with professional design system
- **State Management**: React hooks (useState, useEffect)
- **HTTP Client**: Axios for API communication
- **Notifications**: React Hot Toast for user feedback

## 📁 Project Structure

```
hana-mcp-ui/
├── bin/
│   └── cli.js              # NPX entry point launcher
├── server/
│   └── index.js            # Express backend server
├── src/
│   ├── main.jsx            # React entry point
│   ├── App.jsx             # Main app component
│   └── components/
│       └── ProfessionalApp.jsx  # Main UI component
├── dist/                   # Built React app (production)
├── data/                   # Local configuration storage
├── package.json            # Dependencies and scripts
├── vite.config.js          # Vite build configuration
└── index.html              # HTML template
```

## 💾 File Storage

- **📂 Server configurations** are stored locally in the application data directory
- **🤖 Claude Desktop configurations** are managed through the user-specified config file path
- **🔄 Automatic backups** are created before modifying Claude configurations

## 🔒 Security Features

- **🏠 Local-only API** (no external connections)
- **🔐 No sensitive data** in browser localStorage
- **👁️ Password fields** properly masked
- **🛡️ Secure file system** access patterns
- **💾 Automatic configuration** backups

## 🌐 Browser Compatibility

- **Chrome** 90+
- **Firefox** 88+
- **Safari** 14+
- **Edge** 90+

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

For issues or questions, please refer to the main HANA MCP Server documentation or create an issue in the repository.