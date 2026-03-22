#!/usr/bin/env node
/**
 * hana:/// URI parse/build (no database).
 */

const assert = require('assert');
const { parseHanaUri, buildUri, URI_PREFIX } = require('../../src/server/resources');

console.log('resources URI tests\n');

assert.strictEqual(parseHanaUri(''), null);
assert.strictEqual(parseHanaUri('http://x'), null);
assert.deepStrictEqual(parseHanaUri(`${URI_PREFIX}schemas`), { type: 'schemas' });
assert.deepStrictEqual(parseHanaUri(`${URI_PREFIX}schemas/SYS`), { type: 'schema', schemaName: 'SYS' });
assert.deepStrictEqual(parseHanaUri(`${URI_PREFIX}schemas/SAPABAP1/tables/DFKKOP`), {
  type: 'table',
  schemaName: 'SAPABAP1',
  tableName: 'DFKKOP'
});
assert.strictEqual(parseHanaUri(`${URI_PREFIX}schemas/SYS/extra`), null);
console.log('  ok: parseHanaUri');

assert.strictEqual(buildUri('schemas'), `${URI_PREFIX}schemas`);
assert.strictEqual(buildUri('schema', 'A B'), `${URI_PREFIX}schemas/A%20B`);
assert.strictEqual(buildUri('table', 'S', 'T'), `${URI_PREFIX}schemas/S/tables/T`);
console.log('  ok: buildUri');

console.log('\nDone.');
