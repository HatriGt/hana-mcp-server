/**
 * MCP Protocol Adapter for HANA MCP Server
 * This adapter ensures proper JSON-RPC formatting for MCP protocol
 */

const { logger } = require('./utils/logger');

/**
 * Format a tool result according to MCP protocol
 * @param {string} id - Request ID
 * @param {any} result - Tool execution result
 * @returns {Object} MCP protocol formatted response
 */
function formatToolResponse(id, result) {
  return {
    jsonrpc: '2.0',
    id,
    result
  };
}

/**
 * Format an error according to MCP protocol
 * @param {string} id - Request ID
 * @param {number} code - Error code
 * @param {string} message - Error message
 * @returns {Object} MCP protocol formatted error
 */
function formatErrorResponse(id, code, message) {
  return {
    jsonrpc: '2.0',
    id,
    error: {
      code,
      message
    }
  };
}

/**
 * Process an MCP request
 * @param {Object} request - MCP request
 * @param {Object} tools - Map of tool handlers
 * @returns {Object} MCP response
 */
async function processMcpRequest(request, tools) {
  try {
    const { id, method, params } = request;
    
    logger.info(`Processing MCP method: ${method}`);
    
    switch (method) {
      case 'initialize':
        logger.info('Initializing server');
        return {
          jsonrpc: '2.0',
          id,
          result: {
            protocolVersion: '2024-11-05',
            capabilities: {
              tools: {}
            },
            serverInfo: {
              name: 'HANA MCP Server',
              version: '1.0.0'
            }
          }
        };
        
      case 'tools/list':
        logger.info('Listing tools');
        const toolsList = Object.entries(tools).map(([name, handler]) => ({
          name,
          description: handler.description || `Execute ${name} tool`,
          inputSchema: handler.inputSchema || {
            type: 'object',
            properties: {},
            required: []
          },
          annotations: {
            title: handler.description || name,
            readOnlyHint: handler.readOnly ? 'This tool is read-only' : undefined
          }
        }));
        
        return formatToolResponse(id, { tools: toolsList });
        
      case 'tools/call': // Correct method name for tool execution
        const { name, arguments: args } = params;
        logger.info(`Calling tool: ${name}`);
        
        if (!tools[name]) {
          return formatErrorResponse(id, -32601, `Tool not found: ${name}`);
        }
        
        try {
          const result = await tools[name](args || {});
          return formatToolResponse(id, result);
        } catch (error) {
          logger.error(`Error executing tool ${name}:`, error);
          return formatErrorResponse(id, -32000, error.message);
        }
        
      case 'prompts/list': // Added for Claude Desktop compatibility
        logger.info('Listing prompts');
        return formatToolResponse(id, {
          prompts: [
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
          ]
        });
        
      case 'notifications/initialized': // Handle client's initialized notification
        logger.info('Server initialized');
        return null; // No response for notifications
        
      default:
        logger.warn(`Unknown method: ${method}`);
        return formatErrorResponse(id, -32601, `Method not found: ${method}`);
    }
  } catch (error) {
    logger.error('Error processing MCP request:', error);
    return formatErrorResponse(request.id || null, -32603, 'Internal error');
  }
}

module.exports = {
  processMcpRequest,
  formatToolResponse,
  formatErrorResponse
};
