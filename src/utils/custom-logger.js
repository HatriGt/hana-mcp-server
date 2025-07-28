/**
 * Custom logger that doesn't output to console to avoid JSON-RPC interference
 * This logger can be configured to write to files or be completely silent
 */

class CustomLogger {
  constructor(options = {}) {
    this.level = options.level || 'info';
    this.enableFileLogging = options.enableFileLogging || false;
    this.logFile = options.logFile || './hana-mcp-server.log';
    this.enableConsole = options.enableConsole || false;
    
    // Log levels
    this.levels = {
      error: 0,
      warn: 1,
      info: 2,
      debug: 3
    };
    
    this.currentLevel = this.levels[this.level] || 1;
  }

  /**
   * Write log message to file if file logging is enabled
   */
  writeToFile(level, message, meta = {}) {
    if (!this.enableFileLogging) return;
    
    try {
      const fs = require('fs');
      const timestamp = new Date().toISOString();
      const logEntry = {
        timestamp,
        level,
        message,
        ...meta
      };
      
      fs.appendFileSync(this.logFile, JSON.stringify(logEntry) + '\n');
    } catch (error) {
      // Silently fail if file writing fails
    }
  }

  /**
   * Write to console only if explicitly enabled
   */
  writeToConsole(level, message, meta = {}) {
    if (!this.enableConsole) return;
    
    const timestamp = new Date().toISOString();
    const prefix = `[HANA MCP ${level.toUpperCase()}] ${timestamp}`;
    
    // Use console.error to avoid interfering with stdout (JSON-RPC)
    console.error(`${prefix}: ${message}`);
    if (Object.keys(meta).length > 0) {
      console.error(`${prefix}: Meta:`, JSON.stringify(meta));
    }
  }

  /**
   * Log a message if the level is appropriate
   */
  log(level, message, meta = {}) {
    if (this.levels[level] <= this.currentLevel) {
      this.writeToFile(level, message, meta);
      this.writeToConsole(level, message, meta);
    }
  }

  error(message, meta = {}) {
    this.log('error', message, meta);
  }

  warn(message, meta = {}) {
    this.log('warn', message, meta);
  }

  info(message, meta = {}) {
    this.log('info', message, meta);
  }

  debug(message, meta = {}) {
    this.log('debug', message, meta);
  }

  /**
   * Create a child logger with additional context
   */
  child(context = {}) {
    const childLogger = new CustomLogger({
      level: this.level,
      enableFileLogging: this.enableFileLogging,
      logFile: this.logFile,
      enableConsole: this.enableConsole
    });
    
    // Add context to all log messages
    const originalLog = childLogger.log.bind(childLogger);
    childLogger.log = (level, message, meta = {}) => {
      originalLog(level, message, { ...context, ...meta });
    };
    
    return childLogger;
  }
}

// Create default logger instance
const logger = new CustomLogger({
  level: process.env.LOG_LEVEL || 'info',
  enableFileLogging: process.env.ENABLE_FILE_LOGGING === 'true',
  enableConsole: process.env.ENABLE_CONSOLE_LOGGING === 'true'
});

module.exports = {
  CustomLogger,
  logger
}; 