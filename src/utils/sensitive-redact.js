/**
 * Strip known secrets from strings before logs or MCP-facing error text.
 * Covers HANA_PASSWORD (env) and JWT-shaped bearer / access tokens.
 */

/**
 * HANA_PASSWORD plus every password inside HANA_DATABASES. Parsed from env directly
 * (not via config) to avoid a require cycle; cached per raw value.
 */
let _cacheRaw;
let _cachePwds = [];
function knownPasswords() {
  const raw = process.env.HANA_DATABASES || '';
  if (raw !== _cacheRaw) {
    _cacheRaw = raw;
    _cachePwds = [];
    if (raw.trim()) {
      try {
        const parsed = JSON.parse(raw);
        for (const p of Object.values(parsed || {})) {
          if (p && p.password) _cachePwds.push(String(p.password));
        }
      } catch (_) { /* invalid JSON is reported by config at boot */ }
    }
  }
  const out = _cachePwds.slice();
  if (process.env.HANA_PASSWORD) out.push(process.env.HANA_PASSWORD);
  // Longest first so a password containing another isn't partially redacted.
  return out.filter((p) => p.length > 0).sort((a, b) => b.length - a.length);
}

function redactSecrets(input) {
  if (input == null) return input;
  const s = typeof input === 'string' ? input : String(input);
  let out = s;

  for (const pwd of knownPasswords()) {
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
