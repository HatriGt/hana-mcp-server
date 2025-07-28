const { logger } = require('../utils/custom-logger');

/**
 * Create configuration and connection test tools
 * @param {Object} hanaClient - HANA client instance
 * @returns {Object} Map of tool names to handler functions
 */
function configTools(hanaClient) {
  return {
    /**
     * Show HANA database configuration
     */
    hana_show_config: {
      description: "Show the HANA database configuration",
      inputSchema: {
        type: "object",
        properties: {},
        required: []
      },
      readOnly: true,
      async handler() {
        try {
          // Get configuration from environment variables
          const config = {
            host: process.env.HANA_HOST,
            port: process.env.HANA_PORT || '443',
            user: process.env.HANA_USER,
            password: process.env.HANA_PASSWORD ? 'SET (hidden)' : 'NOT SET',
            schema: process.env.HANA_SCHEMA || 'default',
            ssl: process.env.HANA_SSL !== 'false'
          };
          
          const configText = `HANA Database Configuration:\n\n` +
            `Host: ${config.host || 'NOT SET'}\n` +
            `Port: ${config.port}\n` +
            `User: ${config.user || 'NOT SET'}\n` +
            `Password: ${config.password}\n` +
            `Schema: ${config.schema}\n` +
            `SSL: ${config.ssl ? 'Enabled' : 'Disabled'}\n\n` +
            `Status: ${config.host && config.user && process.env.HANA_PASSWORD ? 'PROPERLY CONFIGURED' : 'MISSING REQUIRED VALUES'}`;
          
          return {
            content: [
              {
                type: "text",
                text: configText
              }
            ]
          };
        } catch (error) {
          logger.error('Error showing config:', error);
          throw new Error(`Failed to show configuration: ${error.message}`);
        }
      }
    },
    
    /**
     * Test HANA database connection
     */
    hana_test_connection: {
      description: "Test connection to HANA database",
      inputSchema: {
        type: "object",
        properties: {},
        required: []
      },
      readOnly: true,
      async handler() {
        try {
          // Check if we have the minimum required configuration
          if (!process.env.HANA_HOST || !process.env.HANA_USER || !process.env.HANA_PASSWORD) {
            return {
              content: [
                {
                  type: "text",
                  text: `❌ Connection test failed!\n\n` +
                        `Missing required configuration:\n` +
                        `- HANA_HOST: ${process.env.HANA_HOST ? '✓' : '✗'}\n` +
                        `- HANA_USER: ${process.env.HANA_USER ? '✓' : '✗'}\n` +
                        `- HANA_PASSWORD: ${process.env.HANA_PASSWORD ? '✓' : '✗'}\n\n` +
                        `Please configure these environment variables in your Claude Desktop configuration.`
                }
              ]
            };
          }
          
          // Test the connection by executing a simple query
          const testQuery = 'SELECT 1 as test_value FROM DUMMY';
          const result = await hanaClient.query(testQuery);
          
          if (result && result.length > 0) {
            return {
              content: [
                {
                  type: "text",
                  text: `✅ Connection test successful!\n\n` +
                        `Configuration looks good:\n` +
                        `- Host: ${process.env.HANA_HOST}\n` +
                        `- Port: ${process.env.HANA_PORT || '443 (default)'}\n` +
                        `- User: ${process.env.HANA_USER}\n` +
                        `- Schema: ${process.env.HANA_SCHEMA || 'default'}\n` +
                        `- SSL: ${process.env.HANA_SSL !== 'false' ? 'enabled' : 'disabled'}\n\n` +
                        `Test query result: ${result[0].TEST_VALUE}`
                }
              ]
            };
          } else {
            throw new Error('Connection test returned no results');
          }
        } catch (error) {
          logger.error('Error testing connection:', error);
          return {
            content: [
              {
                type: "text",
                text: `❌ Connection test failed!\n\n` +
                      `Error: ${error.message}\n\n` +
                      `Please check your HANA database configuration and ensure the database is accessible.`
              }
            ]
          };
        }
      }
    },
    
    /**
     * Show environment variables
     */
    hana_show_env_vars: {
      description: "Show all HANA-related environment variables (for debugging)",
      inputSchema: {
        type: "object",
        properties: {},
        required: []
      },
      readOnly: true,
      async handler() {
        try {
          const envVars = Object.keys(process.env)
            .filter(key => key.startsWith('HANA_'))
            .map(key => `${key}=${key.includes('PASSWORD') ? '***HIDDEN***' : process.env[key]}`)
            .join('\n');
          
          return {
            content: [
              {
                type: "text",
                text: `🔍 HANA Environment Variables:\n\n${envVars || 'No HANA_* environment variables found'}\n\n` +
                      `Total environment variables: ${Object.keys(process.env).length}`
              }
            ]
          };
        } catch (error) {
          logger.error('Error showing environment variables:', error);
          throw new Error(`Failed to show environment variables: ${error.message}`);
        }
      }
    }
  };
}

module.exports = configTools; 