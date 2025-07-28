const { logger } = require('./logger');

/**
 * Validate SQL query for security
 * @param {string} query - SQL query to validate
 * @throws {Error} If query contains disallowed statements
 */
function validateQuery(query) {
  if (!query) {
    throw new Error('Query cannot be empty');
  }
  
  // Convert to uppercase for easier pattern matching
  const upperQuery = query.toUpperCase();
  
  // Disallow data modification statements
  const disallowedPatterns = [
    /\bINSERT\s+INTO\b/,
    /\bUPDATE\s+.*\bSET\b/,
    /\bDELETE\s+FROM\b/,
    /\bTRUNCATE\s+TABLE\b/,
    /\bDROP\s+/,
    /\bALTER\s+/,
    /\bCREATE\s+/,
    /\bGRANT\s+/,
    /\bREVOKE\s+/,
    /\bMERGE\s+INTO\b/,
    /\bEXEC\b/,
    /\bCALL\b/
  ];
  
  for (const pattern of disallowedPatterns) {
    if (pattern.test(upperQuery)) {
      const match = upperQuery.match(pattern);
      logger.warn(`Disallowed SQL statement detected: ${match[0]}`);
      throw new Error(`Disallowed SQL statement detected: ${match[0]}`);
    }
  }
  
  // Check for multiple statements (semicolon followed by non-whitespace)
  if (/;\s*\S/.test(query)) {
    logger.warn('Multiple SQL statements are not allowed');
    throw new Error('Multiple SQL statements are not allowed');
  }
  
  return true;
}

module.exports = {
  validateQuery
};
