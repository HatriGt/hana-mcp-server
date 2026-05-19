/**
 * Input validation utilities for HANA MCP Server
 */

const { logger } = require('./logger');

class Validators {
  /**
   * Validate required parameters
   */
  static validateRequired(params, requiredFields, toolName) {
    const missing = [];
    
    for (const field of requiredFields) {
      if (!params || params[field] === undefined || params[field] === null || params[field] === '') {
        missing.push(field);
      }
    }
    
    if (missing.length > 0) {
      const error = `Missing required parameters: ${missing.join(', ')}`;
      logger.warn(`Validation failed for ${toolName}:`, error);
      return { valid: false, error };
    }
    
    return { valid: true };
  }

  /**
   * Validate schema name
   */
  static validateSchemaName(schemaName) {
    if (!schemaName || typeof schemaName !== 'string') {
      return { valid: false, error: 'Schema name must be a non-empty string' };
    }
    
    if (schemaName.length > 128) {
      return { valid: false, error: 'Schema name too long (max 128 characters)' };
    }
    
    // Basic SQL identifier validation
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(schemaName)) {
      return { valid: false, error: 'Invalid schema name format' };
    }
    
    return { valid: true };
  }

  /**
   * Validate table name
   */
  static validateTableName(tableName) {
    if (!tableName || typeof tableName !== 'string') {
      return { valid: false, error: 'Table name must be a non-empty string' };
    }
    
    if (tableName.length > 128) {
      return { valid: false, error: 'Table name too long (max 128 characters)' };
    }
    
    // Basic SQL identifier validation
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(tableName)) {
      return { valid: false, error: 'Invalid table name format' };
    }
    
    return { valid: true };
  }

  /**
   * Validate optional MDC database name for cross-tenant SYS.* metadata (e.g. HSP).
   * Same identifier rules as schema/table; no dots allowed.
   */
  static validateCatalogDatabaseName(name) {
    if (!name || typeof name !== 'string') {
      return { valid: false, error: 'Catalog database name must be a non-empty string' };
    }

    if (name.length > 128) {
      return { valid: false, error: 'Catalog database name too long (max 128 characters)' };
    }

    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) {
      return { valid: false, error: 'Invalid catalog database name format' };
    }

    return { valid: true };
  }

  /**
   * Validate index name
   */
  static validateIndexName(indexName) {
    if (!indexName || typeof indexName !== 'string') {
      return { valid: false, error: 'Index name must be a non-empty string' };
    }
    
    if (indexName.length > 128) {
      return { valid: false, error: 'Index name too long (max 128 characters)' };
    }
    
    // Basic SQL identifier validation
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(indexName)) {
      return { valid: false, error: 'Invalid index name format' };
    }
    
    return { valid: true };
  }

  /**
   * Validate SQL query.
   * @param {string} query
   * @param {{ mode?: 'open'|'select-only' }} [options]
   *   'select-only': only SELECT/WITH allowed, no unquoted semicolons.
   *   'open' (default): reject multi-statement injection and dangerous DDL/DML.
   */
  static validateQuery(query, options = {}) {
    if (!query || typeof query !== 'string') {
      return { valid: false, error: 'Query must be a non-empty string' };
    }

    const trimmed = query.trim().replace(/;+\s*$/u, '').trim();
    if (!trimmed) {
      return { valid: false, error: 'Query cannot be empty' };
    }

    const mode = options.mode || 'open';

    if (mode === 'select-only') {
      const upper = trimmed.toUpperCase();
      if (!upper.startsWith('SELECT') && !upper.startsWith('WITH')) {
        return { valid: false, error: 'Only SELECT and WITH queries are permitted here' };
      }
      if (this._hasUnquotedSemicolon(trimmed)) {
        return { valid: false, error: 'Multi-statement queries are not permitted' };
      }
      return { valid: true };
    }

    // open mode: reject comment injection and multi-statement DDL/DML
    if (this._hasUnquotedComment(trimmed)) {
      return { valid: false, error: 'SQL comments (-- or /* */) are not permitted in queries' };
    }

    if (this._hasUnquotedSemicolon(trimmed)) {
      return { valid: false, error: 'Multi-statement queries are not permitted' };
    }

    return { valid: true };
  }

  /**
   * Returns true if `sql` contains an unquoted semicolon (outside string literals).
   */
  static _hasUnquotedSemicolon(sql) {
    let inString = false;
    for (let i = 0; i < sql.length; i++) {
      const ch = sql[i];
      if (ch === "'" && !inString) { inString = true; continue; }
      if (ch === "'" && inString) {
        // Escaped quote ''
        if (sql[i + 1] === "'") { i++; continue; }
        inString = false;
        continue;
      }
      if (!inString && ch === ';') return true;
    }
    return false;
  }

  /**
   * Returns true if `sql` contains an unquoted -- or /* comment marker.
   */
  static _hasUnquotedComment(sql) {
    let inString = false;
    for (let i = 0; i < sql.length; i++) {
      const ch = sql[i];
      if (ch === "'" && !inString) { inString = true; continue; }
      if (ch === "'" && inString) {
        if (sql[i + 1] === "'") { i++; continue; }
        inString = false;
        continue;
      }
      if (!inString) {
        if (ch === '-' && sql[i + 1] === '-') return true;
        if (ch === '/' && sql[i + 1] === '*') return true;
      }
    }
    return false;
  }

  /**
   * Validate a LIKE pattern for column search (alphanumeric, _, %, spaces allowed).
   */
  static validateColumnPattern(pattern) {
    if (!pattern || typeof pattern !== 'string') {
      return { valid: false, error: 'Column pattern must be a non-empty string' };
    }
    if (pattern.trim().length === 0) {
      return { valid: false, error: 'Column pattern cannot be empty' };
    }
    if (pattern.length > 256) {
      return { valid: false, error: 'Column pattern too long (max 256 characters)' };
    }
    return { valid: true };
  }

  /**
   * Check DML restrictions from server config limits.
   * @param {string} query - Raw SQL statement
   * @param {{ allowInsert?: boolean, allowUpdate?: boolean, allowDelete?: boolean }} permissions
   */
  static validateDmlRestrictions(query, permissions = {}) {
    const upper = query.trimStart().toUpperCase();
    if (upper.startsWith('INSERT') && !permissions.allowInsert) {
      return { valid: false, error: 'INSERT operations are not enabled (set HANA_ALLOW_INSERT=true to permit)' };
    }
    if (upper.startsWith('UPDATE') && !permissions.allowUpdate) {
      return { valid: false, error: 'UPDATE operations are not enabled (set HANA_ALLOW_UPDATE=true to permit)' };
    }
    if ((upper.startsWith('DELETE') || upper.startsWith('TRUNCATE')) && !permissions.allowDelete) {
      return { valid: false, error: 'DELETE/TRUNCATE operations are not enabled (set HANA_ALLOW_DELETE=true to permit)' };
    }
    return { valid: true };
  }

  /**
   * Validate query parameters
   */
  static validateParameters(parameters) {
    if (!parameters) {
      return { valid: true }; // Parameters are optional
    }
    
    if (!Array.isArray(parameters)) {
      return { valid: false, error: 'Parameters must be an array' };
    }
    
    for (let i = 0; i < parameters.length; i++) {
      const param = parameters[i];
      if (param === undefined || param === null) {
        return { valid: false, error: `Parameter at index ${i} cannot be null or undefined` };
      }
    }
    
    return { valid: true };
  }

  /**
   * Validate tool arguments
   */
  static validateToolArgs(args, toolName) {
    if (!args || typeof args !== 'object') {
      return { valid: false, error: 'Arguments must be an object' };
    }
    
    logger.debug(`Validating arguments for ${toolName}:`, args);
    return { valid: true };
  }

  /**
   * Validate configuration for specific database type
   */
  static validateForDatabaseType(config) {
    const dbType = config.getHanaDatabaseType ? config.getHanaDatabaseType() : 'single_container';
    const errors = [];

    switch (dbType) {
      case 'mdc_tenant':
        if (!config.instanceNumber) {
          errors.push('HANA_INSTANCE_NUMBER is required for MDC Tenant Database');
        }
        if (!config.databaseName) {
          errors.push('HANA_DATABASE_NAME is required for MDC Tenant Database');
        }
        break;
      case 'mdc_system':
        if (!config.instanceNumber) {
          errors.push('HANA_INSTANCE_NUMBER is required for MDC System Database');
        }
        break;
      case 'single_container':
        if (!config.schema) {
          errors.push('HANA_SCHEMA is recommended for Single-Container Database');
        }
        break;
    }

    return {
      valid: errors.length === 0,
      errors: errors,
      databaseType: dbType
    };
  }
}

module.exports = Validators; 