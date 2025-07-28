/**
 * HANA Database Connection Manager
 */

const { logger } = require('../utils/logger');
const { config } = require('../utils/config');
const { createHanaClient } = require('./hana-client');

class ConnectionManager {
  constructor() {
    this.client = null;
    this.isConnecting = false;
    this.lastConnectionAttempt = null;
    this.connectionRetries = 0;
    this.maxRetries = 3;
  }

  /**
   * Get or create HANA client connection
   */
  async getClient() {
    // Return existing client if available
    if (this.client) {
      return this.client;
    }

    // Prevent multiple simultaneous connection attempts
    if (this.isConnecting) {
      logger.debug('Connection already in progress, waiting...');
      while (this.isConnecting) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return this.client;
    }

    // Check if configuration is valid
    if (!config.isHanaConfigured()) {
      logger.warn('HANA configuration is incomplete');
      return null;
    }

    return this.connect();
  }

  /**
   * Establish connection to HANA database
   */
  async connect() {
    this.isConnecting = true;
    this.lastConnectionAttempt = new Date();

    try {
      logger.info('Connecting to HANA database...');
      
      const hanaConfig = config.getHanaConfig();
      this.client = await createHanaClient(hanaConfig);
      
      this.connectionRetries = 0;
      logger.info('HANA client connected successfully');
      
      return this.client;
    } catch (error) {
      this.connectionRetries++;
      logger.error(`Failed to connect to HANA (attempt ${this.connectionRetries}):`, error.message);
      
      if (this.connectionRetries < this.maxRetries) {
        logger.info(`Retrying connection in 2 seconds...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        this.isConnecting = false;
        return this.connect();
      } else {
        logger.error('Max connection retries reached');
        this.isConnecting = false;
        return null;
      }
    }
  }

  /**
   * Test the connection
   */
  async testConnection() {
    const client = await this.getClient();
    if (!client) {
      return { success: false, error: 'No client available' };
    }

    try {
      const testQuery = 'SELECT 1 as test_value FROM DUMMY';
      const result = await client.query(testQuery);
      
      if (result && result.length > 0) {
        return { 
          success: true, 
          result: result[0].TEST_VALUE 
        };
      } else {
        return { 
          success: false, 
          error: 'Connection test returned no results' 
        };
      }
    } catch (error) {
      logger.error('Connection test failed:', error.message);
      return { 
        success: false, 
        error: error.message 
      };
    }
  }

  /**
   * Check if connection is healthy
   */
  async isHealthy() {
    const test = await this.testConnection();
    return test.success;
  }

  /**
   * Disconnect from HANA database
   */
  async disconnect() {
    if (this.client) {
      try {
        await this.client.disconnect();
        logger.info('HANA client disconnected');
      } catch (error) {
        logger.error('Error disconnecting HANA client:', error.message);
      } finally {
        this.client = null;
        this.connectionRetries = 0;
      }
    }
  }

  /**
   * Reset connection (disconnect and reconnect)
   */
  async resetConnection() {
    logger.info('Resetting HANA connection...');
    await this.disconnect();
    this.connectionRetries = 0;
    return this.getClient();
  }

  /**
   * Get connection status
   */
  getStatus() {
    return {
      connected: !!this.client,
      isConnecting: this.isConnecting,
      lastConnectionAttempt: this.lastConnectionAttempt,
      connectionRetries: this.connectionRetries,
      maxRetries: this.maxRetries
    };
  }
}

// Create singleton instance
const connectionManager = new ConnectionManager();

module.exports = { ConnectionManager, connectionManager }; 