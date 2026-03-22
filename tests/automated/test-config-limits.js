#!/usr/bin/env node
/**
 * Config class: env parsing and hard clamps for all limit-related variables.
 */

const assert = require('assert');
const { Config } = require('../../src/utils/config');

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
    fn(new Config());
  } finally {
    for (const k of keys) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  }
}

console.log('config limits tests\n');

withEnv(
  {
    HANA_MAX_RESULT_ROWS: '2000',
    HANA_MAX_RESULT_COLS: '100',
    HANA_MAX_CELL_CHARS: '500',
    HANA_QUERY_DEFAULT_OFFSET: '3',
    HANA_LIST_DEFAULT_LIMIT: '400',
    HANA_RESOURCE_LIST_MAX_ITEMS: '1200',
    HANA_SEMANTICS_TTL_MS: '300000',
    HANA_QUERY_SNAPSHOT_TTL_MS: '600000'
  },
  (c) => {
    const q = c.getQueryLimits();
    assert.strictEqual(q.maxResultRows, 2000);
    assert.strictEqual(q.maxResultCols, 100);
    assert.strictEqual(q.maxCellChars, 500);
    assert.strictEqual(q.defaultOffset, 3);
    assert.strictEqual(q.listDefaultLimit, 400);
    assert.strictEqual(q.resourceListMaxItems, 1200);
    assert.strictEqual(q.semanticsTtlMs, 300000);
    assert.strictEqual(q.querySnapshotTtlMs, 600000);
  }
);
console.log('  ok: typical env values parsed');

withEnv({ HANA_MAX_RESULT_ROWS: '-5' }, (c) => {
  assert.strictEqual(c.getQueryLimits().maxResultRows, 1);
});
withEnv({ HANA_MAX_RESULT_ROWS: '999999' }, (c) => {
  assert.strictEqual(c.getQueryLimits().maxResultRows, 10000);
});
console.log('  ok: HANA_MAX_RESULT_ROWS clamped 1..10000');

withEnv({ HANA_MAX_RESULT_COLS: '-5' }, (c) => {
  assert.strictEqual(c.getQueryLimits().maxResultCols, 1);
});
withEnv({ HANA_MAX_RESULT_COLS: '9999' }, (c) => {
  assert.strictEqual(c.getQueryLimits().maxResultCols, 500);
});
console.log('  ok: HANA_MAX_RESULT_COLS clamped 1..500');

withEnv({ HANA_MAX_CELL_CHARS: 'abc' }, (c) => {
  assert.strictEqual(c.getQueryLimits().maxCellChars, 200);
});
withEnv({ HANA_MAX_CELL_CHARS: '20000' }, (c) => {
  assert.strictEqual(c.getQueryLimits().maxCellChars, 10000);
});
console.log('  ok: HANA_MAX_CELL_CHARS clamped 1..10000');

withEnv({ HANA_QUERY_DEFAULT_OFFSET: '-10' }, (c) => {
  assert.strictEqual(c.getQueryLimits().defaultOffset, 0);
});
console.log('  ok: HANA_QUERY_DEFAULT_OFFSET floored at 0');

withEnv({ HANA_LIST_DEFAULT_LIMIT: '1' }, (c) => {
  assert.strictEqual(c.getQueryLimits().listDefaultLimit, 1);
});
withEnv({ HANA_LIST_DEFAULT_LIMIT: '99999' }, (c) => {
  assert.strictEqual(c.getQueryLimits().listDefaultLimit, 5000);
});
console.log('  ok: HANA_LIST_DEFAULT_LIMIT clamped 1..5000');

withEnv({ HANA_RESOURCE_LIST_MAX_ITEMS: '50' }, (c) => {
  assert.strictEqual(c.getQueryLimits().resourceListMaxItems, 50);
});
withEnv({ HANA_RESOURCE_LIST_MAX_ITEMS: '999999' }, (c) => {
  assert.strictEqual(c.getQueryLimits().resourceListMaxItems, 10000);
});
console.log('  ok: HANA_RESOURCE_LIST_MAX_ITEMS clamped 1..10000');

withEnv({ HANA_SEMANTICS_TTL_MS: '0' }, (c) => {
  assert.strictEqual(c.getQueryLimits().semanticsTtlMs, 0);
});
withEnv({ HANA_SEMANTICS_TTL_MS: '999999999' }, (c) => {
  assert.strictEqual(c.getQueryLimits().semanticsTtlMs, 86400000);
});
console.log('  ok: HANA_SEMANTICS_TTL_MS clamped 0..86400000');

withEnv({ HANA_QUERY_SNAPSHOT_TTL_MS: '1' }, (c) => {
  assert.strictEqual(c.getQueryLimits().querySnapshotTtlMs, 10000);
});
withEnv({ HANA_QUERY_SNAPSHOT_TTL_MS: '999999999' }, (c) => {
  assert.strictEqual(c.getQueryLimits().querySnapshotTtlMs, 3600000);
});
console.log('  ok: HANA_QUERY_SNAPSHOT_TTL_MS clamped 10000..3600000');

withEnv(
  {
    HANA_CONNECTION_TYPE: 'auto',
    HANA_INSTANCE_NUMBER: '10',
    HANA_DATABASE_NAME: 'HQQ'
  },
  (c) => {
    assert.strictEqual(c.getHanaDatabaseType(), 'mdc_tenant');
  }
);
withEnv(
  {
    HANA_CONNECTION_TYPE: 'auto',
    HANA_INSTANCE_NUMBER: '10',
    HANA_DATABASE_NAME: undefined
  },
  (c) => {
    assert.strictEqual(c.getHanaDatabaseType(), 'mdc_system');
  }
);
withEnv(
  {
    HANA_CONNECTION_TYPE: 'auto',
    HANA_INSTANCE_NUMBER: undefined,
    HANA_DATABASE_NAME: undefined
  },
  (c) => {
    assert.strictEqual(c.getHanaDatabaseType(), 'single_container');
  }
);
console.log('  ok: auto MDC / single-container inference');

console.log('\nDone.');
