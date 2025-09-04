# SAP HANA MCP Server

[![npm version](https://img.shields.io/npm/v/hana-mcp-server.svg)](https://www.npmjs.com/package/hana-mcp-server)
[![npm downloads](https://img.shields.io/npm/dm/hana-mcp-server.svg)](https://www.npmjs.com/package/hana-mcp-server)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![MCP](https://badge.mcpx.dev?type=server)](https://modelcontextprotocol.io/)

> **Model Context Protocol (MCP) server for seamless SAP HANA database integration with AI agents and development tools.**

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Quick Setup](#quick-setup)
- [Configure Using UI](#ui-management)
- [Configuration](#configuration)
- [Usage](#usage)
- [API Reference](#api-reference)
- [Development](#development)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)
- [Acknowledgments](#acknowledgments)

## 🎯 Overview

<a name="overview"></a>

The SAP HANA MCP Server provides a robust, production-ready bridge between AI applications and SAP HANA databases through the Model Context Protocol (MCP). Designed for enterprise environments, it offers comprehensive database management capabilities with secure, scalable architecture.

**Available in two formats:**
- **CLI Server**: Command-line interface for direct integration
- **Web UI**: Professional React interface for visual configuration management

### Supported Platforms
- **AI Agents**: Custom AI Applications, Claude Desktop, VSCode Extensions 
- **Databases**: SAP HANA (All versions)
- **Operating Systems**: macOS, Linux, Windows
- **Node.js**: 18.x and above

## ✨ Key Features

<a name="key-features"></a>

### Enterprise Security
- **Secure Credential Management**: Environment-based configuration
- **SSL/TLS Support**: Full encryption for database communications
- **Certificate Validation**: Configurable certificate verification

### Database Operations
- **Schema Exploration**: Complete database schema discovery and navigation
- **Query Execution**: Advanced SQL query execution with parameterized support
- **Administrative Tools**: System monitoring, user management, and performance insights
- **Data Management**: Sample data retrieval, row counting, and metadata analysis

### Architecture Excellence
- **Modular Design**: Clean separation of concerns with maintainable codebase
- **Scalable Architecture**: Easy extension and customization for enterprise needs
- **Comprehensive Logging**: Structured logging with configurable levels
- **Error Handling**: Robust error management with detailed diagnostics

### Developer Experience
- **MCP Protocol Compliance**: Full Model Context Protocol 2.0 implementation
- **Tool Discovery**: Automatic tool registration and discovery
- **JSON-RPC 2.0**: Standardized communication protocol
- **Testing Framework**: Comprehensive testing suite with multiple validation methods

## 🏗️ Architecture

<a name="architecture"></a>

### System Architecture

![HANA MCP Server Architecture](docs/hana_mcp_architecture.svg)

### Component Architecture

```
hana-mcp-server/
├── 📁 src/
│   ├── 🏗️ server/           # MCP Protocol & Server Management
│   │   ├── index.js         # Main server entry point
│   │   ├── mcp-handler.js   # JSON-RPC 2.0 implementation
│   │   └── lifecycle-manager.js # Server lifecycle management
│   ├── 🛠️ tools/            # Tool Implementations
│   │   ├── index.js         # Tool registry & discovery
│   │   ├── config-tools.js  # Configuration management
│   │   ├── schema-tools.js  # Schema exploration
│   │   ├── table-tools.js   # Table operations
│   │   ├── index-tools.js   # Index management
│   │   └── query-tools.js   # Query execution
│   ├── 🗄️ database/         # Database Layer
│   │   ├── hana-client.js   # HANA client wrapper
│   │   ├── connection-manager.js # Connection management
│   │   └── query-executor.js # Query execution utilities
│   ├── 🔧 utils/            # Shared Utilities
│   │   ├── logger.js        # Structured logging
│   │   ├── config.js        # Configuration management
│   │   ├── validators.js    # Input validation
│   │   └── formatters.js    # Response formatting
│   └── 📋 constants/        # Constants & Definitions
│       ├── mcp-constants.js # MCP protocol constants
│       └── tool-definitions.js # Tool schemas
├── 🧪 tests/                # Testing Framework
├── 📚 docs/                 # Documentation
├── 📦 package.json          # Dependencies & Scripts
└── 🚀 hana-mcp-server.js    # Main entry point
```

## 📋 Prerequisites

<a name="prerequisites"></a>

### System Requirements
- **Node.js**: Version 18.x or higher
- **Memory**: Minimum 512MB RAM (2GB recommended)
- **Storage**: 100MB available disk space
- **Network**: Access to SAP HANA database

### Database Requirements
- **SAP HANA**: Version 2.0 or higher
- **User Permissions**: SELECT, DESCRIBE, and administrative privileges
- **Network Access**: TCP/IP connectivity to HANA instance

### Development Tools
- **Claude Desktop**: For AI agent integration
- **VSCode**: For development and testing (optional)
- **Git**: For version control

## 🚀 Quick Setup

<a name="quick-setup"></a>

### Step 1: Install the Package

```bash
npm install -g hana-mcp-server
```

### Step 2: Configure Claude Desktop

Update your Claude Desktop configuration file:

**macOS**: `~/.config/claude/claude_desktop_config.json`  
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
        "HANA_DATABASE": "your-tenant-database",
        "LOG_LEVEL": "info"
      }
    }
  }
}
```

### Step 3: Restart Claude Desktop

Close and reopen Claude Desktop to load the new configuration.

### Step 4: Test Connection

Ask Claude: "Test the HANA database connection" or "Show me the available schemas"

That's it! 🎉 Your HANA MCP Server is now ready to use.

## 🖥️ Configure Using UI

<a name="ui-management"></a>

For users who prefer a graphical interface, there is a **HANA MCP UI** - a React-based web application for managing server configurations.

![HANA MCP UI](docs/hana_mcp_ui.gif)

### 🌟 Why Use the UI?

- **Visual Configuration**: Intuitive web interface for server management
- **Multi-Environment Support**: Configure Production, Development, and Staging environments
- **Claude Desktop Integration**: Deploy configurations directly to Claude Desktop
- **Real-time Monitoring**: Visual status tracking of active servers
- **Backup & Restore**: Configuration management with history

### 🚀 Quick UI Setup

```bash
# Install and run the UI in one command
npx hana-mcp-ui
```

The UI will automatically:
1. Start a local web server on port 3001
2. Open your browser to the configuration interface
3. Guide you through server setup and Claude Desktop integration

### 📚 UI Documentation

For detailed UI documentation, configuration schemas, and advanced features, visit:
**[HANA MCP UI Documentation](https://www.npmjs.com/package/hana-mcp-ui)**

## ⚙️ Configuration

<a name="configuration"></a>

### Environment Variables

| Variable | Required | Description | Default |
|----------|----------|-------------|---------|
| `HANA_HOST` | ✅ | HANA database hostname | - |
| `HANA_PORT` | ✅ | HANA database port | `443` |
| `HANA_USER` | ✅ | Database username | - |
| `HANA_PASSWORD` | ✅ | Database password | - |
| `HANA_SCHEMA` | ❌ | Default schema | - |
| `HANA_SSL` | ❌ | Enable SSL connection | `true` |
| `HANA_ENCRYPT` | ❌ | Enable encryption | `true` |
| `HANA_VALIDATE_CERT` | ❌ | Validate SSL certificate | `true` |
| `HANA_DATABASE` | ❌ | HANA tenant database | - |
| `LOG_LEVEL` | ❌ | Logging level | `info` |

### Default Schema Behavior

The server intelligently handles schema selection:

| Scenario | Behavior |
|----------|----------|
| `HANA_SCHEMA` set | Uses default schema for optional parameters |
| `HANA_SCHEMA` not set | Requires explicit schema specification |
| Schema parameter provided | Overrides default schema |

## 🚀 Usage

<a name="usage"></a>

### Claude Desktop Integration

Once configured, you can interact with your HANA database using natural language:

- **"Show me all schemas in the database"**
- **"List tables in the SYSTEM schema"**
- **"Describe the structure of table CUSTOMERS"**
- **"Execute this query: SELECT * FROM SYSTEM.TABLES LIMIT 10"**
- **"Get sample data from table ORDERS"**

### Command Line Usage

You can also run the server directly:

```bash
# Start with environment variables
HANA_HOST="your-host" HANA_USER="your-user" HANA_PASSWORD="your-pass" hana-mcp-server

# Or set environment variables first
export HANA_HOST="your-host"
export HANA_USER="your-user"
export HANA_PASSWORD="your-pass"
hana-mcp-server
```

## 📚 API Reference

<a name="api-reference"></a>

### Configuration Tools

| Tool | Description | Parameters |
|------|-------------|------------|
| `hana_show_config` | Display current HANA configuration | None |
| `hana_test_connection` | Test database connectivity | None |
| `hana_show_env_vars` | Show environment variables (debug) | None |

### Schema Exploration Tools

| Tool | Description | Parameters |
|------|-------------|------------|
| `hana_list_schemas` | List all database schemas | None |
| `hana_list_tables` | List tables in a schema | `schema_name` (optional) |
| `hana_describe_table` | Show table structure | `schema_name`, `table_name` |
| `hana_list_indexes` | List indexes for a table | `schema_name`, `table_name` |
| `hana_describe_index` | Show index details | `schema_name`, `table_name`, `index_name` |

### Query Execution Tools

| Tool | Description | Parameters |
|------|-------------|------------|
| `hana_execute_query` | Execute SQL queries | `query` |
| `hana_execute_parameterized_query` | Execute parameterized queries | `query`, `parameters` |
| `hana_get_sample_data` | Get sample data from table | `schema_name`, `table_name`, `limit` |
| `hana_count_rows` | Count rows in a table | `schema_name`, `table_name` |

### Administrative Tools

| Tool | Description | Parameters |
|------|-------------|------------|
| `hana_get_system_info` | Get system information | None |
| `hana_get_user_info` | Get current user information | None |
| `hana_get_memory_usage` | Get memory usage statistics | None |

### Tool Response Format

All tools return standardized JSON responses:

```json
{
  "content": [
    {
      "type": "text",
      "text": "Tool execution result"
    }
  ],
  "isError": false,
  "error": null
}
```

## 🔧 Development

<a name="development"></a>

### Development Setup

```bash
# Clone repository
git clone https://github.com/hatrigt/hana-mcp-server.git
cd hana-mcp-server

# Install dependencies
npm install

# Start development server with auto-reload
npm run dev
```

### Adding New Tools

#### 1. Create Tool Implementation

```javascript
// src/tools/my-tools.js
const { logger } = require('../utils/logger');
const Formatters = require('../utils/formatters');

class MyTools {
  static async myNewTool(args) {
    logger.tool('my_new_tool', args);
    
    try {
      // Tool implementation
      const result = await this.performOperation(args);
      
      return Formatters.createResponse(result);
    } catch (error) {
      logger.error('Tool execution failed', error);
      return Formatters.createErrorResponse(error.message);
    }
  }
  
  static async performOperation(args) {
    // Tool logic implementation
    return "Operation completed successfully";
  }
}

module.exports = MyTools;
```

#### 2. Register Tool

```javascript
// src/tools/index.js
const MyTools = require('./my-tools');

const TOOL_IMPLEMENTATIONS = {
  // ... existing tools
  my_new_tool: MyTools.myNewTool
};
```

#### 3. Define Tool Schema

```javascript
// src/constants/tool-definitions.js
{
  name: "my_new_tool",
  description: "Performs a specific operation with detailed description",
  inputSchema: {
    type: "object",
    properties: {
      parameter1: {
        type: "string",
        description: "Description of parameter1"
      },
      parameter2: {
        type: "number",
        description: "Description of parameter2"
      }
    },
    required: ["parameter1"]
  }
}
```

### Development Scripts

```json
{
  "scripts": {
    "start": "node hana-mcp-server.js",
    "dev": "nodemon hana-mcp-server.js",
    "test": "node tests/automated/test-mcp-inspector.js"
  }
}
```

## 🐛 Troubleshooting

<a name="troubleshooting"></a>

### Common Issues & Solutions

#### Connection Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| "Connection refused" | Network connectivity | Verify HANA host and port accessibility |
| "Authentication failed" | Invalid credentials | Check username/password in configuration |
| "SSL certificate error" | Certificate validation | Configure `HANA_VALIDATE_CERT=false` or install valid certificates |

#### MCP Protocol Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| "MCP server not visible" | Configuration path | Verify Claude Desktop config file location |
| "Tools disabled" | Protocol compliance | Check JSON-RPC implementation and tool structure |
| "Handler is not a function" | Tool registration | Verify tool implementation and registration |

### Debugging

#### Enable Debug Logging

```bash
# Set debug logging
export LOG_LEVEL="debug"
export ENABLE_FILE_LOGGING="true"
export ENABLE_CONSOLE_LOGGING="true"

# Monitor logs
tail -f hana-mcp-server.log
```

#### Manual Server Testing

```bash
# Test with minimal configuration
HANA_HOST="test" HANA_USER="test" HANA_PASSWORD="test" hana-mcp-server

# Test specific functionality
echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"hana_test_connection","arguments":{}}}' | hana-mcp-server
```

### Error Codes

The server uses standard JSON-RPC 2.0 error codes:

| Code | Description | Action |
|------|-------------|--------|
| `-32700` | Parse error | Check JSON format |
| `-32600` | Invalid request | Verify request structure |
| `-32601` | Method not found | Check method name |
| `-32602` | Invalid params | Verify parameter format |
| `-32603` | Internal error | Check server logs |

## 🤝 Contributing

<a name="contributing"></a>

We welcome contributions from the community! Please follow these guidelines:

### Contribution Process

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Make your changes** following coding standards
4. **Add tests** for new functionality
5. **Update documentation** as needed
6. **Test thoroughly** using MCP Inspector
7. **Submit a pull request** with detailed description

### Development Guidelines

- **Code Style**: Follow existing code patterns
- **Testing**: Test new features with MCP Inspector
- **Documentation**: Update README and inline documentation
- **Security**: Follow security best practices for database operations
- **Performance**: Consider performance implications of changes

### Pull Request Template

We use a standardized PR template. When you create a pull request, GitHub will automatically load the template with the following sections:

- **Description**: Brief description of changes
- **Type of Change**: Bug fix, new feature, documentation, or performance improvement
- **Testing**: MCP Inspector tests, manual testing, and breaking change verification
- **Checklist**: Code review, documentation, and quality checks

The template is located at `.github/pull_request_template.md`

## 📄 License

<a name="license"></a>

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

### License Summary

- **Commercial Use**: ✅ Allowed
- **Modification**: ✅ Allowed
- **Distribution**: ✅ Allowed
- **Private Use**: ✅ Allowed
- **Liability**: ❌ No liability
- **Warranty**: ❌ No warranty

## 🙏 Acknowledgments

<a name="acknowledgments"></a>

- **SAP** for HANA database technology and support
- **Anthropic** for Claude Desktop and MCP specification
- **MCP Community** for protocol development and standards
- **Open Source Contributors** for valuable feedback and contributions
