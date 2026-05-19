#!/usr/bin/env node
/**
 * Tests for DML restrictions:
 *   - Validators.validateDmlRestrictions (unit)
 *   - Config: HANA_ALLOW_* defaults and env parsing
 *   - getQueryLimits() exposes allow* flags
 *   - getEnvironmentVars() includes allow* keys
 *   - QueryTools.executeQuery rejects blocked DML end-to-end (mocked runner)
 */

const assert = require('assert');
const path = require('path');

const root = path.join(__dirname, '..', '..');
const Validators = require(path.join(root, 'src', 'utils', 'validators'));
const { Config } = require(path.join(root, 'src', 'utils', 'config'));

function withEnv(overrides, fn) {
  const keys = Object.keys(overrides);
  const saved = {};
  for (const k of keys) {
    saved[k] = process.env[k];
    const v = overrides[k];
    if (v === undefined || v === null) delete process.env[k];
    else process.env[k] = String(v);
  }
  try {
    return fn(new Config());
  } finally {
    for (const k of keys) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  }
}

function test(name, fn) {
  try {
    fn();
    console.log('  ok:', name);
  } catch (e) {
    console.error('  FAIL:', name, '-', e.message);
    process.exit(1);
  }
}

console.log('DML restrictions tests\n');

// ── 1. validateDmlRestrictions — unit ─────────────────────────────────────

console.log('--- 1. Validators.validateDmlRestrictions ---\n');

test('INSERT blocked when allowInsert is false', () => {
  const r = Validators.validateDmlRestrictions('INSERT INTO T VALUES (1)', { allowInsert: false });
  assert.strictEqual(r.valid, false);
  assert.match(r.error, /INSERT/);
  assert.match(r.error, /HANA_ALLOW_INSERT/);
});

test('INSERT allowed when allowInsert is true', () => {
  const r = Validators.validateDmlRestrictions('INSERT INTO T VALUES (1)', { allowInsert: true });
  assert.strictEqual(r.valid, true);
});

test('UPDATE blocked when allowUpdate is false', () => {
  const r = Validators.validateDmlRestrictions('UPDATE T SET X=1', { allowUpdate: false });
  assert.strictEqual(r.valid, false);
  assert.match(r.error, /UPDATE/);
  assert.match(r.error, /HANA_ALLOW_UPDATE/);
});

test('UPDATE allowed when allowUpdate is true', () => {
  const r = Validators.validateDmlRestrictions('UPDATE T SET X=1', { allowUpdate: true });
  assert.strictEqual(r.valid, true);
});

test('DELETE blocked when allowDelete is false', () => {
  const r = Validators.validateDmlRestrictions('DELETE FROM T WHERE ID=1', { allowDelete: false });
  assert.strictEqual(r.valid, false);
  assert.match(r.error, /DELETE/);
  assert.match(r.error, /HANA_ALLOW_DELETE/);
});

test('DELETE allowed when allowDelete is true', () => {
  const r = Validators.validateDmlRestrictions('DELETE FROM T WHERE ID=1', { allowDelete: true });
  assert.strictEqual(r.valid, true);
});

test('TRUNCATE blocked by allowDelete=false', () => {
  const r = Validators.validateDmlRestrictions('TRUNCATE TABLE T', { allowDelete: false });
  assert.strictEqual(r.valid, false);
  assert.match(r.error, /DELETE\/TRUNCATE/);
});

test('TRUNCATE allowed when allowDelete is true', () => {
  const r = Validators.validateDmlRestrictions('TRUNCATE TABLE T', { allowDelete: true });
  assert.strictEqual(r.valid, true);
});

test('SELECT always valid regardless of flags', () => {
  const r = Validators.validateDmlRestrictions('SELECT * FROM T', { allowInsert: false, allowUpdate: false, allowDelete: false });
  assert.strictEqual(r.valid, true);
});

test('WITH always valid regardless of flags', () => {
  const r = Validators.validateDmlRestrictions('WITH x AS (SELECT 1) SELECT * FROM x', {});
  assert.strictEqual(r.valid, true);
});

test('case-insensitive: insert lowercase blocked', () => {
  const r = Validators.validateDmlRestrictions('insert into T values (1)', { allowInsert: false });
  assert.strictEqual(r.valid, false);
});

test('empty permissions object blocks all DML', () => {
  assert.strictEqual(Validators.validateDmlRestrictions('INSERT INTO T VALUES (1)', {}).valid, false);
  assert.strictEqual(Validators.validateDmlRestrictions('UPDATE T SET X=1', {}).valid, false);
  assert.strictEqual(Validators.validateDmlRestrictions('DELETE FROM T', {}).valid, false);
});

test('all flags true allows all DML', () => {
  const perms = { allowInsert: true, allowUpdate: true, allowDelete: true };
  assert.strictEqual(Validators.validateDmlRestrictions('INSERT INTO T VALUES (1)', perms).valid, true);
  assert.strictEqual(Validators.validateDmlRestrictions('UPDATE T SET X=1', perms).valid, true);
  assert.strictEqual(Validators.validateDmlRestrictions('DELETE FROM T', perms).valid, true);
});

// ── 2. Config: HANA_ALLOW_* defaults and parsing ──────────────────────────

console.log('\n--- 2. Config HANA_ALLOW_* env parsing ---\n');

test('allowInsert defaults to false when env not set', () => {
  withEnv({ HANA_ALLOW_INSERT: null }, (c) => {
    assert.strictEqual(c.getQueryLimits().allowInsert, false);
  });
});

test('allowUpdate defaults to false when env not set', () => {
  withEnv({ HANA_ALLOW_UPDATE: null }, (c) => {
    assert.strictEqual(c.getQueryLimits().allowUpdate, false);
  });
});

test('allowDelete defaults to false when env not set', () => {
  withEnv({ HANA_ALLOW_DELETE: null }, (c) => {
    assert.strictEqual(c.getQueryLimits().allowDelete, false);
  });
});

test('allowInsert=true when HANA_ALLOW_INSERT=true', () => {
  withEnv({ HANA_ALLOW_INSERT: 'true' }, (c) => {
    assert.strictEqual(c.getQueryLimits().allowInsert, true);
  });
});

test('allowUpdate=true when HANA_ALLOW_UPDATE=true', () => {
  withEnv({ HANA_ALLOW_UPDATE: 'true' }, (c) => {
    assert.strictEqual(c.getQueryLimits().allowUpdate, true);
  });
});

test('allowDelete=true when HANA_ALLOW_DELETE=true', () => {
  withEnv({ HANA_ALLOW_DELETE: 'true' }, (c) => {
    assert.strictEqual(c.getQueryLimits().allowDelete, true);
  });
});

test('flags are independent — only allowInsert set', () => {
  withEnv({ HANA_ALLOW_INSERT: 'true', HANA_ALLOW_UPDATE: null, HANA_ALLOW_DELETE: null }, (c) => {
    const q = c.getQueryLimits();
    assert.strictEqual(q.allowInsert, true);
    assert.strictEqual(q.allowUpdate, false);
    assert.strictEqual(q.allowDelete, false);
  });
});

test('getEnvironmentVars includes HANA_ALLOW_* keys', () => {
  withEnv({ HANA_ALLOW_INSERT: 'true', HANA_ALLOW_UPDATE: null, HANA_ALLOW_DELETE: 'true' }, (c) => {
    const e = c.getEnvironmentVars();
    assert.strictEqual(e.HANA_ALLOW_INSERT, 'true');
    assert.strictEqual(e.HANA_ALLOW_UPDATE, 'NOT SET');
    assert.strictEqual(e.HANA_ALLOW_DELETE, 'true');
  });
});

// ── 3. QueryTools end-to-end with mocked runner ───────────────────────────

console.log('\n--- 3. QueryTools DML gate (mocked runner) ---\n');

const runnerPath = require.resolve(path.join(root, 'src', 'database', 'query-runner.js'));
const qtPath = require.resolve(path.join(root, 'src', 'tools', 'query-tools.js'));
const configPath = require.resolve(path.join(root, 'src', 'utils', 'config.js'));

function clearStack() {
  delete require.cache[qtPath];
  delete require.cache[configPath];
  delete require.cache[runnerPath];
}

function fakeRunner() {
  return {
    kind: 'other',
    columns: [],
    rows: [],
    truncated: false,
    returnedRows: 1,
    maxRows: 50,
    offset: 0,
    nextOffset: null,
    totalRows: null,
    columnsOmitted: 0,
    appliedWrap: false
  };
}

(async () => {
  // Test: INSERT blocked by default (no env vars set)
  clearStack();
  require.cache[runnerPath] = { id: runnerPath, exports: { executeUserQuery: async () => fakeRunner() }, loaded: true };
  delete process.env.HANA_ALLOW_INSERT;
  delete process.env.HANA_ALLOW_UPDATE;
  delete process.env.HANA_ALLOW_DELETE;

  const QT1 = require(qtPath);
  const insertResult = await QT1.executeQuery({ query: 'INSERT INTO T VALUES (1)' });
  assert.strictEqual(insertResult.isError, true, 'INSERT should be blocked by default');
  assert.match(insertResult.content[0].text, /HANA_ALLOW_INSERT/);
  console.log('  ok: INSERT blocked by default (no HANA_ALLOW_INSERT set)');

  // Test: UPDATE blocked by default
  clearStack();
  require.cache[runnerPath] = { id: runnerPath, exports: { executeUserQuery: async () => fakeRunner() }, loaded: true };
  delete process.env.HANA_ALLOW_INSERT;
  delete process.env.HANA_ALLOW_UPDATE;
  delete process.env.HANA_ALLOW_DELETE;

  const QT2 = require(qtPath);
  const updateResult = await QT2.executeQuery({ query: 'UPDATE T SET X=1' });
  assert.strictEqual(updateResult.isError, true, 'UPDATE should be blocked by default');
  assert.match(updateResult.content[0].text, /HANA_ALLOW_UPDATE/);
  console.log('  ok: UPDATE blocked by default (no HANA_ALLOW_UPDATE set)');

  // Test: DELETE blocked by default
  clearStack();
  require.cache[runnerPath] = { id: runnerPath, exports: { executeUserQuery: async () => fakeRunner() }, loaded: true };
  delete process.env.HANA_ALLOW_DELETE;

  const QT3 = require(qtPath);
  const deleteResult = await QT3.executeQuery({ query: 'DELETE FROM T WHERE ID=1' });
  assert.strictEqual(deleteResult.isError, true, 'DELETE should be blocked by default');
  assert.match(deleteResult.content[0].text, /HANA_ALLOW_DELETE/);
  console.log('  ok: DELETE blocked by default (no HANA_ALLOW_DELETE set)');

  // Test: SELECT passes through regardless
  clearStack();
  require.cache[runnerPath] = { id: runnerPath, exports: { executeUserQuery: async () => ({
    kind: 'select',
    columns: ['X'],
    rows: [{ X: 1 }],
    truncated: false,
    returnedRows: 1,
    maxRows: 50,
    offset: 0,
    nextOffset: null,
    totalRows: null,
    columnsOmitted: 0,
    appliedWrap: false
  }) }, loaded: true };
  delete process.env.HANA_ALLOW_INSERT;
  delete process.env.HANA_ALLOW_UPDATE;
  delete process.env.HANA_ALLOW_DELETE;

  const QT4 = require(qtPath);
  const selectResult = await QT4.executeQuery({ query: 'SELECT 1 FROM DUMMY' });
  assert.strictEqual(selectResult.isError, undefined, 'SELECT should never be blocked');
  assert.strictEqual(selectResult.structuredContent.kind, 'select');
  console.log('  ok: SELECT always passes DML gate');

  // Test: INSERT allowed when HANA_ALLOW_INSERT=true
  clearStack();
  require.cache[runnerPath] = { id: runnerPath, exports: { executeUserQuery: async () => fakeRunner() }, loaded: true };
  process.env.HANA_ALLOW_INSERT = 'true';

  const QT5 = require(qtPath);
  const insertAllowed = await QT5.executeQuery({ query: 'INSERT INTO T VALUES (1)' });
  assert.strictEqual(insertAllowed.isError, undefined, 'INSERT should be allowed when HANA_ALLOW_INSERT=true');
  delete process.env.HANA_ALLOW_INSERT;
  console.log('  ok: INSERT allowed when HANA_ALLOW_INSERT=true');

  clearStack();

  console.log('\nDone.');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
