/**
 * Query execution tools for HANA MCP Server
 */

const { logger } = require('../utils/logger');
const QueryExecutor = require('../database/query-executor');
const Validators = require('../utils/validators');
const Formatters = require('../utils/formatters');

class QueryTools {
  /**
   * Execute a custom SQL query
   */
  static async executeQuery(args) {
    logger.tool('hana_execute_query', args);
    
    const { query, parameters = [] } = args || {};
    
    // Validate required parameters
    const validation = Validators.validateRequired(args, ['query'], 'hana_execute_query');
    if (!validation.valid) {
      return Formatters.createErrorResponse('Error: query parameter is required', validation.error);
    }
    
    // Validate query
    const queryValidation = Validators.validateQuery(query);
    if (!queryValidation.valid) {
      return Formatters.createErrorResponse('Invalid query', queryValidation.error);
    }
    
    // Validate parameters
    const paramValidation = Validators.validateParameters(parameters);
    if (!paramValidation.valid) {
      return Formatters.createErrorResponse('Invalid parameters', paramValidation.error);
    }
    
    try {
      const results = await QueryExecutor.executeQuery(query, parameters);
      const formattedResults = Formatters.formatQueryResults(results, query);
      
      return Formatters.createResponse(formattedResults);
    } catch (error) {
      logger.error('Query execution failed:', error.message);
      return Formatters.createErrorResponse('Query execution failed', error.message);
    }
  }
}

module.exports = QueryTools; 