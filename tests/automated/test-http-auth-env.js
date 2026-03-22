#!/usr/bin/env node
/**
 * http-auth: MCP_HTTP_JWT_ISSUER, VCAP_SERVICES (XSUAA URL), MCP_HTTP_JWT_AUDIENCE,
 * MCP_HTTP_JWT_SCOPES_REQUIRED, and validateBearer against a local OIDC discovery + JWKS server.
 */

const assert = require('assert');
const http = require('http');
const crypto = require('crypto');
const { spawn } = require('child_process');
const path = require('path');

const projectRoot = path.join(__dirname, '..', '..');
const httpScript = path.join(projectRoot, 'src', 'server', 'http-index.js');

function loadAuth() {
  const p = require.resolve('../../src/server/http-auth');
  delete require.cache[p];
  return require('../../src/server/http-auth');
}

function withIssuerEnv(overrides, fn) {
  const keys = Object.keys(overrides);
  const saved = {};
  for (const k of keys) {
    saved[k] = process.env[k];
    const v = overrides[k];
    if (v === undefined || v === null) delete process.env[k];
    else process.env[k] = typeof v === 'string' ? v : JSON.stringify(v);
  }
  try {
    fn();
  } finally {
    for (const k of keys) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  }
}

async function startOidcMock() {
  const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  const { exportJWK, SignJWT } = require('jose');
  const pubJwk = await exportJWK(publicKey);
  const kid = 'hana-mcp-test-kid';
  const server = http.createServer((req, res) => {
    const u = (req.url || '').split('?')[0];
    if (u === '/.well-known/openid-configuration') {
      const port = server.address().port;
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ jwks_uri: `http://127.0.0.1:${port}/jwks` }));
      return;
    }
    if (u === '/jwks') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          keys: [{ ...pubJwk, kid, use: 'sig', alg: 'RS256' }]
        })
      );
      return;
    }
    res.writeHead(404);
    res.end();
  });
  await new Promise((resolve, reject) => {
    server.listen(0, '127.0.0.1', () => resolve());
    server.on('error', reject);
  });
  const port = server.address().port;
  const issuer = `http://127.0.0.1:${port}`;
  async function signToken(claims = {}, opts = {}) {
    let jwt = new SignJWT({
      sub: 'user-1',
      scope: 'openid data.read',
      ...claims
    })
      .setProtectedHeader({ alg: 'RS256', kid })
      .setIssuer(issuer)
      .setExpirationTime('10m');
    if (opts.audience) {
      jwt = jwt.setAudience(opts.audience);
    }
    return jwt.sign(privateKey);
  }
  return { server, issuer, signToken, close: () => new Promise((r) => server.close(() => r())) };
}

function reservePort() {
  return new Promise((resolve, reject) => {
    const net = require('net');
    const s = net.createServer();
    s.listen(0, '127.0.0.1', () => {
      const p = s.address().port;
      s.close(() => resolve(p));
    });
    s.on('error', reject);
  });
}

function httpGet(port, path) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        host: '127.0.0.1',
        port,
        path,
        method: 'GET',
        timeout: 2000
      },
      (res) => {
        res.resume();
        resolve(res.statusCode);
      }
    );
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('GET timeout'));
    });
    req.end();
  });
}

async function waitForHttpServer(port, maxMs = 15000) {
  const start = Date.now();
  let lastErr;
  while (Date.now() - start < maxMs) {
    try {
      const code = await httpGet(port, '/health');
      if (code === 200) return;
    } catch (e) {
      lastErr = e;
    }
    await new Promise((r) => setTimeout(r, 80));
  }
  throw lastErr || new Error(`Server on port ${port} did not respond`);
}

function postMcp(port, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        host: '127.0.0.1',
        port,
        path: '/mcp',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
          ...headers
        }
      },
      (res) => {
        let data = '';
        res.on('data', (c) => {
          data += c;
        });
        res.on('end', () => resolve({ status: res.statusCode, data }));
      }
    );
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

const initBody = JSON.stringify({
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: { protocolVersion: '2025-11-25', capabilities: {}, clientInfo: { name: 't', version: '1' } }
});

async function main() {
  console.log('HTTP auth env tests\n');

  withIssuerEnv({ MCP_HTTP_JWT_ISSUER: '  https://issuer.example/  ' }, () => {
    const { getIssuer } = loadAuth();
    assert.strictEqual(getIssuer(), 'https://issuer.example/');
  });
  console.log('  ok: MCP_HTTP_JWT_ISSUER trimmed');

  const xsuaaUrl = 'https://subaccount.authentication.sap.hana.ondemand.com';
  withIssuerEnv(
    {
      MCP_HTTP_JWT_ISSUER: undefined,
      VCAP_SERVICES: {
        xsuaa: [{ credentials: { url: `${xsuaaUrl}/` } }]
      }
    },
    () => {
      delete process.env.MCP_HTTP_JWT_ISSUER;
      const { getIssuer } = loadAuth();
      assert.strictEqual(getIssuer(), xsuaaUrl);
    }
  );
  console.log('  ok: VCAP_SERVICES xsuaa[0].credentials.url becomes issuer');

  withIssuerEnv({ MCP_HTTP_JWT_ISSUER: undefined, VCAP_SERVICES: 'not-json' }, () => {
    delete process.env.MCP_HTTP_JWT_ISSUER;
    const { getIssuer } = loadAuth();
    assert.strictEqual(getIssuer(), null);
  });
  console.log('  ok: invalid VCAP JSON yields null issuer');

  const mock = await startOidcMock();
  try {
    process.env.MCP_HTTP_JWT_ISSUER = mock.issuer;
    delete process.env.MCP_HTTP_JWT_AUDIENCE;
    delete process.env.MCP_HTTP_JWT_SCOPES_REQUIRED;
    const { validateBearer } = loadAuth();

    const token = await mock.signToken();
    const claims = await validateBearer({
      headers: { authorization: `Bearer ${token}` }
    });
    assert.strictEqual(claims.sub, 'user-1');
    console.log('  ok: validateBearer accepts signed JWT from local JWKS');

    await assert.rejects(
      () => validateBearer({ headers: {} }),
      (e) => e.statusCode === 401
    );
    await assert.rejects(
      () => validateBearer({ headers: { authorization: 'Bearer ' } }),
      (e) => e.statusCode === 401
    );
    console.log('  ok: validateBearer 401 without / empty token');

    process.env.MCP_HTTP_JWT_SCOPES_REQUIRED = 'missing.scope';
    await assert.rejects(
      () => validateBearer({ headers: { authorization: `Bearer ${token}` } }),
      (e) => e.statusCode === 403
    );
    delete process.env.MCP_HTTP_JWT_SCOPES_REQUIRED;
    console.log('  ok: MCP_HTTP_JWT_SCOPES_REQUIRED enforces scopes');

    process.env.MCP_HTTP_JWT_AUDIENCE = 'mcp-test-aud';
    const tokenAud = await mock.signToken({}, { audience: 'mcp-test-aud' });
    const c2 = await validateBearer({ headers: { authorization: `Bearer ${tokenAud}` } });
    assert.strictEqual(c2.sub, 'user-1');
    delete process.env.MCP_HTTP_JWT_AUDIENCE;
    console.log('  ok: MCP_HTTP_JWT_AUDIENCE validated on JWT');
  } finally {
    delete process.env.MCP_HTTP_JWT_ISSUER;
    delete process.env.MCP_HTTP_JWT_AUDIENCE;
    delete process.env.MCP_HTTP_JWT_SCOPES_REQUIRED;
    await mock.close();
  }

  console.log('\nHTTP CORS spawn (MCP_HTTP_ALLOWED_ORIGINS) tests\n');

  const corsPort = await reservePort();
  let corsChild;
  try {
    corsChild = spawn(process.execPath, [httpScript], {
      stdio: ['ignore', 'pipe', 'pipe'],
      cwd: projectRoot,
      env: {
        ...process.env,
        MCP_HTTP_PORT: String(corsPort),
        MCP_HTTP_HOST: '127.0.0.1'
      }
    });
    await waitForHttpServer(corsPort);
    const blocked = await postMcp(corsPort, initBody, { Origin: 'https://untrusted.example' });
    assert.strictEqual(blocked.status, 403);
    console.log('  ok: default origins reject foreign Origin header');
  } finally {
    if (corsChild) {
      corsChild.kill('SIGTERM');
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  const corsPort2 = await reservePort();
  let corsChild2;
  try {
    corsChild2 = spawn(process.execPath, [httpScript], {
      stdio: ['ignore', 'pipe', 'pipe'],
      cwd: projectRoot,
      env: {
        ...process.env,
        MCP_HTTP_PORT: String(corsPort2),
        MCP_HTTP_HOST: '127.0.0.1',
        MCP_HTTP_ALLOWED_ORIGINS: '*'
      }
    });
    await waitForHttpServer(corsPort2);
    const allowed = await postMcp(corsPort2, initBody, { Origin: 'https://any.example' });
    assert.strictEqual(allowed.status, 200);
    console.log('  ok: MCP_HTTP_ALLOWED_ORIGINS=* accepts arbitrary Origin');
  } finally {
    if (corsChild2) {
      corsChild2.kill('SIGTERM');
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  const corsPort3 = await reservePort();
  let corsChild3;
  try {
    corsChild3 = spawn(process.execPath, [httpScript], {
      stdio: ['ignore', 'pipe', 'pipe'],
      cwd: projectRoot,
      env: {
        ...process.env,
        MCP_HTTP_PORT: String(corsPort3),
        MCP_HTTP_HOST: '127.0.0.1',
        MCP_HTTP_ALLOWED_ORIGINS: 'https://partner.app,https://other.app'
      }
    });
    await waitForHttpServer(corsPort3);
    const deny = await postMcp(corsPort3, initBody, { Origin: 'https://not-listed.example' });
    assert.strictEqual(deny.status, 403);
    const okList = await postMcp(corsPort3, initBody, { Origin: 'https://partner.app' });
    assert.strictEqual(okList.status, 200);
    console.log('  ok: explicit MCP_HTTP_ALLOWED_ORIGINS allowlist');
  } finally {
    if (corsChild3) {
      corsChild3.kill('SIGTERM');
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  console.log('\nHTTP auth spawn (MCP_HTTP_AUTH_ENABLED) tests\n');

  const noIssuerPort = await reservePort();
  let noIssuerChild;
  try {
    const baseEnv = { ...process.env, MCP_HTTP_PORT: String(noIssuerPort), MCP_HTTP_HOST: '127.0.0.1', MCP_HTTP_AUTH_ENABLED: 'true' };
    delete baseEnv.MCP_HTTP_JWT_ISSUER;
    delete baseEnv.VCAP_SERVICES;
    noIssuerChild = spawn(process.execPath, [httpScript], {
      stdio: ['ignore', 'pipe', 'pipe'],
      cwd: projectRoot,
      env: baseEnv
    });
    await waitForHttpServer(noIssuerPort);
    // Missing Authorization yields 401 before issuer check; use a dummy Bearer to reach 503.
    const noIss = await postMcp(noIssuerPort, initBody, { Authorization: 'Bearer dummy-token' });
    assert.strictEqual(noIss.status, 503);
    console.log('  ok: auth enabled without issuer returns 503 (Bearer present)');
  } finally {
    if (noIssuerChild) {
      noIssuerChild.kill('SIGTERM');
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  const oidc = await startOidcMock();
  const mcpPort = await reservePort();
  let child;
  try {
    process.env.MCP_HTTP_JWT_ISSUER = oidc.issuer;
    const tok = await oidc.signToken();
    child = spawn(process.execPath, [httpScript], {
      stdio: ['ignore', 'pipe', 'pipe'],
      cwd: projectRoot,
      env: {
        ...process.env,
        MCP_HTTP_PORT: String(mcpPort),
        MCP_HTTP_HOST: '127.0.0.1',
        MCP_HTTP_AUTH_ENABLED: 'true',
        MCP_HTTP_JWT_ISSUER: oidc.issuer
      }
    });
    await waitForHttpServer(mcpPort);

    const noAuth = await postMcp(mcpPort, initBody);
    assert.strictEqual(noAuth.status, 401);
    console.log('  ok: spawned server 401 without Authorization');

    const ok = await postMcp(mcpPort, initBody, { Authorization: `Bearer ${tok}` });
    assert.strictEqual(ok.status, 200);
    const j = JSON.parse(ok.data);
    assert(j.result && j.result.protocolVersion);
    console.log('  ok: spawned server accepts Bearer JWT (env issuer + local OIDC)');
  } finally {
    if (child) {
      child.kill('SIGTERM');
      await new Promise((r) => setTimeout(r, 200));
    }
    delete process.env.MCP_HTTP_JWT_ISSUER;
    await oidc.close();
  }

  console.log('\nDone.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
