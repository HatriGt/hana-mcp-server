#!/usr/bin/env node
/**
 * HANA_PASSWORD and JWT-shaped substrings are stripped from outbound strings.
 */
const assert = require('assert');

process.env.HANA_PASSWORD = 'S3cret!P@ss-word';
const { redactSecrets } = require('../../src/utils/sensitive-redact');

const withPwd = 'HANA connection failed: S3cret!P@ss-word invalid';
const outPwd = redactSecrets(withPwd);
assert(!outPwd.includes('S3cret'), 'password substring must not remain');
assert(outPwd.includes('[REDACTED]'), 'password replaced with marker');

const jwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIn0.sig-here';
const withBearer = `Auth failed Bearer ${jwt} end`;
const outJwt = redactSecrets(withBearer);
assert(!outJwt.includes('eyJhbGci'), 'JWT must not remain');
assert(outJwt.includes('[REDACTED]'), 'JWT replaced');

delete process.env.HANA_PASSWORD;
assert.strictEqual(redactSecrets('no secrets'), 'no secrets', 'noop when no password env');

console.log('ok: test-sensitive-redact');
