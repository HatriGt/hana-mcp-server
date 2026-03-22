#!/usr/bin/env node
/**
 * MCP_HTTP_ALLOWED_ORIGINS parsing (via http-origin helper used by http-index).
 */

const assert = require('assert');
const { parseAllowedOrigins, isOriginAllowed } = require('../../src/server/http-origin');

console.log('HTTP origin env tests\n');

assert.deepStrictEqual(parseAllowedOrigins(undefined), ['null']);
assert.deepStrictEqual(parseAllowedOrigins(''), ['null']);
assert.deepStrictEqual(parseAllowedOrigins('https://a.com, https://b.com'), [
  'https://a.com',
  'https://b.com'
]);
assert.deepStrictEqual(parseAllowedOrigins('*'), ['*']);
console.log('  ok: parseAllowedOrigins defaults and trimming');

assert.strictEqual(isOriginAllowed(undefined, undefined), true);
assert.strictEqual(isOriginAllowed('', undefined), true);
assert.strictEqual(isOriginAllowed('https://evil', undefined), false);
assert.strictEqual(isOriginAllowed('https://evil', 'https://evil'), true);
assert.strictEqual(isOriginAllowed('https://evil', '*'), true);
assert.strictEqual(isOriginAllowed('https://ok', 'https://a.com,https://ok'), true);
console.log('  ok: isOriginAllowed');

console.log('\nDone.');
