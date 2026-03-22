#!/usr/bin/env node
/**
 * HANA_SEMANTICS_URL: load semantics JSON over HTTP (local mock server).
 * Clears module cache so config picks up HANA_SEMANTICS_TTL_MS=0 (no URL cache).
 */

const assert = require('assert');
const http = require('http');

const semanticsPayload = {
  tables: {
    'S.T1': { title: 'One' },
    SCHEMA1: { nested: true }
  }
};

async function main() {
  console.log('semantics URL env tests\n');

  const server = http.createServer((req, res) => {
    if ((req.url || '').startsWith('/semantics.json')) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(semanticsPayload));
      return;
    }
    res.writeHead(404);
    res.end();
  });

  await new Promise((resolve, reject) => {
    server.listen(0, '127.0.0.1', () => resolve());
    server.on('error', reject);
  });
  const port = server.address().port;
  const url = `http://127.0.0.1:${port}/semantics.json`;

  const saved = {};
  const keys = ['HANA_SEMANTICS_URL', 'HANA_SEMANTICS_PATH', 'HANA_SEMANTICS_TTL_MS'];
  for (const k of keys) {
    saved[k] = process.env[k];
  }

  try {
    delete process.env.HANA_SEMANTICS_PATH;
    process.env.HANA_SEMANTICS_URL = url;
    process.env.HANA_SEMANTICS_TTL_MS = '0';

    delete require.cache[require.resolve('../../src/utils/config')];
    delete require.cache[require.resolve('../../src/semantics/loader')];

    const {
      loadSemantics,
      getTableSemantics,
      clearSemanticsCacheForTests
    } = require('../../src/semantics/loader');
    clearSemanticsCacheForTests();

    const data = await loadSemantics();
    assert.strictEqual(data.tables['S.T1'].title, 'One');

    const row = await getTableSemantics('S', 'T1');
    assert(row && row.title === 'One');
    console.log('  ok: HANA_SEMANTICS_URL fetch + getTableSemantics');
  } finally {
    for (const k of keys) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
    delete require.cache[require.resolve('../../src/utils/config')];
    delete require.cache[require.resolve('../../src/semantics/loader')];
    await new Promise((r) => server.close(() => r()));
  }

  console.log('\nDone.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
