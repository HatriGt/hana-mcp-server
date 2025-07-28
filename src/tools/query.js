const { logger } = require('../utils/custom-logger');
const { validateQuery } = require('../utils/security');

/**
 * Create query execution tools
 * @param {Object} hanaClient - HANA client instance
 * @returns {Object} Map of tool names to handler functions
 */
function queryTools(hanaClient) {
  return {
    /**
     * Execute a read-only SQL query
     * @param {Object} params - Tool parameters
     * @param {string} params.query - SQL query to execute
     * @param {Array} params.params - Query parameters (optional)
     * @returns {Promise<Object>} Query results
     */
    hana_execute_query: async (params) => {
      try {
        const { query, params: queryParams = [] } = params;
        
        if (!query) {
          throw new Error('query parameter is required');
        }
        
        // Validate query for security
        validateQuery(query);
        
        const results = await hanaClient.query(query, queryParams);
        
        return {
          results,
          rowCount: results.length
        };
      } catch (error) {
        logger.error('Error executing query:', error);
        throw new Error(`Query execution failed: ${error.message}`);
      }
    },
    
    /**
     * Execute a parameterized SQL query
     * @param {Object} params - Tool parameters
     * @param {string} params.query - SQL query to execute
     * @param {Object} params.params - Named parameters
     * @returns {Promise<Object>} Query results
     */
    hana_execute_parameterized_query: async (params) => {
      try {
        const { query, params: namedParams = {} } = params;
        
        if (!query) {
          throw new Error('query parameter is required');
        }
        
        // Validate query for security
        validateQuery(query);
        
        // Convert named parameters to positional parameters
        const paramNames = Object.keys(namedParams);
        const paramValues = paramNames.map(name => namedParams[name]);
        
        // Replace named parameters with ? placeholders
        let processedQuery = query;
        paramNames.forEach(name => {
          // Replace :name or :name: style parameters
          const regex = new RegExp(`:${name}\\b|:${name}:`, 'g');
          processedQuery = processedQuery.replace(regex, '?');
        });
        
        const results = await hanaClient.query(processedQuery, paramValues);
        
        return {
          results,
          rowCount: results.length
        };
      } catch (error) {
        logger.error('Error executing parameterized query:', error);
        throw new Error(`Parameterized query execution failed: ${error.message}`);
      }
    },
    
    /**
     * Get sample data from a table
     * @param {Object} params - Tool parameters
     * @param {string} params.schema_name - Schema name
     * @param {string} params.table_name - Table name
     * @param {number} params.limit - Maximum number of rows to return (optional, default: 10)
     * @returns {Promise<Object>} Sample data
     */
    hana_get_sample_data: async (params) => {
      try {
        const { schema_name, table_name, limit = 10 } = params;
        
        if (!schema_name) {
          throw new Error('schema_name parameter is required');
        }
        
        if (!table_name) {
          throw new Error('table_name parameter is required');
        }
        
        // Validate limit
        const rowLimit = Math.min(Math.max(1, parseInt(limit) || 10), 100);
        
        // Build safe query with proper escaping
        const query = `
          SELECT * FROM "${schema_name}"."${table_name}" LIMIT ?
        `;
        
        const results = await hanaClient.query(query, [rowLimit]);
        
        return {
          schema: schema_name,
          table: table_name,
          data: results,
          rowCount: results.length
        };
      } catch (error) {
        logger.error('Error getting sample data:', error);
        throw new Error(`Failed to get sample data: ${error.message}`);
      }
    },
    
    /**
     * Count rows in a table
     * @param {Object} params - Tool parameters
     * @param {string} params.schema_name - Schema name
     * @param {string} params.table_name - Table name
     * @returns {Promise<Object>} Row count
     */
    hana_count_rows: async (params) => {
      try {
        const { schema_name, table_name } = params;
        
        if (!schema_name) {
          throw new Error('schema_name parameter is required');
        }
        
        if (!table_name) {
          throw new Error('table_name parameter is required');
        }
        
        // Build safe query with proper escaping
        const query = `
          SELECT COUNT(*) AS row_count FROM "${schema_name}"."${table_name}"
        `;
        
        const result = await hanaClient.queryScalar(query);
        
        return {
          schema: schema_name,
          table: table_name,
          rowCount: parseInt(result) || 0
        };
      } catch (error) {
        logger.error('Error counting rows:', error);
        throw new Error(`Failed to count rows: ${error.message}`);
      }
    }
  };
}

module.exports = queryTools;
