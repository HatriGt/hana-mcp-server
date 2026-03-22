#!/usr/bin/env node
/**
 * Snapshot store: create, get, expiry (clock override), delete.
 */

const assert = require('assert');
const snapshot = require('../../src/query-snapshot-store');

console.log('snapshot store tests\n');

snapshot._resetNowForTests();
let t = 1_000_000;
snapshot._setNowForTests(() => t);

const id = snapshot.createSnapshot({ query: 'SELECT 1', parameters: [1] });
assert.match(id, /^[0-9a-f-]{36}$/i);

const got = snapshot.getSnapshot(id);
assert.strictEqual(got.query, 'SELECT 1');
assert.deepStrictEqual(got.parameters, [1]);

snapshot.deleteSnapshot(id);
assert.strictEqual(snapshot.getSnapshot(id), null);
console.log('  ok: create, get, delete');

snapshot._resetNowForTests();
snapshot._setNowForTests(() => t);
const id2 = snapshot.createSnapshot({ query: 'Q', parameters: [] });
const { config } = require('../../src/utils/config');
const ttl = config.getQueryLimits().querySnapshotTtlMs;
t += ttl + 1;
assert.strictEqual(snapshot.getSnapshot(id2), null);
console.log('  ok: expired snapshot returns null');

snapshot._resetNowForTests();
assert.strictEqual(snapshot.getSnapshot('00000000-0000-4000-8000-000000000000'), null);
console.log('  ok: unknown id returns null');

console.log('\nDone.');
