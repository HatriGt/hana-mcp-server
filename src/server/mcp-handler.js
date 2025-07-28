/**
 * MCP Protocol Handler for JSON-RPC 2.0 communication
 */

const { logger } = require('../utils/logger');
const { METHODS, ERROR_CODES, ERROR_MESSAGES, PROTOCOL_VERSIONS, SERVER_INFO, CAPABILITIES } = require('../constants/mcp-constants');
const ToolRegistry = require('../tools');

class MCPHandler {
  /**
   * Handle MCP request
   */
  static async handleRequest(request) {
    const { id, method, params } = request;
    
    logger.method(method);
    
    try {
      switch (method) {
        case METHODS.INITIALIZE:
          return this.handleInitialize(id, params);
          
        case METHODS.TOOLS_LIST:
          return this.handleToolsList(id, params);
          
        case METHODS.TOOLS_CALL:
          return this.handleToolsCall(id, params);
          
        case METHODS.NOTIFICATIONS_INITIALIZED:
          return this.handleInitialized(id, params);
          
        case METHODS.PROMPTS_LIST:
          return this.handlePromptsList(id, params);
          
        default:
          return this.createErrorResponse(id, ERROR_CODES.METHOD_NOT_FOUND, `Method not found: ${method}`);
      }
    } catch (error) {
      logger.error(`Error handling request: ${error.message}`);
      return this.createErrorResponse(id, ERROR_CODES.INTERNAL_ERROR, error.message);
    }
  }

  /**
   * Handle initialize request
   */
  static handleInitialize(id, params) {
    logger.info('Initializing server');
    
    return {
      jsonrpc: '2.0',
      id,
      result: {
        protocolVersion: PROTOCOL_VERSIONS.LATEST,
        capabilities: CAPABILITIES,
        serverInfo: SERVER_INFO
      }
    };
  }

  /**
   * Handle tools/list request
   */
  static handleToolsList(id, params) {
    logger.info('Listing tools');
    
    const tools = ToolRegistry.getTools();
    
    return {
      jsonrpc: '2.0',
      id,
      result: { tools }
    };
  }

  /**
   * Handle tools/call request
   */
  static async handleToolsCall(id, params) {
    const { name, arguments: args } = params;
    
    logger.tool(name, args);
    
    // Validate tool exists
    if (!ToolRegistry.hasTool(name)) {
      return this.createErrorResponse(id, ERROR_CODES.TOOL_NOT_FOUND, `Tool not found: ${name}`);
    }
    
    // Validate tool arguments
    const validation = ToolRegistry.validateToolArgs(name, args);
    if (!validation.valid) {
      return this.createErrorResponse(id, ERROR_CODES.INVALID_PARAMS, validation.error);
    }
    
    try {
      const result = await ToolRegistry.executeTool(name, args);
      
      return {
        jsonrpc: '2.0',
        id,
        result
      };
    } catch (error) {
      logger.error(`Tool execution failed: ${error.message}`);
      return this.createErrorResponse(id, ERROR_CODES.INTERNAL_ERROR, error.message);
    }
  }

  /**
   * Handle notifications/initialized
   */
  static handleInitialized(id, params) {
    logger.info('Server initialized');
    return null; // No response for notifications
  }

  /**
   * Handle prompts/list request
   */
  static handlePromptsList(id, params) {
    logger.info('Listing prompts');
    
    const prompts = [
      {
        name: "hana_query_builder",
        description: "Build a SQL query for HANA database",
        template: "I need to build a SQL query for HANA database that {{goal}}."
      },
      {
        name: "hana_schema_explorer",
        description: "Explore HANA database schemas and tables",
        template: "I want to explore the schemas and tables in my HANA database."
      },
      {
        name: "hana_connection_test",
        description: "Test HANA database connection",
        template: "Please test my HANA database connection and show the configuration."
      }
    ];
    
    return {
      jsonrpc: '2.0',
      id,
      result: { prompts }
    };
  }

  /**
   * Create error response
   */
  static createErrorResponse(id, code, message) {
    return {
      jsonrpc: '2.0',
      id,
      error: {
        code,
        message: message || ERROR_MESSAGES[code] || 'Unknown error'
      }
    };
  }

  /**
   * Validate JSON-RPC request
   */
  static validateRequest(request) {
    if (!request || typeof request !== 'object') {
      return { valid: false, error: 'Invalid request: must be an object' };
    }

    if (request.jsonrpc !== '2.0') {
      return { valid: false, error: 'Invalid JSON-RPC version' };
    }

    if (!request.method) {
      return { valid: false, error: 'Missing method' };
    }

    if (typeof request.method !== 'string') {
      return { valid: false, error: 'Method must be a string' };
    }

    return { valid: true };
  }
}

module.exports = MCPHandler; 