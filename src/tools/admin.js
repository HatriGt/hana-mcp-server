const { logger } = require('../utils/custom-logger');

/**
 * Create administrative tools
 * @param {Object} hanaClient - HANA client instance
 * @returns {Object} Map of tool names to handler functions
 */
function adminTools(hanaClient) {
  return {
    /**
     * Get database system information
     * @returns {Promise<Object>} System information
     */
    hana_get_system_info: async () => {
      try {
        // Get HANA version
        const versionQuery = `
          SELECT 
            VERSION, 
            VERSION_MAJOR, 
            VERSION_MINOR, 
            VERSION_REVISION 
          FROM SYS.M_DATABASE
        `;
        const versionInfo = await hanaClient.query(versionQuery);
        
        // Get system statistics
        const statsQuery = `
          SELECT 
            HOST, 
            SERVICE_NAME, 
            STATUS, 
            IS_ACTIVE, 
            CPU 
          FROM SYS.M_SERVICES
        `;
        const systemStats = await hanaClient.query(statsQuery);
        
        return {
          version: versionInfo[0],
          services: systemStats
        };
      } catch (error) {
        logger.error('Error getting system info:', error);
        throw new Error(`Failed to get system info: ${error.message}`);
      }
    },
    
    /**
     * Test database connection
     * @returns {Promise<Object>} Connection status
     */
    hana_test_connection: async () => {
      try {
        // Simple query to test connection
        const result = await hanaClient.queryScalar('SELECT 1 FROM DUMMY');
        
        return {
          connected: result === 1,
          status: 'success',
          message: 'Connection to HANA database is working'
        };
      } catch (error) {
        logger.error('Connection test failed:', error);
        return {
          connected: false,
          status: 'error',
          message: `Connection failed: ${error.message}`
        };
      }
    },
    
    /**
     * Get current user and privileges
     * @returns {Promise<Object>} User information
     */
    hana_get_current_user: async () => {
      try {
        // Get current user
        const userQuery = 'SELECT CURRENT_USER AS username FROM DUMMY';
        const username = await hanaClient.queryScalar(userQuery);
        
        // Get user privileges
        const privilegesQuery = `
          SELECT 
            PRIVILEGE_NAME,
            OBJECT_TYPE,
            OBJECT_NAME
          FROM 
            SYS.GRANTED_PRIVILEGES
          WHERE 
            GRANTEE = CURRENT_USER
          ORDER BY 
            PRIVILEGE_NAME
        `;
        const privileges = await hanaClient.query(privilegesQuery);
        
        return {
          username,
          privileges
        };
      } catch (error) {
        logger.error('Error getting user info:', error);
        throw new Error(`Failed to get user info: ${error.message}`);
      }
    },
    
    /**
     * Get database memory usage
     * @returns {Promise<Object>} Memory usage information
     */
    hana_get_memory_usage: async () => {
      try {
        const query = `
          SELECT 
            HOST, 
            SERVICE_NAME, 
            USED_PHYSICAL_MEMORY, 
            FREE_PHYSICAL_MEMORY,
            PHYSICAL_MEMORY_SIZE,
            INSTANCE_TOTAL_MEMORY_USED_SIZE,
            INSTANCE_CODE_SIZE,
            INSTANCE_SHARED_MEMORY_ALLOCATED_SIZE
          FROM 
            SYS.M_SERVICE_MEMORY
        `;
        
        const results = await hanaClient.query(query);
        
        return {
          memoryUsage: results
        };
      } catch (error) {
        logger.error('Error getting memory usage:', error);
        throw new Error(`Failed to get memory usage: ${error.message}`);
      }
    }
  };
}

module.exports = adminTools;
