/**
 * MCP Protocol Constants
 */

// MCP Protocol versions
const PROTOCOL_VERSIONS = {
  LATEST: '2024-11-05',
  SUPPORTED: ['2024-11-05', '2025-03-26']
};

// MCP Methods
const METHODS = {
  // Lifecycle
  INITIALIZE: 'initialize',
  NOTIFICATIONS_INITIALIZED: 'notifications/initialized',
  
  // Tools
  TOOLS_LIST: 'tools/list',
  TOOLS_CALL: 'tools/call',
  
  // Prompts
  PROMPTS_LIST: 'prompts/list',
  
  // Resources
  RESOURCES_LIST: 'resources/list',
  RESOURCES_READ: 'resources/read'
};

// JSON-RPC Error Codes
const ERROR_CODES = {
  // JSON-RPC 2.0 Standard Errors
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
  
  // MCP Specific Errors
  TOOL_NOT_FOUND: -32601,
  INVALID_TOOL_ARGS: -32602,
  DATABASE_ERROR: -32000,
  CONNECTION_ERROR: -32001,
  VALIDATION_ERROR: -32002
};

// Error Messages
const ERROR_MESSAGES = {
  [ERROR_CODES.PARSE_ERROR]: 'Parse error',
  [ERROR_CODES.INVALID_REQUEST]: 'Invalid Request',
  [ERROR_CODES.METHOD_NOT_FOUND]: 'Method not found',
  [ERROR_CODES.INVALID_PARAMS]: 'Invalid params',
  [ERROR_CODES.INTERNAL_ERROR]: 'Internal error',
  [ERROR_CODES.TOOL_NOT_FOUND]: 'Tool not found',
  [ERROR_CODES.INVALID_TOOL_ARGS]: 'Invalid tool arguments',
  [ERROR_CODES.DATABASE_ERROR]: 'Database error',
  [ERROR_CODES.CONNECTION_ERROR]: 'Connection error',
  [ERROR_CODES.VALIDATION_ERROR]: 'Validation error'
};

// Server Information
const SERVER_INFO = {
  name: 'HANA MCP Server',
  version: '1.0.0',
  description: 'Model Context Protocol server for SAP HANA databases'
};

// Capabilities
const CAPABILITIES = {
  tools: {},
  resources: {},
  prompts: {}
};

module.exports = {
  PROTOCOL_VERSIONS,
  METHODS,
  ERROR_CODES,
  ERROR_MESSAGES,
  SERVER_INFO,
  CAPABILITIES
}; 