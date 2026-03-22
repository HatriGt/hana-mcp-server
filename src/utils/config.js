/**
 * Configuration management utility for HANA MCP Server
 */

const { logger } = require('./logger');

class Config {
  constructor() {
    this.config = this.loadConfig();
  }

  loadConfig() {
    return {
      hana: {
        host: process.env.HANA_HOST,
        port: parseInt(process.env.HANA_PORT) || 443,
        user: process.env.HANA_USER,
        password: process.env.HANA_PASSWORD,
        schema: process.env.HANA_SCHEMA,
        instanceNumber: process.env.HANA_INSTANCE_NUMBER,
        databaseName: process.env.HANA_DATABASE_NAME,
        connectionType: process.env.HANA_CONNECTION_TYPE || 'auto',
        ssl: process.env.HANA_SSL !== 'false',
        encrypt: process.env.HANA_ENCRYPT !== 'false',
        validateCert: process.env.HANA_VALIDATE_CERT !== 'false'
      },
      server: {
        logLevel: process.env.LOG_LEVEL || 'INFO',
        enableFileLogging: process.env.ENABLE_FILE_LOGGING === 'true',
        enableConsoleLogging: process.env.ENABLE_CONSOLE_LOGGING !== 'false',
        maxResultRows: Math.min(
          Math.max(parseInt(process.env.HANA_MAX_RESULT_ROWS, 10) || 50, 1),
          10000
        ),
        maxResultCols: Math.min(
          Math.max(parseInt(process.env.HANA_MAX_RESULT_COLS, 10) || 50, 1),
          500
        ),
        maxCellChars: Math.min(
          Math.max(parseInt(process.env.HANA_MAX_CELL_CHARS, 10) || 200, 1),
          10000
        ),
        queryDefaultOffset: Math.max(parseInt(process.env.HANA_QUERY_DEFAULT_OFFSET, 10) || 0, 0),
        listDefaultLimit: Math.min(
          Math.max(parseInt(process.env.HANA_LIST_DEFAULT_LIMIT, 10) || 200, 1),
          5000
        ),
        resourceListMaxItems: Math.min(
          Math.max(parseInt(process.env.HANA_RESOURCE_LIST_MAX_ITEMS, 10) || 500, 1),
          10000
        ),
        semanticsTtlMs: (() => {
          const raw = parseInt(process.env.HANA_SEMANTICS_TTL_MS, 10);
          const base = Number.isFinite(raw) ? raw : 60000;
          return Math.min(Math.max(base, 0), 86400000);
        })(),
        querySnapshotTtlMs: Math.min(
          Math.max(parseInt(process.env.HANA_QUERY_SNAPSHOT_TTL_MS, 10) || 300000, 10000),
          3600000
        )
      }
    };
  }

  getHanaConfig() {
    return this.config.hana;
  }

  getServerConfig() {
    return this.config.server;
  }

  /** Limits for user-facing query tools (not internal metadata queries). */
  getQueryLimits() {
    const s = this.config.server;
    return {
      maxResultRows: s.maxResultRows,
      maxResultCols: s.maxResultCols,
      maxCellChars: s.maxCellChars,
      defaultOffset: s.queryDefaultOffset,
      listDefaultLimit: s.listDefaultLimit,
      resourceListMaxItems: s.resourceListMaxItems,
      semanticsTtlMs: s.semanticsTtlMs,
      querySnapshotTtlMs: s.querySnapshotTtlMs
    };
  }

  /**
   * Determine HANA database type based on configuration
   */
  getHanaDatabaseType() {
    const hana = this.config.hana;
    
    // Use explicit type if set and not 'auto'
    if (hana.connectionType && hana.connectionType !== 'auto') {
      return hana.connectionType;
    }
    
    // Auto-detect based on available parameters
    if (hana.instanceNumber && hana.databaseName) {
      return 'mdc_tenant';
    } else if (hana.instanceNumber && !hana.databaseName) {
      return 'mdc_system';
    } else {
      return 'single_container';
    }
  }

  /**
   * Build connection parameters based on database type
   */
  getConnectionParams() {
    const hana = this.config.hana;
    const dbType = this.getHanaDatabaseType();
    
    const baseParams = {
      uid: hana.user,
      pwd: hana.password,
      encrypt: hana.encrypt,
      sslValidateCertificate: hana.validateCert
    };

    // Build connection string based on database type
    switch (dbType) {
      case 'mdc_tenant':
        baseParams.serverNode = `${hana.host}:${hana.port}`;
        break;
      case 'mdc_system':
        baseParams.serverNode = `${hana.host}:${hana.port}`;
        break;
      case 'single_container':
      default:
        baseParams.serverNode = `${hana.host}:${hana.port}`;
        break;
    }

    if (hana.databaseName) {
      baseParams.databaseName = hana.databaseName;
    }
    
    return baseParams;
  }

  isHanaConfigured() {
    const hana = this.config.hana;
    return !!(hana.host && hana.user && hana.password);
  }

  getHanaConnectionString() {
    const hana = this.config.hana;
    return `${hana.host}:${hana.port}`;
  }

  // Get configuration info for display (hiding sensitive data)
  getDisplayConfig() {
    const hana = this.config.hana;
    const dbType = this.getHanaDatabaseType();
    
    return {
      databaseType: dbType,
      connectionType: hana.connectionType,
      host: hana.host || 'NOT SET',
      port: hana.port,
      user: hana.user || 'NOT SET',
      password: hana.password ? 'SET (hidden)' : 'NOT SET',
      schema: hana.schema || 'NOT SET',
      instanceNumber: hana.instanceNumber || 'NOT SET',
      databaseName: hana.databaseName || 'NOT SET',
      ssl: hana.ssl,
      encrypt: hana.encrypt,
      validateCert: hana.validateCert
    };
  }

  // Get environment variables for display
  getEnvironmentVars() {
    return {
      HANA_HOST: process.env.HANA_HOST || 'NOT SET',
      HANA_PORT: process.env.HANA_PORT || 'NOT SET',
      HANA_USER: process.env.HANA_USER || 'NOT SET',
      HANA_PASSWORD: process.env.HANA_PASSWORD ? 'SET (hidden)' : 'NOT SET',
      HANA_SCHEMA: process.env.HANA_SCHEMA || 'NOT SET',
      HANA_INSTANCE_NUMBER: process.env.HANA_INSTANCE_NUMBER || 'NOT SET',
      HANA_DATABASE_NAME: process.env.HANA_DATABASE_NAME || 'NOT SET',
      HANA_CONNECTION_TYPE: process.env.HANA_CONNECTION_TYPE || 'NOT SET',
      HANA_SSL: process.env.HANA_SSL || 'NOT SET',
      HANA_ENCRYPT: process.env.HANA_ENCRYPT || 'NOT SET',
      HANA_VALIDATE_CERT: process.env.HANA_VALIDATE_CERT || 'NOT SET',
      HANA_METADATA_CATALOG_DATABASE: process.env.HANA_METADATA_CATALOG_DATABASE || 'NOT SET'
    };
  }

  // Validate configuration
  validate() {
    const hana = this.config.hana;
    const errors = [];
    const dbType = this.getHanaDatabaseType();

    // Common required fields
    if (!hana.host) errors.push('HANA_HOST is required');
    if (!hana.user) errors.push('HANA_USER is required');
    if (!hana.password) errors.push('HANA_PASSWORD is required');

    // Type-specific validation
    switch (dbType) {
      case 'mdc_tenant':
        if (!hana.instanceNumber) errors.push('HANA_INSTANCE_NUMBER is required for MDC Tenant Database');
        if (!hana.databaseName) errors.push('HANA_DATABASE_NAME is required for MDC Tenant Database');
        break;
      case 'mdc_system':
        if (!hana.instanceNumber) errors.push('HANA_INSTANCE_NUMBER is required for MDC System Database');
        break;
      case 'single_container':
        if (!hana.schema) errors.push('HANA_SCHEMA is recommended for Single-Container Database');
        break;
    }

    if (errors.length > 0) {
      logger.warn('Configuration validation failed:', errors);
      return false;
    }

    logger.info(`Configuration validation passed for ${dbType} database type`);
    return true;
  }

  /**
   * Get default schema from environment variables
   */
  getDefaultSchema() {
    return this.config.hana.schema;
  }

  /**
   * Check if default schema is configured
   */
  hasDefaultSchema() {
    return !!this.config.hana.schema;
  }

  /**
   * Default database whose SYS.* catalog metadata tools read when connected to another MDC tenant.
   * Empty/unset = use the connected database catalog only. Validated at tool boundary.
   */
  getMetadataCatalogDatabase() {
    const v = process.env.HANA_METADATA_CATALOG_DATABASE;
    if (v == null || !String(v).trim()) return null;
    return String(v).trim();
  }
}

// Create default config instance
const config = new Config();

module.exports = { Config, config }; 