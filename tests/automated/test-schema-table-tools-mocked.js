#!/usr/bin/env node
/**
 * SchemaTools / TableTools list cap: client limit clamped by HANA_LIST_DEFAULT_LIMIT.
 */

const path = require('path');
const assert = require('assert');

const root = path.join(__dirname, '..', '..');
const executorPath = require.resolve(path.join(root, 'src', 'database', 'query-executor.js'));
const configPath = require.resolve(path.join(root, 'src', 'utils', 'config.js'));
const schemaToolsPath = require.resolve(path.join(root, 'src', 'tools', 'schema-tools.js'));
const tableToolsPath = require.resolve(path.join(root, 'src', 'tools', 'table-tools.js'));

let schemasCall;
let tablesCall;

function mockExecutor() {
  return {
    async getSchemasPage(prefix, limit, offset) {
      schemasCall = { prefix, limit, offset };
      return { names: ['S1'], total: 500 };
    },
    async getTablesPage(schema, prefix, limit, offset, catalogDatabase) {
      tablesCall = { schema, prefix, limit, offset, catalogDatabase };
      return { names: ['T1'], total: 500 };
    }
  };
}

async function withMockedExecutor(env, fn) {
  const saved = {};
  for (const k of Object.keys(env)) {
    saved[k] = process.env[k];
    process.env[k] = String(env[k]);
  }
  try {
    delete require.cache[executorPath];
    delete require.cache[configPath];
    delete require.cache[schemaToolsPath];
    delete require.cache[tableToolsPath];
    require.cache[executorPath] = {
      id: executorPath,
      exports: mockExecutor(),
      loaded: true
    };
    const SchemaTools = require(schemaToolsPath);
    const TableTools = require(tableToolsPath);
    await fn(SchemaTools, TableTools);
  } finally {
    for (const k of Object.keys(env)) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
    delete require.cache[executorPath];
    delete require.cache[configPath];
    delete require.cache[schemaToolsPath];
    delete require.cache[tableToolsPath];
  }
}

console.log('schema/table tools mocked tests\n');

(async () => {
  await withMockedExecutor(
    {
      HANA_LIST_DEFAULT_LIMIT: '10',
      HANA_SCHEMA: 'SAPABAP1',
      HANA_HOST: 'h',
      HANA_USER: 'u',
      HANA_PASSWORD: 'p'
    },
    async (SchemaTools, TableTools) => {
      schemasCall = null;
      await SchemaTools.listSchemas({ limit: 999, offset: 2, prefix: 'SYS' });
      assert.strictEqual(schemasCall.limit, 10);
      assert.strictEqual(schemasCall.offset, 2);
      assert.strictEqual(schemasCall.prefix, 'SYS');

      tablesCall = null;
      await TableTools.listTables({ limit: 50, offset: 0, prefix: 'Z' });
      assert.strictEqual(tablesCall.limit, 10);
      assert.strictEqual(tablesCall.schema, 'SAPABAP1');
      assert.strictEqual(tablesCall.prefix, 'Z');
    }
  );
  console.log('  ok: list limit clamped to HANA_LIST_DEFAULT_LIMIT');

  console.log('\nDone.');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
