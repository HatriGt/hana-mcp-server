#!/usr/bin/env node
/**
 * formatQueryToolResult / formatNameListToolResult shape (no DB).
 */

const assert = require('assert');
const Formatters = require('../../src/utils/formatters');

console.log('formatters query tests\n');

const baseRun = {
  kind: 'select',
  columns: ['A'],
  rows: [{ A: 1 }],
  truncated: false,
  returnedRows: 1,
  maxRows: 50,
  offset: 0,
  nextOffset: null,
  totalRows: null,
  columnsOmitted: 0,
  appliedWrap: true
};

const r1 = Formatters.formatQueryToolResult(baseRun, 'SELECT 1', undefined);
assert.strictEqual(r1.structuredContent.kind, 'select');
assert.strictEqual(r1.structuredContent.appliedWrap, true);
assert.strictEqual(r1.structuredContent.snapshotId, undefined);
console.log('  ok: formatQueryToolResult without snapshot');

const r2 = Formatters.formatQueryToolResult(
  { ...baseRun, truncated: true, nextOffset: 50 },
  'SELECT * FROM T',
  'snap-uuid-1'
);
assert.strictEqual(r2.structuredContent.truncated, true);
assert.strictEqual(r2.structuredContent.snapshotId, 'snap-uuid-1');
assert.strictEqual(r2.structuredContent.nextOffset, 50);
console.log('  ok: formatQueryToolResult with snapshotId');

const r3 = Formatters.formatQueryToolResult(
  { ...baseRun, totalRows: 1234 },
  'SELECT * FROM T',
  undefined
);
assert.strictEqual(r3.structuredContent.totalRows, 1234);
assert(r3.content[0].text.includes('totalRows=1234'));
console.log('  ok: formatQueryToolResult with totalRows');

const list = Formatters.formatNameListToolResult('Schemas', ['A', 'B'], 100, 2, true, 2);
assert.deepStrictEqual(list.structuredContent.items, ['A', 'B']);
assert.strictEqual(list.structuredContent.totalAvailable, 100);
assert.strictEqual(list.structuredContent.truncated, true);
assert.strictEqual(list.structuredContent.nextOffset, 2);
console.log('  ok: formatNameListToolResult');

console.log('\nDone.');
