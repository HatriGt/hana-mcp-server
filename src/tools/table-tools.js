/**
 * Table management tools for HANA MCP Server
 */

const { logger } = require('../utils/logger');
const QueryExecutor = require('../database/query-executor');
const Validators = require('../utils/validators');
const Formatters = require('../utils/formatters');

class TableTools {
  /**
   * List tables in a schema
   */
  static async listTables(args) {
    logger.tool('hana_list_tables', args);
    
    const { schema_name } = args || {};
    
    // Validate required parameters
    const validation = Validators.validateRequired(args, ['schema_name'], 'hana_list_tables');
    if (!validation.valid) {
      return Formatters.createErrorResponse('Error: schema_name parameter is required', validation.error);
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
    
    const { schema_name, table_name } = args || {};
    
    // Validate required parameters
    const validation = Validators.validateRequired(args, ['schema_name', 'table_name'], 'hana_describe_table');
    if (!validation.valid) {
      return Formatters.createErrorResponse('Error: Both schema_name and table_name parameters are required', validation.error);
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