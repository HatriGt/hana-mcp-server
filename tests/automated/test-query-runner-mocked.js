#!/usr/bin/env node
/**
 * executeUserQuery with mocked QueryExecutor — SELECT wrap, params, includeTotal, non-SELECT.
 */

const path = require('path');
const assert = require('assert');

const root = path.join(__dirname, '..', '..');
const executorPath = require.resolve(path.join(root, 'src', 'database', 'query-executor.js'));
const runnerPath = require.resolve(path.join(root, 'src', 'database', 'query-runner.js'));
const configPath = require.resolve(path.join(root, 'src', 'utils', 'config.js'));

function clearModuleCache() {
  delete require.cache[executorPath];
  delete require.cache[runnerPath];
  delete require.cache[configPath];
}

function loadRunnerWithMock(mock) {
  clearModuleCache();
  require.cache[executorPath] = { id: executorPath, exports: mock, loaded: true };
  return require(runnerPath);
}

async function withRunnerEnv(envPairs, mock, fn) {
  const saved = {};
  for (const k of Object.keys(envPairs)) {
    saved[k] = process.env[k];
    process.env[k] = String(envPairs[k]);
  }
  try {
    const { executeUserQuery } = loadRunnerWithMock(mock);
    await fn(executeUserQuery);
  } finally {
    for (const k of Object.keys(envPairs)) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
    clearModuleCache();
    delete require.cache[executorPath];
  }
}

console.log('query-runner mocked tests\n');

let lastQuery;
let lastParams;
let lastScalarSql;
let lastScalarParams;

const mockExec = {
  async executeQuery(sql, params) {
    lastQuery = sql;
    lastParams = params;
    return [
      { A: 1, B: 2, C: 3 },
      { A: 4, B: 5, C: 6 },
      { A: 7, B: 8, C: 9 }
    ];
  },
  async executeScalarQuery(sql, params) {
    lastScalarSql = sql;
    lastScalarParams = params;
    return 42;
  }
};

(async () => {
  await withRunnerEnv(
    {
      HANA_MAX_RESULT_ROWS: '2',
      HANA_MAX_RESULT_COLS: '2',
      HANA_MAX_CELL_CHARS: '100',
      HANA_QUERY_DEFAULT_OFFSET: '0'
    },
    mockExec,
    async (executeUserQuery) => {
      lastQuery = lastParams = lastScalarSql = lastScalarParams = null;
      const out = await executeUserQuery('SELECT * FROM T', [], { maxRows: 2 });
      assert.match(lastQuery, /SELECT \* FROM \(SELECT \* FROM T\) AS "_HANA_MCP_SUB" LIMIT \? OFFSET \?/);
      assert.deepStrictEqual(lastParams, [3, 0]);
      assert.strictEqual(out.kind, 'select');
      assert.strictEqual(out.returnedRows, 2);
      assert.strictEqual(out.truncated, true);
      assert.strictEqual(out.nextOffset, 2);
      assert.strictEqual(out.appliedWrap, true);
      assert.strictEqual(out.columns.length, 2);
      assert.strictEqual(out.columnsOmitted, 1);
      assert.strictEqual(out.totalRows, null);
    }
  );
  console.log('  ok: SELECT wrapped LIMIT/OFFSET + column cap + truncation');

  await withRunnerEnv(
    { HANA_MAX_RESULT_ROWS: '50', HANA_MAX_RESULT_COLS: '50', HANA_MAX_CELL_CHARS: '200' },
    mockExec,
    async (executeUserQuery) => {
      lastQuery = lastParams = lastScalarSql = lastScalarParams = null;
      const out = await executeUserQuery('SELECT * FROM T', [], { includeTotal: true });
      assert(lastScalarSql.includes('COUNT(*)'));
      assert(lastScalarSql.includes('FROM (SELECT * FROM T)'));
      assert.strictEqual(out.totalRows, 42);
    }
  );
  console.log('  ok: includeTotal runs COUNT subquery');

  const mockInsert = {
    async executeQuery(sql, params) {
      lastQuery = sql;
      lastParams = params;
      return [{ X: 1 }];
    },
    async executeScalarQuery() {
      return 0;
    }
  };

  await withRunnerEnv(
    { HANA_MAX_RESULT_ROWS: '5', HANA_MAX_RESULT_COLS: '10', HANA_MAX_CELL_CHARS: '200' },
    mockInsert,
    async (executeUserQuery) => {
      lastQuery = null;
      const out = await executeUserQuery('CALL P()', [], {});
      assert.strictEqual(out.kind, 'other');
      assert.strictEqual(out.appliedWrap, false);
      assert(!lastQuery.includes('_HANA_MCP_SUB'));
    }
  );
  console.log('  ok: non-SELECT not wrapped');

  console.log('\nDone.');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
