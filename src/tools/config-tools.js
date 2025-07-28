/**
 * Configuration-related tools for HANA MCP Server
 */

const { logger } = require('../utils/logger');
const { config } = require('../utils/config');
const { connectionManager } = require('../database/connection-manager');
const Formatters = require('../utils/formatters');

class ConfigTools {
  /**
   * Show HANA configuration
   */
  static async showConfig(args) {
    logger.tool('hana_show_config');
    
    const displayConfig = config.getDisplayConfig();
    const formattedConfig = Formatters.formatConfig(displayConfig);
    
    return Formatters.createResponse(formattedConfig);
  }

  /**
   * Test HANA connection
   */
  static async testConnection(args) {
    logger.tool('hana_test_connection');
    
    if (!config.isHanaConfigured()) {
      const missingConfig = config.getDisplayConfig();
      const errorMessage = Formatters.formatConnectionTest(missingConfig, false, 'Missing required configuration');
      return Formatters.createErrorResponse('Connection test failed!', errorMessage);
    }
    
    try {
      const testResult = await connectionManager.testConnection();
      const displayConfig = config.getDisplayConfig();
      
      if (testResult.success) {
        const successMessage = Formatters.formatConnectionTest(displayConfig, true, null, testResult.result);
        return Formatters.createResponse(successMessage);
      } else {
        const errorMessage = Formatters.formatConnectionTest(displayConfig, false, testResult.error);
        return Formatters.createErrorResponse('Connection test failed!', errorMessage);
      }
    } catch (error) {
      logger.error('Connection test error:', error.message);
      const displayConfig = config.getDisplayConfig();
      const errorMessage = Formatters.formatConnectionTest(displayConfig, false, error.message);
      return Formatters.createErrorResponse('Connection test failed!', errorMessage);
    }
  }

  /**
   * Show environment variables
   */
  static async showEnvVars(args) {
    logger.tool('hana_show_env_vars');
    
    const envVars = config.getEnvironmentVars();
    const formattedEnvVars = Formatters.formatEnvironmentVars(envVars);
    
    return Formatters.createResponse(formattedEnvVars);
  }
}

module.exports = ConfigTools; 