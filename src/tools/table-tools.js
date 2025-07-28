/**
 * Table management tools for HANA MCP Server
 */

const { logger } = require('../utils/logger');
const { config } = require('../utils/config');
const QueryExecutor = require('../database/query-executor');
const Validators = require('../utils/validators');
const Formatters = require('../utils/formatters');

class TableTools {
  /**
   * List tables in a schema
   */
  static async listTables(args) {
    logger.tool('hana_list_tables', args);
    
    let { schema_name } = args || {};
    
    // Use default schema if not provided
    if (!schema_name) {
      if (config.hasDefaultSchema()) {
        schema_name = config.getDefaultSchema();
        logger.info(`Using default schema: ${schema_name}`);
      } else {
        return Formatters.createErrorResponse(
          'Schema name is required', 
          'Please provide schema_name parameter or set HANA_SCHEMA environment variable'
        );
      }
    }
    
    // Validate schema name
    const schemaValidation = Validators.validateSchemaName(schema_name);
    if (!schemaValidation.valid) {
      return Formatters.createErrorResponse('Invalid schema name', schemaValidation.error);
    }
    
    try {
      const tables = await QueryExecutor.getTables(schema_name);
      const formattedTables = Formatters.formatTableList(tables, schema_name);
      
      return Formatters.createResponse(formattedTables);
    } catch (error) {
      logger.error('Error listing tables:', error.message);
      return Formatters.createErrorResponse('Error listing tables', error.message);
    }
  }

  /**
   * Describe table structure
   */
  static async describeTable(args) {
    logger.tool('hana_describe_table', args);
    
    let { schema_name, table_name } = args || {};
    
    // Use default schema if not provided
    if (!schema_name) {
      if (config.hasDefaultSchema()) {
        schema_name = config.getDefaultSchema();
        logger.info(`Using default schema: ${schema_name}`);
      } else {
        return Formatters.createErrorResponse(
          'Schema name is required', 
          'Please provide schema_name parameter or set HANA_SCHEMA environment variable'
        );
      }
    }
    
    // Validate required parameters
    const validation = Validators.validateRequired(args, ['table_name'], 'hana_describe_table');
    if (!validation.valid) {
      return Formatters.createErrorResponse('Error: table_name parameter is required', validation.error);
    }
    
    // Validate schema and table names
    const schemaValidation = Validators.validateSchemaName(schema_name);
    if (!schemaValidation.valid) {
      return Formatters.createErrorResponse('Invalid schema name', schemaValidation.error);
    }
    
    const tableValidation = Validators.validateTableName(table_name);
    if (!tableValidation.valid) {
      return Formatters.createErrorResponse('Invalid table name', tableValidation.error);
    }
    
    try {
      const columns = await QueryExecutor.getTableColumns(schema_name, table_name);
      
      if (columns.length === 0) {
        return Formatters.createErrorResponse(`Table '${schema_name}.${table_name}' not found or no columns available`);
      }
      
      const formattedStructure = Formatters.formatTableStructure(columns, schema_name, table_name);
      
      return Formatters.createResponse(formattedStructure);
    } catch (error) {
      logger.error('Error describing table:', error.message);
      return Formatters.createErrorResponse('Error describing table', error.message);
    }
  }
}

module.exports = TableTools; 