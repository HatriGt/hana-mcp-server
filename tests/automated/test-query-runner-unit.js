#!/usr/bin/env node
/**
 * Unit tests for query-runner helpers (no HANA connection).
 */

const assert = require('assert');
const {
  isSingleSelectableStatement,
  shapeRows,
  trimRow
} = require('../../src/database/query-runner');

function test(name, fn) {
  try {
    fn();
    console.log('  ok:', name);
  } catch (e) {
    console.error('  FAIL:', name, e.message);
    process.exit(1);
  }
}

console.log('query-runner unit tests\n');

test('isSingleSelectableStatement true for SELECT', () => {
  assert.strictEqual(isSingleSelectableStatement('SELECT 1 FROM DUMMY'), true);
});

test('isSingleSelectableStatement true for WITH', () => {
  assert.strictEqual(isSingleSelectableStatement('WITH x AS (SELECT 1 FROM DUMMY) SELECT * FROM x'), true);
});

test('isSingleSelectableStatement false for multi-statement', () => {
  assert.strictEqual(isSingleSelectableStatement('SELECT 1 FROM DUMMY; SELECT 2 FROM DUMMY'), false);
});

test('isSingleSelectableStatement false for INSERT', () => {
  assert.strictEqual(isSingleSelectableStatement('INSERT INTO T VALUES (1)'), false);
});

test('trimRow truncates long cell', () => {
  const long = 'x'.repeat(300);
  const row = { A: long };
  const out = trimRow(row, ['A'], 10);
  assert.strictEqual(out.A.length, 11);
  assert(out.A.endsWith('…'));
});

test('shapeRows truncates column count', () => {
  const rows = [{ a: 1, b: 2, c: 3 }];
  const s = shapeRows(rows, 2, 100, 10);
  assert.strictEqual(s.columns.length, 2);
  assert.strictEqual(s.columnsOmitted, 1);
});

test('shapeRows detects extra row as truncated', () => {
  const rows = [{ x: 1 }, { x: 2 }, { x: 3 }];
  const s = shapeRows(rows, 10, 100, 2);
  assert.strictEqual(s.dataRows.length, 2);
  assert.strictEqual(s.truncated, true);
});

console.log('\nDone.');
