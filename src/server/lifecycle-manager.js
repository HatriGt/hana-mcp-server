/**
 * Server lifecycle management for HANA MCP Server
 */

const { logger } = require('../utils/logger');
const { connectionManager } = require('../database/connection-manager');

class LifecycleManager {
  constructor() {
    this.isShuttingDown = false;
    this.isInitialized = false;
  }

  /**
   * Initialize the server
   */
  async initialize() {
    if (this.isInitialized) {
      logger.warn('Server already initialized');
      return;
    }

    logger.info('Initializing HANA MCP Server...');
    
    try {
      // Validate configuration
      const { config } = require('../utils/config');
      if (!config.validate()) {
        logger.warn('Configuration validation failed, but continuing...');
      }
      
      this.isInitialized = true;
      logger.info('HANA MCP Server initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize server:', error.message);
      throw error;
    }
  }

  /**
   * Start the server
   */
  async start() {
    logger.info('Starting HANA MCP Server...');
    
    try {
      await this.initialize();
      
      // Keep process alive
      this.keepAlive();
      
      logger.info('HANA MCP Server started successfully');
    } catch (error) {
      logger.error('Failed to start server:', error.message);
      throw error;
    }
  }

  /**
   * Shutdown the server gracefully
   */
  async shutdown() {
    if (this.isShuttingDown) {
      logger.warn('Shutdown already in progress');
      return;
    }

    logger.info('Shutting down HANA MCP Server...');
    this.isShuttingDown = true;

    try {
      // Disconnect from HANA database
      await connectionManager.disconnect();
      
      logger.info('HANA MCP Server shutdown completed');
    } catch (error) {
      logger.error('Error during shutdown:', error.message);
    } finally {
      process.exit(0);
    }
  }

  /**
   * Keep the process alive
   */
  keepAlive() {
    // Keep stdin open
    process.stdin.resume();
    
    // Keep process alive with interval
    setInterval(() => {
      // This keeps the event loop active
    }, 1000);
  }

  /**
   * Setup process event handlers
   */
  setupEventHandlers() {
    // Handle SIGINT (Ctrl+C)
    process.on('SIGINT', async () => {
      logger.info('Received SIGINT');
      await this.shutdown();
    });

    // Handle SIGTERM
    process.on('SIGTERM', async () => {
      logger.info('Received SIGTERM');
      await this.shutdown();
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception:', error.message);
      this.shutdown();
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled promise rejection:', reason);
      this.shutdown();
    });
  }

  /**
   * Get server status
   */
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      isShuttingDown: this.isShuttingDown,
      connectionStatus: connectionManager.getStatus()
    };
  }
}

// Create singleton instance
const lifecycleManager = new LifecycleManager();

module.exports = { LifecycleManager, lifecycleManager }; 