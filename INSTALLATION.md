# Installation Guide

## Quick Installation

### Global Installation (Recommended)

```bash
npm install -g hana-mcp-server
```

After installation, you can run the server directly:

```bash
hana-mcp-server
```

### Local Installation

```bash
npm install hana-mcp-server
```

Then run it using npx:

```bash
npx hana-mcp-server
```

## Configuration

### Environment Variables

Set up your HANA database connection:

```bash
export HANA_HOST="your-hana-host.com"
export HANA_PORT="443"
export HANA_USER="your-username"
export HANA_PASSWORD="your-password"
export HANA_SCHEMA="your-schema"
export HANA_SSL="true"
export HANA_ENCRYPT="true"
export HANA_VALIDATE_CERT="true"
```

### Claude Desktop Configuration

Update your Claude Desktop configuration file:

**macOS**: `~/.config/claude/claude_desktop_config.json`
**Linux**: `~/.config/claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "SAP HANA Database": {
      "command": "hana-mcp-server",
      "env": {
        "HANA_HOST": "your-hana-host.com",
        "HANA_PORT": "443",
        "HANA_USER": "your-username",
        "HANA_PASSWORD": "your-password",
        "HANA_SCHEMA": "your-schema",
        "HANA_SSL": "true",
        "HANA_ENCRYPT": "true",
        "HANA_VALIDATE_CERT": "true"
      }
    }
  }
}
```

## Usage

### Command Line

```bash
# Start the server
hana-mcp-server

# With environment variables
HANA_HOST="your-host" HANA_USER="your-user" hana-mcp-server
```

### Claude Desktop Integration

1. Install the package globally
2. Update your Claude Desktop configuration
3. Restart Claude Desktop
4. Use natural language to interact with your HANA database

### Available Tools

- `hana_test_connection` - Test database connectivity
- `hana_list_schemas` - List all schemas
- `hana_list_tables` - List tables in a schema
- `hana_describe_table` - Show table structure
- `hana_execute_query` - Execute SQL queries
- `hana_get_sample_data` - Get sample data from tables
- And many more...

## Requirements

- Node.js 18.x or higher
- SAP HANA database access
- Valid HANA credentials

## Support

- **Documentation**: [GitHub Repository](https://github.com/hatrigt/hana-mcp-server)
- **Issues**: [GitHub Issues](https://github.com/hatrigt/hana-mcp-server/issues)
- **License**: MIT 