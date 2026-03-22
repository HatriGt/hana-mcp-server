const hana = require('@sap/hana-client');
const { redactSecrets } = require('../utils/sensitive-redact');

// Simple logger that doesn't interfere with JSON-RPC
const log = (msg) => console.error(`[HANA Client] ${new Date().toISOString()}: ${msg}`);

/**
 * Create and configure a HANA client
 * @param {Object} config - HANA connection configuration
 * @returns {Object} HANA client wrapper
 */
async function createHanaClient(config) {
  try {
    // Create connection
    const connection = hana.createConnection();
    
    // Use connection parameter building if available
    const connectionParams = config.getConnectionParams ? 
      config.getConnectionParams() : 
      buildLegacyConnectionParams(config);
    
    // Log database type information
    const dbType = config.getHanaDatabaseType ? config.getHanaDatabaseType() : 'single_container';
    log(`Connecting to HANA ${dbType} database...`);
    
    // Connect to HANA
    await connect(connection, connectionParams);
    
    log(`Successfully connected to HANA ${dbType} database`);
    
    // Return client wrapper with utility methods
    return {
      /**
       * Execute a SQL query
       * @param {string} sql - SQL query to execute
       * @param {Array} params - Query parameters
       * @returns {Promise<Array>} Query results
       */
      async query(sql, params = []) {
        try {
          const statement = connection.prepare(sql);
          const results = await executeStatement(statement, params);
          statement.drop();
          return results;
        } catch (error) {
          log(`Query execution error: ${redactSecrets(error.message)}`);
          throw new Error(`Query execution failed: ${redactSecrets(error.message)}`);
        }
      },
      
      /**
       * Execute a SQL query that returns a single value
       * @param {string} sql - SQL query to execute
       * @param {Array} params - Query parameters
       * @returns {Promise<any>} Query result
       */
      async queryScalar(sql, params = []) {
        const results = await this.query(sql, params);
        if (results.length === 0) return null;
        
        const firstRow = results[0];
        const keys = Object.keys(firstRow);
        if (keys.length === 0) return null;
        
        return firstRow[keys[0]];
      },
      
      /**
       * Disconnect from HANA database
       * @returns {Promise<void>}
       */
      async disconnect() {
        return new Promise((resolve, reject) => {
          connection.disconnect(err => {
            if (err) {
              log(`Error disconnecting from HANA: ${redactSecrets(err.message)}`);
              reject(err);
            } else {
              log('Disconnected from HANA database');
              resolve();
            }
          });
        });
      }
    };
  } catch (error) {
    log(`Failed to create HANA client: ${redactSecrets(error.message)}`);
    throw error;
  }
}

/**
 * Build legacy connection parameters for backward compatibility
 */
function buildLegacyConnectionParams(config) {
  return {
    serverNode: `${config.host}:${config.port}`,
    uid: config.user,
    pwd: config.password,
    encrypt: config.encrypt !== false,
    sslValidateCertificate: config.validateCert !== false,
    ...(config.databaseName ? { databaseName: config.databaseName } : {}),
    ...config.additionalParams
  };
}

/**
 * Connect to HANA database
 * @param {Object} connection - HANA connection object
 * @param {Object} params - Connection parameters
 * @returns {Promise<void>}
 */
function connect(connection, params) {
  return new Promise((resolve, reject) => {
    connection.connect(params, (err) => {
      if (err) {
        reject(new Error(`HANA connection failed: ${redactSecrets(err.message)}`));
      } else {
        resolve();
      }
    });
  });
}

/**
 * Execute a prepared statement
 * @param {Object} statement - Prepared statement
 * @param {Array} params - Statement parameters
 * @returns {Promise<Array>} Query results
 */
function executeStatement(statement, params) {
  return new Promise((resolve, reject) => {
    statement.execQuery(params, (err, results) => {
      if (err) {
        reject(err);
      } else {
        // Convert results to array of objects
        const rows = [];
        while (results.next()) {
          rows.push(results.getValues());
        }
        resolve(rows);
      }
    });
  });
}

module.exports = {
  createHanaClient
};
