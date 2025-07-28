/**
 * Centralized logging utility for HANA MCP Server
 * Uses console.error to avoid interfering with JSON-RPC stdout
 */

const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

const LOG_LEVEL_NAMES = {
  0: 'ERROR',
  1: 'WARN', 
  2: 'INFO',
  3: 'DEBUG'
};

class Logger {
  constructor(level = 'INFO') {
    this.level = LOG_LEVELS[level.toUpperCase()] || LOG_LEVELS.INFO;
    this.prefix = '[HANA MCP Server]';
  }

  _log(level, message, ...args) {
    if (level <= this.level) {
      const timestamp = new Date().toISOString();
      const levelName = LOG_LEVEL_NAMES[level];
      const formattedMessage = `${this.prefix} ${timestamp} [${levelName}]: ${message}`;
      
      // Use console.error to avoid interfering with JSON-RPC stdout
      console.error(formattedMessage, ...args);
    }
  }

  error(message, ...args) {
    this._log(LOG_LEVELS.ERROR, message, ...args);
  }

  warn(message, ...args) {
    this._log(LOG_LEVELS.WARN, message, ...args);
  }

  info(message, ...args) {
    this._log(LOG_LEVELS.INFO, message, ...args);
  }

  debug(message, ...args) {
    this._log(LOG_LEVELS.DEBUG, message, ...args);
  }

  // Convenience method for method calls
  method(methodName, ...args) {
    this.info(`Handling method: ${methodName}`, ...args);
  }

  // Convenience method for tool calls
  tool(toolName, ...args) {
    this.info(`Calling tool: ${toolName}`, ...args);
  }
}

// Create default logger instance
const logger = new Logger(process.env.LOG_LEVEL || 'INFO');

module.exports = { Logger, logger }; 