const schemaTools = require('./schema');
const queryTools = require('./query');
const adminTools = require('./admin');
const configTools = require('./config');
const { logger } = require('../utils/custom-logger');

/**
 * Register all available tools with the HANA client
 * @param {Object} hanaClient - HANA client instance
 * @returns {Object} Map of tool names to handler functions
 */
function registerTools(hanaClient) {
  // Get all tools
  const allTools = {
    // Configuration and connection tools
    ...configTools(hanaClient),
    
    // Schema exploration tools
    ...schemaTools(hanaClient),
    
    // Query execution tools
    ...queryTools(hanaClient),
    
    // Administrative tools
    ...adminTools(hanaClient)
  };

  // Convert tool objects to handler functions
  const toolHandlers = {};
  
  Object.entries(allTools).forEach(([name, tool]) => {
    if (typeof tool === 'function') {
      // Legacy format - direct function
      toolHandlers[name] = tool;
    } else if (tool && typeof tool.handler === 'function') {
      // New format - object with handler
      toolHandlers[name] = async (args) => {
        return await tool.handler(args);
      };
      
      // Copy metadata
      toolHandlers[name].description = tool.description;
      toolHandlers[name].inputSchema = tool.inputSchema;
      toolHandlers[name].readOnly = tool.readOnly;
      toolHandlers[name].annotations = tool.annotations;
    } else {
      logger.warn(`Invalid tool format for ${name}`);
    }
  });

  // Add metadata to each tool function
  Object.entries(toolHandlers).forEach(([name, fn]) => {
    // Add description if not present
    if (!fn.description) {
      fn.description = `Execute ${name} tool`;
    }
    
    // Add inputSchema if not present (correct MCP format)
    if (!fn.inputSchema) {
      fn.inputSchema = {
        type: 'object',
        properties: {},
        required: []
      };
    }
    
    // Add annotations for better Claude Desktop visibility
    if (!fn.annotations) {
      fn.annotations = {
        title: fn.description || name,
        readOnlyHint: fn.readOnly ? 'This tool is read-only' : undefined
      };
    }
  });

  return toolHandlers;
}

module.exports = {
  registerTools
};
