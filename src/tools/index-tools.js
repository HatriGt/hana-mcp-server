/**
 * Index management tools for HANA MCP Server
 */

const { logger } = require('../utils/logger');
const QueryExecutor = require('../database/query-executor');
const Validators = require('../utils/validators');
const Formatters = require('../utils/formatters');

class IndexTools {
  /**
   * List indexes for a table
   */
  static async listIndexes(args) {
    logger.tool('hana_list_indexes', args);
    
    const { schema_name, table_name } = args || {};
    
    // Validate required parameters
    const validation = Validators.validateRequired(args, ['schema_name', 'table_name'], 'hana_list_indexes');
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
      const results = await QueryExecutor.getTableIndexes(schema_name, table_name);
      
      if (results.length === 0) {
        return Formatters.createResponse(`📋 No indexes found for table '${schema_name}.${table_name}'.`);
      }
      
      // Group by index name
      const indexMap = {};
      results.forEach(row => {
        if (!indexMap[row.INDEX_NAME]) {
          indexMap[row.INDEX_NAME] = {
            type: row.INDEX_TYPE,
            isUnique: row.IS_UNIQUE === 'TRUE',
            columns: []
          };
        }
        indexMap[row.INDEX_NAME].columns.push(row.COLUMN_NAME);
      });
      
      const formattedIndexes = Formatters.formatIndexList(indexMap, schema_name, table_name);
      
      return Formatters.createResponse(formattedIndexes);
    } catch (error) {
      logger.error('Error listing indexes:', error.message);
      return Formatters.createErrorResponse('Error listing indexes', error.message);
    }
  }

  /**
   * Describe index details
   */
  static async describeIndex(args) {
    logger.tool('hana_describe_index', args);
    
    const { schema_name, table_name, index_name } = args || {};
    
    // Validate required parameters
    const validation = Validators.validateRequired(args, ['schema_name', 'table_name', 'index_name'], 'hana_describe_index');
    if (!validation.valid) {
      return Formatters.createErrorResponse('Error: schema_name, table_name, and index_name parameters are required', validation.error);
    }
    
    // Validate schema, table, and index names
    const schemaValidation = Validators.validateSchemaName(schema_name);
    if (!schemaValidation.valid) {
      return Formatters.createErrorResponse('Invalid schema name', schemaValidation.error);
    }
    
    const tableValidation = Validators.validateTableName(table_name);
    if (!tableValidation.valid) {
      return Formatters.createErrorResponse('Invalid table name', tableValidation.error);
    }
    
    const indexValidation = Validators.validateIndexName(index_name);
    if (!indexValidation.valid) {
      return Formatters.createErrorResponse('Invalid index name', indexValidation.error);
    }
    
    try {
      const results = await QueryExecutor.getIndexDetails(schema_name, table_name, index_name);
      
      const formattedDetails = Formatters.formatIndexDetails(results, schema_name, table_name, index_name);
      
      return Formatters.createResponse(formattedDetails);
    } catch (error) {
      logger.error('Error describing index:', error.message);
      return Formatters.createErrorResponse('Error describing index', error.message);
    }
  }
}

module.exports = IndexTools; 