/**
 * Configuration management utility for HANA MCP Server
 */

const { logger } = require('./logger');
const { getActiveProfileKey, runWithProfile } = require('../database/db-context');

const PROFILE_KEY_RE = /^[A-Za-z0-9_-]{1,64}$/;
const DEFAULT_PROFILE_KEY = 'default';

function clampInt(raw, fallback, min, max) {
  const n = parseInt(raw, 10);
  const v = Number.isFinite(n) ? n : fallback;
  return Math.min(Math.max(v, min), max);
}

/** Per-profile overrides for query limits; unset keys fall back to the global value. */
function parseLimitOverrides(raw, key) {
  if (raw == null) return {};
  if (typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error(`HANA_DATABASES["${key}"].limits must be an object`);
  }
  const o = {};
  if (raw.queryLimitsEnabled != null) o.queryLimitsEnabled = raw.queryLimitsEnabled === true || raw.queryLimitsEnabled === 'true';
  if (raw.queryTimeoutMs != null) o.queryTimeoutMs = Math.max(parseInt(raw.queryTimeoutMs, 10) || 0, 0);
  if (raw.maxResultRows != null) o.maxResultRows = clampInt(raw.maxResultRows, 50, 1, 10000);
  if (raw.maxResultCols != null) o.maxResultCols = clampInt(raw.maxResultCols, 50, 1, 500);
  if (raw.maxCellChars != null) o.maxCellChars = clampInt(raw.maxCellChars, 200, 1, 10000);
  if (raw.listDefaultLimit != null) o.listDefaultLimit = clampInt(raw.listDefaultLimit, 200, 1, 5000);
  // Setting a result cap on a profile switches query limits on for it, unless explicitly disabled.
  const setsCap = ['maxResultRows', 'maxResultCols', 'maxCellChars'].some((k) => o[k] !== undefined);
  if (setsCap && o.queryLimitsEnabled === undefined) o.queryLimitsEnabled = true;
  return o;
}

function parseProfile(key, raw) {
  if (!PROFILE_KEY_RE.test(key)) {
    throw new Error(`HANA_DATABASES key "${key}" is invalid (use letters, digits, _ or -; max 64)`);
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error(`HANA_DATABASES["${key}"] must be an object`);
  }
  const missing = ['host', 'user', 'password'].filter((f) => !raw[f]);
  if (missing.length) {
    throw new Error(`HANA_DATABASES["${key}"] is missing: ${missing.join(', ')}`);
  }
  const perms = raw.permissions || {};
  return {
    key,
    hana: {
      host: String(raw.host),
      port: parseInt(raw.port, 10) || 443,
      user: String(raw.user),
      password: String(raw.password),
      schema: raw.schema,
      instanceNumber: raw.instanceNumber != null ? String(raw.instanceNumber) : undefined,
      databaseName: raw.databaseName,
      connectionType: raw.connectionType || 'auto',
      ssl: raw.ssl !== false,
      encrypt: raw.encrypt !== false,
      validateCert: raw.validateCert !== false
    },
    permissions: {
      insert: perms.insert === true,
      update: perms.update === true,
      delete: perms.delete === true
    },
    limits: parseLimitOverrides(raw.limits, key)
  };
}

class Config {
  constructor() {
    this.config = this.loadConfig();
    this.loadProfiles();
  }

  /**
   * Build the database profile registry.
   * HANA_DATABASES (JSON) => multi-database mode; `database` is required on every DB tool call.
   * Otherwise a single implicit "default" profile is built from the flat HANA_* vars.
   */
  loadProfiles() {
    const raw = process.env.HANA_DATABASES;
    this.profiles = new Map();
    this.multiDb = false;

    if (raw && raw.trim()) {
      let parsed;
      try {
        parsed = JSON.parse(raw);
      } catch (e) {
        throw new Error(`HANA_DATABASES is not valid JSON: ${e.message}`);
      }
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed) || !Object.keys(parsed).length) {
        throw new Error('HANA_DATABASES must be a non-empty JSON object of { "<name>": { ...profile } }');
      }
      for (const [key, value] of Object.entries(parsed)) {
        this.profiles.set(key, parseProfile(key, value));
      }
      this.multiDb = true;
      logger.info(`Multi-database mode: ${this.profiles.size} profile(s): ${[...this.profiles.keys()].join(', ')}`);
      return;
    }

    const s = this.config.server;
    this.profiles.set(DEFAULT_PROFILE_KEY, {
      key: DEFAULT_PROFILE_KEY,
      hana: this.config.hana,
      permissions: { insert: s.allowInsert, update: s.allowUpdate, delete: s.allowDelete },
      limits: {}
    });
  }

  isMultiDb() {
    return this.multiDb;
  }

  getProfileKeys() {
    return [...this.profiles.keys()];
  }

  hasProfile(key) {
    return typeof key === 'string' && this.profiles.has(key);
  }

  /** Key of the profile in effect: request-scoped key, or "default" in single-database mode. */
  getActiveProfileKey() {
    const key = getActiveProfileKey();
    if (key && this.profiles.has(key)) return key;
    return this.multiDb ? null : DEFAULT_PROFILE_KEY;
  }

  getActiveProfile() {
    const key = this.getActiveProfileKey();
    return key ? this.profiles.get(key) : null;
  }

  /** HANA connection settings for the active profile ({} when none is selected). */
  _hana() {
    const p = this.getActiveProfile();
    return p ? p.hana : {};
  }

  /** Non-secret description of every profile (for hana_list_databases). */
  getProfileSummaries() {
    return [...this.profiles.values()].map((p) => ({
      database: p.key,
      host: p.hana.host,
      port: p.hana.port,
      databaseName: p.hana.databaseName || null,
      schema: p.hana.schema || null,
      connectionType: p.hana.connectionType,
      permissions: { read: true, ...p.permissions },
      limits: { ...this._mergedLimits(p) }
    }));
  }

  /** All profile passwords, for redaction. */
  getAllSecrets() {
    return [...this.profiles.values()].map((p) => p.hana.password).filter(Boolean);
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
        queryLimitsEnabled: process.env.HANA_QUERY_LIMITS_ENABLED === 'true',
        queryTimeoutMs: Math.max(parseInt(process.env.HANA_QUERY_TIMEOUT_MS, 10) || 0, 0),
        connectionPoolSize: Math.min(
          Math.max(parseInt(process.env.HANA_CONNECTION_POOL_SIZE, 10) || 3, 1),
          20
        ),
        auditEnabled: process.env.HANA_AUDIT_ENABLED === 'true',
        auditLogFile: process.env.HANA_AUDIT_LOG_FILE || './hana-audit.log',
        allowInsert: process.env.HANA_ALLOW_INSERT === 'true',
        allowUpdate: process.env.HANA_ALLOW_UPDATE === 'true',
        allowDelete: process.env.HANA_ALLOW_DELETE === 'true',
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
    return this._hana();
  }

  getServerConfig() {
    return this.config.server;
  }

  /** Limits for user-facing query tools (not internal metadata queries). */
  /** Global limits overlaid with a profile's overrides. */
  _mergedLimits(profile) {
    const s = this.config.server;
    const o = (profile && profile.limits) || {};
    const pick = (k, g) => (o[k] !== undefined ? o[k] : g);
    return {
      queryLimitsEnabled: pick('queryLimitsEnabled', s.queryLimitsEnabled),
      queryTimeoutMs: pick('queryTimeoutMs', s.queryTimeoutMs),
      maxResultRows: pick('maxResultRows', s.maxResultRows),
      maxResultCols: pick('maxResultCols', s.maxResultCols),
      maxCellChars: pick('maxCellChars', s.maxCellChars),
      listDefaultLimit: pick('listDefaultLimit', s.listDefaultLimit)
    };
  }

  /**
   * Limits for the active profile. Write permissions come from the profile;
   * caps/timeouts are global unless the profile overrides them.
   * With no active profile, writes are denied.
   */
  getQueryLimits() {
    const s = this.config.server;
    const profile = this.getActiveProfile();
    const perms = profile ? profile.permissions : { insert: false, update: false, delete: false };
    return {
      ...this._mergedLimits(profile),
      defaultOffset: s.queryDefaultOffset,
      resourceListMaxItems: s.resourceListMaxItems,
      semanticsTtlMs: s.semanticsTtlMs,
      querySnapshotTtlMs: s.querySnapshotTtlMs,
      allowInsert: perms.insert,
      allowUpdate: perms.update,
      allowDelete: perms.delete,
      database: this.multiDb && profile ? profile.key : undefined
    };
  }

  getAuditConfig() {
    const s = this.config.server;
    return {
      enabled: s.auditEnabled,
      logFile: s.auditLogFile
    };
  }

  getPoolConfig() {
    return {
      poolSize: this.config.server.connectionPoolSize
    };
  }

  /**
   * Determine HANA database type based on configuration
   */
  getHanaDatabaseType() {
    const hana = this._hana();
    
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
    const hana = this._hana();
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
    const hana = this._hana();
    return !!(hana.host && hana.user && hana.password);
  }

  getHanaConnectionString() {
    const hana = this._hana();
    return `${hana.host}:${hana.port}`;
  }

  // Get configuration info for display (hiding sensitive data)
  getDisplayConfig() {
    const hana = this._hana();
    const dbType = this.getHanaDatabaseType();
    
    const profile = this.getActiveProfile();
    return {
      ...(this.multiDb ? { database: profile ? profile.key : 'NOT SELECTED' } : {}),
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
      validateCert: hana.validateCert,
      ...(profile ? { permissions: { read: true, ...profile.permissions } } : {})
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
      HANA_METADATA_CATALOG_DATABASE: process.env.HANA_METADATA_CATALOG_DATABASE || 'NOT SET',
      HANA_QUERY_TIMEOUT_MS: process.env.HANA_QUERY_TIMEOUT_MS || 'NOT SET',
      HANA_CONNECTION_POOL_SIZE: process.env.HANA_CONNECTION_POOL_SIZE || 'NOT SET',
      HANA_AUDIT_ENABLED: process.env.HANA_AUDIT_ENABLED || 'NOT SET',
      HANA_AUDIT_LOG_FILE: process.env.HANA_AUDIT_LOG_FILE || 'NOT SET',
      HANA_ALLOW_INSERT: process.env.HANA_ALLOW_INSERT || 'NOT SET',
      HANA_ALLOW_UPDATE: process.env.HANA_ALLOW_UPDATE || 'NOT SET',
      HANA_ALLOW_DELETE: process.env.HANA_ALLOW_DELETE || 'NOT SET',
      // Never echo the JSON: it contains passwords.
      HANA_DATABASES: this.multiDb ? `SET (${this.profiles.size} profiles: ${this.getProfileKeys().join(', ')})` : 'NOT SET'
    };
  }

  // Validate configuration
  validate() {
    // Multi-database mode at startup: validate every profile.
    if (this.multiDb && !getActiveProfileKey()) {
      let ok = true;
      for (const key of this.profiles.keys()) {
        ok = runWithProfile(key, () => this.validate()) && ok;
      }
      return ok;
    }
    const hana = this._hana();
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
      const tag = this.multiDb ? ` [database ${this.getActiveProfileKey()}]` : '';
      logger.warn(`Configuration validation failed${tag}:`, errors);
      return false;
    }

    logger.info(`Configuration validation passed for ${dbType} database type`);
    return true;
  }

  /**
   * Get default schema from environment variables
   */
  getDefaultSchema() {
    return this._hana().schema;
  }

  /**
   * Check if default schema is configured
   */
  hasDefaultSchema() {
    return !!this._hana().schema;
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