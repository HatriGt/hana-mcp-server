/**
 * Schema exploration tools for HANA MCP Server
 */

const { logger } = require('../utils/logger');
const QueryExecutor = require('../database/query-executor');
const Formatters = require('../utils/formatters');

class SchemaTools {
  /**
   * List all schemas
   */
  static async listSchemas(args) {
    logger.tool('hana_list_schemas');
    
    try {
      const schemas = await QueryExecutor.getSchemas();
      const formattedSchemas = Formatters.formatSchemaList(schemas);
      
      return Formatters.createResponse(formattedSchemas);
    } catch (error) {
      logger.error('Error listing schemas:', error.message);
      return Formatters.createErrorResponse('Error listing schemas', error.message);
    }
  }
}

module.exports = SchemaTools; 