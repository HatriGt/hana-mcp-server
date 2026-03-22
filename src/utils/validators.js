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
   * Validate SQL query
   */
  static validateQuery(query) {
    if (!query || typeof query !== 'string') {
      return { valid: false, error: 'Query must be a non-empty string' };
    }
    
    if (query.trim().length === 0) {
      return { valid: false, error: 'Query cannot be empty' };
    }
    
    // Basic SQL injection prevention - check for suspicious patterns
    const suspiciousPatterns = [
      /;\s*drop\s+table/i,
      /;\s*delete\s+from/i,
      /;\s*truncate\s+table/i,
      /;\s*alter\s+table/i,
      /;\s*create\s+table/i,
      /;\s*drop\s+database/i,
      /;\s*shutdown/i
    ];
    
    for (const pattern of suspiciousPatterns) {
      if (pattern.test(query)) {
        return { valid: false, error: 'Query contains potentially dangerous operations' };
      }
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