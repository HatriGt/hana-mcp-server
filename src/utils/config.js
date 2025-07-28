const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

/**
 * Load configuration from environment variables or config file
 * @returns {Object} Configuration object
 */
function loadConfig() {
  // Load .env file if it exists
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
  }
  
  // Default configuration
  const config = {
    // Server configuration
    transport: process.env.MCP_TRANSPORT || 'stdio', // Default to STDIO for Claude Desktop
    host: process.env.MCP_HOST || 'localhost',
    port: parseInt(process.env.MCP_PORT) || 3000,
    
    // HANA connection configuration
    hana: {
      host: process.env.HANA_HOST,
      port: parseInt(process.env.HANA_PORT) || 443, // Default to 443 for HANA Cloud
      user: process.env.HANA_USER,
      password: process.env.HANA_PASSWORD,
      schema: process.env.HANA_SCHEMA,
      ssl: process.env.HANA_SSL !== 'false', // Default to true
      encrypt: process.env.HANA_ENCRYPT !== 'false',
      validateCert: process.env.HANA_VALIDATE_CERT !== 'false',
      additionalParams: {}
    },
    
    // Security configuration
    security: {
      readOnly: process.env.MCP_READ_ONLY !== 'false',
      allowedSchemas: process.env.MCP_ALLOWED_SCHEMAS ? 
        process.env.MCP_ALLOWED_SCHEMAS.split(',').map(s => s.trim()) : 
        undefined
    },
    
    // Logging configuration
    logging: {
      level: process.env.LOG_LEVEL || 'info'
    }
  };
  
  // Validate required HANA configuration
  const missingConfig = [];
  
  if (!config.hana.host) {
    missingConfig.push('HANA_HOST');
  }
  
  if (!config.hana.user) {
    missingConfig.push('HANA_USER');
  }
  
  if (!config.hana.password) {
    missingConfig.push('HANA_PASSWORD');
  }
  
  if (missingConfig.length > 0) {
    throw new Error(`Missing required HANA configuration: ${missingConfig.join(', ')}. Please set these environment variables.`);
  }
  
  return config;
}

module.exports = {
  loadConfig
};
