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
        ssl: process.env.HANA_SSL !== 'false',
        encrypt: process.env.HANA_ENCRYPT !== 'false',
        validateCert: process.env.HANA_VALIDATE_CERT !== 'false',
        database: process.env.HANA_DATABASE
      },
      server: {
        logLevel: process.env.LOG_LEVEL || 'INFO',
        enableFileLogging: process.env.ENABLE_FILE_LOGGING === 'true',
        enableConsoleLogging: process.env.ENABLE_CONSOLE_LOGGING !== 'false'
      }
    };
  }

  getHanaConfig() {
    return this.config.hana;
  }

  getServerConfig() {
    return this.config.server;
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
    return {
      host: hana.host || 'NOT SET',
      port: hana.port,
      user: hana.user || 'NOT SET',
      password: hana.password ? 'SET (hidden)' : 'NOT SET',
      schema: hana.schema || 'NOT SET',
      ssl: hana.ssl,
      encrypt: hana.encrypt,
      validateCert: hana.validateCert,
      database: hana.database || 'NOT SET'
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
      HANA_SSL: process.env.HANA_SSL || 'NOT SET',
      HANA_ENCRYPT: process.env.HANA_ENCRYPT || 'NOT SET',
      HANA_VALIDATE_CERT: process.env.HANA_VALIDATE_CERT || 'NOT SET',
      HANA_DATABASE: process.env.HANA_DATABASE || 'NOT SET'
    };
  }

  // Validate configuration
  validate() {
    const hana = this.config.hana;
    const errors = [];

    if (!hana.host) errors.push('HANA_HOST is required');
    if (!hana.user) errors.push('HANA_USER is required');
    if (!hana.password) errors.push('HANA_PASSWORD is required');
    // if (!hana.database) errors.push('HANA_DATABASE is required');

    if (errors.length > 0) {
      logger.warn('Configuration validation failed:', errors);
      return false;
    }

    logger.info('Configuration validation passed');
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
}

// Create default config instance
const config = new Config();

module.exports = { Config, config }; 