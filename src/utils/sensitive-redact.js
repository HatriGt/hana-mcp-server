/**
 * Strip known secrets from strings before logs or MCP-facing error text.
 * Covers HANA_PASSWORD (env) and JWT-shaped bearer / access tokens.
 */

function redactSecrets(input) {
  if (input == null) return input;
  const s = typeof input === 'string' ? input : String(input);
  let out = s;

  const pwd = process.env.HANA_PASSWORD;
  if (pwd && pwd.length > 0) {
    out = out.split(pwd).join('[REDACTED]');
  }

  // Authorization: Bearer <JWT>
  out = out.replace(
    /\bBearer\s+([A-Za-z0-9_-]+\.[A-Za-z0-9_.+/=-]+\.[A-Za-z0-9_.+/=-]+)\b/gi,
    'Bearer [REDACTED]'
  );

  // Typical JWT access tokens (three base64url segments, often starting with eyJ)
  out = out.replace(
    /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_.+/=-]+\.[A-Za-z0-9_.+/=-]+\b/g,
    '[REDACTED]'
  );

  return out;
}

module.exports = { redactSecrets };
