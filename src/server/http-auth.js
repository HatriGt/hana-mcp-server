/**
 * Optional HTTP auth: validate Authorization: Bearer <JWT> using OIDC JWKS.
 * Set MCP_HTTP_AUTH_ENABLED=true. Set MCP_HTTP_JWT_ISSUER (or rely on BTP: bind XSUAA and issuer is read from VCAP_SERVICES).
 * Optional: MCP_HTTP_JWT_AUDIENCE, MCP_HTTP_JWT_SCOPES_REQUIRED (comma-separated).
 */

const { createRemoteJWKSet, jwtVerify } = require('jose');
const https = require('https');
const http = require('http');

let jwksCache = null;
let jwksIssuer = null;

function getIssuer() {
  const fromEnv = process.env.MCP_HTTP_JWT_ISSUER;
  if (fromEnv) return fromEnv.trim();
  try {
    const vcap = process.env.VCAP_SERVICES && JSON.parse(process.env.VCAP_SERVICES);
    const xsuaa = vcap && vcap.xsuaa && vcap.xsuaa[0];
    if (xsuaa && xsuaa.credentials && xsuaa.credentials.url) {
      return xsuaa.credentials.url.replace(/\/$/, '');
    }
  } catch (_) { /* ignore */ }
  return null;
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const lib = u.protocol === 'https:' ? https : http;
    lib.get(url, (res) => {
      let data = '';
      res.on('data', (c) => { data += c; });
      res.on('end', () => {
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode}`));
          return;
        }
        try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

async function getJwks(issuer) {
  if (jwksCache && jwksIssuer === issuer) return jwksCache;
  const base = issuer.endsWith('/') ? issuer.slice(0, -1) : issuer;
  const doc = await fetchJson(`${base}/.well-known/openid-configuration`);
  if (!doc.jwks_uri) throw new Error('OIDC discovery missing jwks_uri');
  jwksCache = createRemoteJWKSet(new URL(doc.jwks_uri));
  jwksIssuer = issuer;
  return jwksCache;
}

/**
 * Validate Bearer token from request. Returns claims or throws (err.statusCode, err.wwwAuth set).
 */
async function validateBearer(req) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    const err = new Error('Missing or invalid Authorization header');
    err.statusCode = 401;
    err.wwwAuth = 'Bearer';
    throw err;
  }
  const token = auth.slice(7).trim();
  if (!token) {
    const err = new Error('Empty Bearer token');
    err.statusCode = 401;
    err.wwwAuth = 'Bearer';
    throw err;
  }

  const issuer = getIssuer();
  if (!issuer) {
    const err = new Error('MCP_HTTP_JWT_ISSUER or XSUAA binding required when auth is enabled');
    err.statusCode = 503;
    throw err;
  }

  const audience = process.env.MCP_HTTP_JWT_AUDIENCE || undefined;
  const requiredScopes = (process.env.MCP_HTTP_JWT_SCOPES_REQUIRED || '')
    .split(',').map(s => s.trim()).filter(Boolean);

  const jwks = await getJwks(issuer);
  const { payload } = await jwtVerify(token, jwks, {
    issuer,
    audience: audience || undefined,
    clockTolerance: 60
  });

  if (requiredScopes.length > 0) {
    const scope = payload.scope || payload.scopes || '';
    const scopes = typeof scope === 'string' ? scope.split(' ').filter(Boolean) : [];
    const hasAll = requiredScopes.every(s => scopes.includes(s));
    if (!hasAll) {
      const err = new Error('Insufficient scope');
      err.statusCode = 403;
      throw err;
    }
  }

  return { sub: payload.sub, scope: payload.scope };
}

module.exports = { validateBearer, getIssuer };
