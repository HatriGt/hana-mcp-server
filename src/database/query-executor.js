/**
 * Query execution utilities for HANA database
 */

const { logger } = require('../utils/logger');
const { redactSecrets } = require('../utils/sensitive-redact');
const { connectionManager } = require('./connection-manager');
const Validators = require('../utils/validators');

class QueryExecutor {
  /**
   * Execute a query with parameters
   */
  static async executeQuery(query, parameters = []) {
    // Validate query
    const queryValidation = Validators.validateQuery(query);
    if (!queryValidation.valid) {
      throw new Error(queryValidation.error);
    }

    // Validate parameters
    const paramValidation = Validators.validateParameters(parameters);
    if (!paramValidation.valid) {
      throw new Error(paramValidation.error);
    }

    const client = await connectionManager.getClient();
    if (!client) {
      throw new Error('HANA client not connected. Please check your HANA configuration.');
    }

    try {
      logger.debug(`Executing query: ${query}`, parameters.length > 0 ? `with ${parameters.length} parameters` : '');
      const results = await client.query(query, parameters);
      logger.debug(`Query executed successfully, returned ${results.length} rows`);
      return results;
    } catch (error) {
      logger.error(`Query execution failed: ${redactSecrets(error.message)}`);
      throw error;
    }
  }

  /**
   * Execute a scalar query (returns single value)
   */
  static async executeScalarQuery(query, parameters = []) {
    const results = await this.executeQuery(query, parameters);
    
    if (results.length === 0) {
      return null;
    }
    
    const firstRow = results[0];
    const firstColumn = Object.keys(firstRow)[0];
    
    return firstRow[firstColumn];
  }

  /**
   * Get all schemas
   */
  static async getSchemas() {
    const query = `SELECT SCHEMA_NAME FROM SYS.SCHEMAS ORDER BY SCHEMA_NAME`;
    const results = await this.executeQuery(query);
    return results.map(row => row.SCHEMA_NAME);
  }

  /**
   * Paginated schema names with total count (prefix LIKE, case-sensitive as HANA stores).
   * @param {string} [prefix] empty = all
   * @param {number} limit
   * @param {number} offset
   * @returns {Promise<{ names: string[], total: number }>}
   */
  static async getSchemasPage(prefix, limit, offset) {
    const p = prefix && String(prefix).trim() ? String(prefix).trim() : '';
    const like = p ? `${p}%` : '%';
    const countSql = `SELECT COUNT(*) AS C FROM SYS.SCHEMAS WHERE SCHEMA_NAME LIKE ?`;
    const listSql = `SELECT SCHEMA_NAME FROM SYS.SCHEMAS WHERE SCHEMA_NAME LIKE ? ORDER BY SCHEMA_NAME LIMIT ? OFFSET ?`;
    const totalRow = await this.executeScalarQuery(countSql, [like]);
    const total = totalRow != null ? Number(totalRow) : 0;
    const results = await this.executeQuery(listSql, [like, limit, offset]);
    return { names: results.map(row => row.SCHEMA_NAME), total };
  }

  /**
   * SYS or "DB".SYS for MDC cross-tenant metadata (TABLE_COLUMNS, TABLES, INDEXES).
   * @param {string|null|undefined} catalogDatabase validated identifier or empty
   * @returns {string}
   */
  static _sysCatalogRef(catalogDatabase) {
    const t =
      catalogDatabase != null && typeof catalogDatabase === 'string' && catalogDatabase.trim()
        ? catalogDatabase.trim()
        : '';
    if (!t) return 'SYS';
    return `"${t}".SYS`;
  }

  /**
   * Get tables in a schema
   */
  static async getTables(schemaName) {
    const query = `
      SELECT TABLE_NAME
      FROM SYS.TABLES
      WHERE SCHEMA_NAME = ?
      ORDER BY TABLE_NAME
    `;
    
    const results = await this.executeQuery(query, [schemaName]);
    return results.map(row => row.TABLE_NAME);
  }

  /**
   * Paginated table names in a schema.
   * @param {string} schemaName
   * @param {string} [prefix]
   * @param {number} limit
   * @param {number} offset
   * @returns {Promise<{ names: string[], total: number }>}
   */
  static async getTablesPage(schemaName, prefix, limit, offset, catalogDatabase) {
    const p = prefix && String(prefix).trim() ? String(prefix).trim() : '';
    const like = p ? `${p}%` : '%';
    const sys = this._sysCatalogRef(catalogDatabase);
    const countSql = `SELECT COUNT(*) AS C FROM ${sys}.TABLES WHERE SCHEMA_NAME = ? AND TABLE_NAME LIKE ?`;
    const listSql = `SELECT TABLE_NAME FROM ${sys}.TABLES WHERE SCHEMA_NAME = ? AND TABLE_NAME LIKE ? ORDER BY TABLE_NAME LIMIT ? OFFSET ?`;
    const totalRow = await this.executeScalarQuery(countSql, [schemaName, like]);
    const total = totalRow != null ? Number(totalRow) : 0;
    const results = await this.executeQuery(listSql, [schemaName, like, limit, offset]);
    return { names: results.map(row => row.TABLE_NAME), total };
  }

  /**
   * Get table columns
   */
  static async getTableColumns(schemaName, tableName, catalogDatabase) {
    const sys = this._sysCatalogRef(catalogDatabase);
    const query = `
      SELECT 
        COLUMN_NAME,
        DATA_TYPE_NAME,
        LENGTH,
        SCALE,
        IS_NULLABLE,
        DEFAULT_VALUE,
        POSITION,
        COMMENTS
      FROM 
        ${sys}.TABLE_COLUMNS
      WHERE 
        SCHEMA_NAME = ? AND TABLE_NAME = ?
      ORDER BY 
        POSITION
    `;
    
    return await this.executeQuery(query, [schemaName, tableName]);
  }

  /**
   * Get table indexes
   */
  static async getTableIndexes(schemaName, tableName, catalogDatabase) {
    const sys = this._sysCatalogRef(catalogDatabase);
    const query = `
      SELECT 
        i.INDEX_NAME,
        i.INDEX_TYPE,
        ic.COLUMN_NAME
      FROM 
        ${sys}.INDEX_COLUMNS ic
      JOIN 
        ${sys}.INDEXES i ON ic.INDEX_NAME = i.INDEX_NAME 
        AND ic.SCHEMA_NAME = i.SCHEMA_NAME
      WHERE 
        ic.SCHEMA_NAME = ? AND ic.TABLE_NAME = ?
      ORDER BY 
        ic.INDEX_NAME, ic.POSITION
    `;
    
    return await this.executeQuery(query, [schemaName, tableName]);
  }

  /**
   * Get index details
   */
  static async getIndexDetails(schemaName, tableName, indexName, catalogDatabase) {
    const sys = this._sysCatalogRef(catalogDatabase);
    const query = `
      SELECT 
        i.INDEX_NAME,
        i.INDEX_TYPE,
        ic.COLUMN_NAME,
        ic.POSITION,
        ic."ORDER" AS SORT_ORDER
      FROM 
        ${sys}.INDEXES i
      JOIN 
        ${sys}.INDEX_COLUMNS ic ON i.INDEX_NAME = ic.INDEX_NAME 
        AND i.SCHEMA_NAME = ic.SCHEMA_NAME
      WHERE 
        i.SCHEMA_NAME = ? AND i.TABLE_NAME = ? AND i.INDEX_NAME = ?
      ORDER BY 
        ic.POSITION
    `;
    
    return await this.executeQuery(query, [schemaName, tableName, indexName]);
  }

  /**
   * Test database connection
   */
  static async testConnection() {
    return await connectionManager.testConnection();
  }

  /**
   * Get database information
   */
  static async getDatabaseInfo() {
    try {
      const versionQuery = 'SELECT * FROM M_DATABASE';
      const version = await this.executeQuery(versionQuery);
      
      const userQuery = 'SELECT CURRENT_USER, CURRENT_SCHEMA FROM DUMMY';
      const user = await this.executeQuery(userQuery);
      
      return {
        version: version.length > 0 ? version[0] : null,
        currentUser: user.length > 0 ? user[0].CURRENT_USER : null,
        currentSchema: user.length > 0 ? user[0].CURRENT_SCHEMA : null
      };
    } catch (error) {
      logger.error('Failed to get database info:', redactSecrets(error.message));
      return { error: redactSecrets(error.message) };
    }
  }

  /**
   * Get table row count
   */
  static async getTableRowCount(schemaName, tableName) {
    const query = `SELECT COUNT(*) as ROW_COUNT FROM "${schemaName}"."${tableName}"`;
    const result = await this.executeScalarQuery(query);
    return result;
  }

  /**
   * Get table sample data
   */
  static async getTableSample(schemaName, tableName, limit = 10) {
    const query = `SELECT * FROM "${schemaName}"."${tableName}" LIMIT ?`;
    return await this.executeQuery(query, [limit]);
  }
}

module.exports = QueryExecutor; 