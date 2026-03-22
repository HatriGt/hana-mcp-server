#!/usr/bin/env node
/**
 * QueryTools.executeQuery + queryNextPage with mocked query-runner (snapshot + error paths).
 */

const path = require('path');
const assert = require('assert');

const root = path.join(__dirname, '..', '..');
const runnerPath = require.resolve(path.join(root, 'src', 'database', 'query-runner.js'));
const qtPath = require.resolve(path.join(root, 'src', 'tools', 'query-tools.js'));
const snapPath = require.resolve(path.join(root, 'src', 'query-snapshot-store.js'));

function clearQtStack() {
  delete require.cache[qtPath];
  delete require.cache[runnerPath];
}

async function withMockRunner(mockFn, fn) {
  clearQtStack();
  require.cache[runnerPath] = {
    id: runnerPath,
    exports: { executeUserQuery: mockFn },
    loaded: true
  };
  const QueryTools = require(qtPath);
  await fn(QueryTools);
}

console.log('query tools mocked tests\n');

(async () => {
  const snapshot = require(snapPath);
  snapshot._resetNowForTests();

  await withMockRunner(
    async () => ({
      kind: 'select',
      columns: ['A'],
      rows: [{ A: 1 }],
      truncated: true,
      returnedRows: 1,
      maxRows: 2,
      offset: 0,
      nextOffset: 1,
      totalRows: null,
      columnsOmitted: 0,
      appliedWrap: true
    }),
    async (QueryTools) => {
      const res = await QueryTools.executeQuery({ query: 'SELECT 1 FROM DUMMY' });
      assert.strictEqual(res.structuredContent.truncated, true);
      assert.strictEqual(typeof res.structuredContent.snapshotId, 'string');
      assert.match(res.structuredContent.snapshotId, /^[0-9a-f-]{36}$/i);
    }
  );
  console.log('  ok: executeQuery emits snapshotId when truncated SELECT');

  let pageCalls = 0;
  await withMockRunner(
    async () => {
      pageCalls++;
      if (pageCalls === 1) {
        return {
          kind: 'select',
          columns: ['A'],
          rows: [{ A: 1 }],
          truncated: true,
          returnedRows: 1,
          maxRows: 2,
          offset: 0,
          nextOffset: 1,
          totalRows: null,
          columnsOmitted: 0,
          appliedWrap: true
        };
      }
      return {
        kind: 'select',
        columns: ['A'],
        rows: [{ A: 2 }],
        truncated: false,
        returnedRows: 1,
        maxRows: 2,
        offset: 1,
        nextOffset: null,
        totalRows: null,
        columnsOmitted: 0,
        appliedWrap: true
      };
    },
    async (QueryTools) => {
      pageCalls = 0;
      const first = await QueryTools.executeQuery({ query: 'SELECT A FROM T' });
      const sid = first.structuredContent.snapshotId;
      assert(sid);
      const second = await QueryTools.queryNextPage({ snapshot_id: sid, offset: 1 });
      assert.strictEqual(second.structuredContent.rows[0].A, 2);
      assert.strictEqual(second.structuredContent.truncated, false);
    }
  );
  console.log('  ok: queryNextPage uses snapshot and runs executeUserQuery');

  clearQtStack();
  const QueryTools = require(qtPath);
  const bad = await QueryTools.queryNextPage({
    snapshot_id: '00000000-0000-4000-8000-000000000001',
    offset: 0
  });
  assert.strictEqual(bad.isError, true);
  console.log('  ok: queryNextPage invalid snapshot isError');

  console.log('\nDone.');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
