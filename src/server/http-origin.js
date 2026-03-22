/**
 * CORS-style Origin check for MCP HTTP transport.
 * Env: MCP_HTTP_ALLOWED_ORIGINS — comma-separated list, or "*" for any.
 * When unset, defaults to the literal "null" (only the string "null" is allowed), matching http-index behaviour.
 */

function parseAllowedOrigins(envValue) {
  const allowed = envValue !== undefined && envValue !== null && envValue !== ''
    ? String(envValue)
    : 'null';
  return allowed.split(',').map((s) => s.trim());
}

/**
 * @param {string|undefined} origin - Request Origin header (may be undefined)
 * @param {string|undefined} envValue - process.env.MCP_HTTP_ALLOWED_ORIGINS
 * @returns {boolean} true if request should proceed
 */
function isOriginAllowed(origin, envValue) {
  if (!origin) return true;
  const allowedList = parseAllowedOrigins(envValue);
  return allowedList.includes('*') || allowedList.includes(origin);
}

module.exports = { parseAllowedOrigins, isOriginAllowed };
