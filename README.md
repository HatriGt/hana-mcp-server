# HANA Cloud MCP Server

A Model Context Protocol (MCP) server implementation for SAP HANA Cloud DB integration with Cursor IDE.

## Overview

This server implements the Model Context Protocol (MCP) pattern for machine learning operations with SAP HANA Cloud. The MCP server provides a standardized interface for managing ML models, execution contexts, and communication protocols between applications and the HANA Cloud database.

Key features:
- **Model Registry**: Central repository for model metadata and versioning
- **Context Management**: Configure execution environments for models
- **Protocol Adapters**: Standardized communication between models and applications
- **HANA Cloud Integration**: Optimized for SAP HANA Cloud Database
- **Cursor IDE Support**: Seamless integration with Cursor IDE

## Architecture

The MCP server is built on a three-layer architecture:

1. **Model Layer**: Manages model definitions, versions, and metadata
2. **Context Layer**: Configures execution environments and runtime parameters
3. **Protocol Layer**: Handles communication between applications and models

```
┌───────────────────────────────────────────────────────┐
│                   CLIENT APPLICATIONS                  │
└───────────────────────────▲───────────────────────────┘
                            │
                            │ REST API
                            │
┌───────────────────────────▼───────────────────────────┐
│                       MCP SERVER                       │
│                                                       │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐ │
│  │  MODEL API  │    │ CONTEXT API │    │PROTOCOL API │ │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘ │
│         │                  │                  │        │
│  ┌──────▼──────┐    ┌──────▼──────┐    ┌──────▼──────┐ │
│  │    MODEL    │    │   CONTEXT   │    │  PROTOCOL   │ │
│  │   MANAGER   │    │   MANAGER   │    │   MANAGER   │ │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘ │
│         │                  │                  │        │
└─────────┼──────────────────┼──────────────────┼────────┘
          │                  │                  │
┌─────────▼──────────────────▼──────────────────▼────────┐
│                     HANA CLOUD DB                       │
└───────────────────────────────────────────────────────┘
```

## Prerequisites

- Python 3.8+
- SAP HANA Cloud Database
- Flask
- HDBCLI (SAP HANA Client for Python)
- Pandas

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/hana-mcp-server.git
   cd hana-mcp-server
   ```

2. Create a virtual environment and install dependencies:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

3. Run the setup script:
   ```bash
   python setup.py
   ```
   
   Follow the prompts to configure your HANA Cloud connection and server settings.

## Configuration

The server uses environment variables for configuration. These can be set in a `.env` file:

```
# HANA Cloud Connection
HANA_HOST=your-hana-host.hanacloud.ondemand.com
HANA_PORT=443
HANA_USER=DBADMIN
HANA_PASSWORD=