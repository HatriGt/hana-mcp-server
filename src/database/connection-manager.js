/**
 * HANA Database Connection Manager — pool-backed.
 */

const { logger } = require('../utils/logger');
const { redactSecrets } = require('../utils/sensitive-redact');
const { config } = require('../utils/config');
const { createHanaClient } = require('./hana-client');
const { ConnectionPool } = require('./connection-pool');
const { runWithProfile } = require('./db-context');

const NO_DATABASE_ERROR = 'No database selected. Pass the "database" parameter (see hana_list_databases).';

class ConnectionManager {
  constructor() {
    /** @type {Map<string, ConnectionPool>} one pool per database profile */
    this._pools = new Map();
    this.lastConnectionError = null;
  }

  /** Pool for the active profile; created lazily. Connections are always opened with that profile's credentials. */
  _getPool() {
    const key = config.getActiveProfileKey();
    if (!key) throw new Error(NO_DATABASE_ERROR);
    if (this._pools.has(key)) return this._pools.get(key);
    const { poolSize } = config.getPoolConfig();
    const pool = new ConnectionPool(poolSize, () => runWithProfile(key, async () => {
      const dbType = config.getHanaDatabaseType();
      logger.info(`Creating new HANA connection [${key}] (${dbType})...`);
      const client = await createHanaClient(config);
      logger.info(`HANA connection established [${key}]`);
      return client;
    }));
    this._pools.set(key, pool);
    return pool;
  }

  /**
   * Run fn with a pooled connection.
   * This is the primary API for all query operations.
   * @param {(client: object) => Promise<any>} fn
   * @param {number} [timeoutMs] - passed through to hana-client.query() inside fn
   * @returns {Promise<any>}
   */
  async withConnection(fn) {
    if (config.isMultiDb() && !config.getActiveProfileKey()) {
      throw new Error(NO_DATABASE_ERROR);
    }
    if (!config.isHanaConfigured()) {
      throw new Error('HANA configuration is incomplete. Check HANA_HOST, HANA_USER, HANA_PASSWORD.');
    }
    const pool = this._getPool();
    let client;
    try {
      client = await pool.acquire();
    } catch (err) {
      this.lastConnectionError = err;
      logger.error('Failed to acquire connection from pool:', redactSecrets(err.message));
      throw err;
    }

    let markForReset = false;
    try {
      const result = await fn(client);
      return result;
    } catch (err) {
      if (err.isTimeout) markForReset = true;
      throw err;
    } finally {
      pool.release(client, markForReset);
    }
  }

  /**
   * Backward-compatible single-client accessor (used by config-tools, resources, lifecycle).
   * Returns the first available client or null on failure.
   */
  async getClient() {
    if (!config.isHanaConfigured()) return null;
    try {
      const pool = this._getPool();
      const client = await pool.acquire();
      pool.release(client);
      return client;
    } catch (err) {
      this.lastConnectionError = err;
      logger.error('getClient failed:', redactSecrets(err.message));
      return null;
    }
  }

  /**
   * Test the connection (runs SELECT 1 via the pool).
   */
  async testConnection() {
    if (config.isMultiDb() && !config.getActiveProfileKey()) {
      return { success: false, error: NO_DATABASE_ERROR };
    }
    if (!config.isHanaConfigured()) {
      return { success: false, error: 'HANA configuration is incomplete' };
    }
    try {
      const result = await this.withConnection(async (client) => {
        return client.query('SELECT 1 AS TEST_VALUE FROM DUMMY');
      });
      if (result && result.length > 0) {
        return { success: true, result: result[0].TEST_VALUE };
      }
      return { success: false, error: 'Connection test returned no results' };
    } catch (error) {
      logger.error('Connection test failed:', redactSecrets(error.message));
      return { success: false, error: redactSecrets(error.message) };
    }
  }

  async isHealthy() {
    const test = await this.testConnection();
    return test.success;
  }

  /**
   * Drain all pool connections (called on shutdown).
   */
  async disconnect() {
    for (const [key, pool] of this._pools) {
      await pool.drain();
      logger.info(`Connection pool drained [${key}]`);
    }
    this._pools.clear();
  }

  async resetConnection() {
    logger.info('Resetting connection pool...');
    await this.disconnect();
    return this.testConnection();
  }

  getStatus() {
    const dbType = config.getHanaDatabaseType();
    const key = config.getActiveProfileKey();
    const pool = key ? this._pools.get(key) : null;
    const stats = pool ? pool.getStats() : { poolSize: config.getPoolConfig().poolSize, totalSlots: 0, busySlots: 0, idleSlots: 0, queuedRequests: 0 };
    return {
      database: key,
      connected: !!pool && stats.totalSlots > 0,
      databaseType: dbType,
      ...stats
    };
  }
}

const connectionManager = new ConnectionManager();

module.exports = { ConnectionManager, connectionManager };
