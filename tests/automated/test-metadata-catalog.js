#!/usr/bin/env node
/**
 * MDC metadata catalog: validateCatalogDatabaseName, _sysCatalogRef, getMetadataCatalogDatabase.
 */

const assert = require('assert');
const path = require('path');

const root = path.join(__dirname, '..', '..');
const validatorsPath = path.join(root, 'src', 'utils', 'validators.js');
const executorPath = path.join(root, 'src', 'database', 'query-executor.js');
const configPath = path.join(root, 'src', 'utils', 'config.js');

const QueryExecutor = require(executorPath);
const Validators = require(validatorsPath);

function withEnv(env, fn) {
  const saved = {};
  for (const k of Object.keys(env)) {
    saved[k] = process.env[k];
    process.env[k] = env[k];
  }
  try {
    delete require.cache[require.resolve(configPath)];
    const { config } = require(configPath);
    fn(config);
  } finally {
    for (const k of Object.keys(env)) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
    delete require.cache[require.resolve(configPath)];
  }
}

console.log('metadata catalog tests\n');

assert.strictEqual(Validators.validateCatalogDatabaseName('').valid, false);
assert.strictEqual(Validators.validateCatalogDatabaseName('HSP').valid, true);
assert.strictEqual(Validators.validateCatalogDatabaseName('a.b').valid, false);
assert.strictEqual(Validators.validateCatalogDatabaseName('9bad').valid, false);
console.log('  ok: validateCatalogDatabaseName');

assert.strictEqual(QueryExecutor._sysCatalogRef(null), 'SYS');
assert.strictEqual(QueryExecutor._sysCatalogRef(undefined), 'SYS');
assert.strictEqual(QueryExecutor._sysCatalogRef(''), 'SYS');
assert.strictEqual(QueryExecutor._sysCatalogRef('   '), 'SYS');
assert.strictEqual(QueryExecutor._sysCatalogRef('HSP'), '"HSP".SYS');
console.log('  ok: QueryExecutor._sysCatalogRef');

withEnv({}, (c) => {
  assert.strictEqual(c.getMetadataCatalogDatabase(), null);
});
withEnv({ HANA_METADATA_CATALOG_DATABASE: 'HSP' }, (c) => {
  assert.strictEqual(c.getMetadataCatalogDatabase(), 'HSP');
});
withEnv({ HANA_METADATA_CATALOG_DATABASE: '  HSQ  ' }, (c) => {
  assert.strictEqual(c.getMetadataCatalogDatabase(), 'HSQ');
});
console.log('  ok: getMetadataCatalogDatabase');

console.log('\nDone.');
