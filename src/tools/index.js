/**
 * Tool registry and management for HANA MCP Server
 */

const { logger } = require('../utils/logger');
const { TOOLS } = require('../constants/tool-definitions');
const ConfigTools = require('./config-tools');
const SchemaTools = require('./schema-tools');
const TableTools = require('./table-tools');
const IndexTools = require('./index-tools');
const QueryTools = require('./query-tools');

// Tool implementations mapping
const TOOL_IMPLEMENTATIONS = {
  hana_show_config: ConfigTools.showConfig,
  hana_test_connection: ConfigTools.testConnection,
  hana_show_env_vars: ConfigTools.showEnvVars,
  hana_list_schemas: SchemaTools.listSchemas,
  hana_list_tables: TableTools.listTables,
  hana_describe_table: TableTools.describeTable,
  hana_list_indexes: IndexTools.listIndexes,
  hana_describe_index: IndexTools.describeIndex,
  hana_execute_query: QueryTools.executeQuery
};

class ToolRegistry {
  /**
   * Get all available tools
   */
  static getTools() {
    return TOOLS;
  }

  /**
   * Get tool by name
   */
  static getTool(name) {
    return TOOLS.find(tool => tool.name === name);
  }

  /**
   * Check if tool exists
   */
  static hasTool(name) {
    return TOOL_IMPLEMENTATIONS.hasOwnProperty(name);
  }

  /**
   * Execute a tool
   */
  static async executeTool(name, args) {
    if (!this.hasTool(name)) {
      throw new Error(`Tool not found: ${name}`);
    }

    const implementation = TOOL_IMPLEMENTATIONS[name];
    if (typeof implementation !== 'function') {
      throw new Error(`Tool implementation not found: ${name}`);
    }

    try {
      logger.debug(`Executing tool: ${name}`, args);
      const result = await implementation(args);
      logger.debug(`Tool ${name} executed successfully`);
      return result;
    } catch (error) {
      logger.error(`Tool ${name} execution failed:`, error.message);
      throw error;
    }
  }

  /**
   * Get tool implementation
   */
  static getToolImplementation(name) {
    return TOOL_IMPLEMENTATIONS[name];
  }

  /**
   * Get all tool names
   */
  static getAllToolNames() {
    return Object.keys(TOOL_IMPLEMENTATIONS);
  }

  /**
   * Validate tool arguments against schema
   */
  static validateToolArgs(name, args) {
    const tool = this.getTool(name);
    if (!tool) {
      return { valid: false, error: `Tool not found: ${name}` };
    }

    const schema = tool.inputSchema;
    if (!schema || !schema.required) {
      return { valid: true }; // No validation required
    }

    const missing = [];
    for (const field of schema.required) {
      if (!args || args[field] === undefined || args[field] === null || args[field] === '') {
        missing.push(field);
      }
    }

    if (missing.length > 0) {
      return { 
        valid: false, 
        error: `Missing required parameters: ${missing.join(', ')}` 
      };
    }

    return { valid: true };
  }
}

module.exports = ToolRegistry; 