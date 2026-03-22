#!/usr/bin/env node
/**
 * Semantics JSON from file (temp) + getTableSemantics key variants.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('assert');

const root = path.join(__dirname, '..', '..');
const loaderPath = path.join(root, 'src', 'semantics', 'loader.js');
const configPath = path.join(root, 'src', 'utils', 'config.js');

const tmpDir = path.join(os.tmpdir(), `hana-mcp-sem-test-${Date.now()}`);
const tmpFile = path.join(tmpDir, 'sem.json');

fs.mkdirSync(tmpDir, { recursive: true });
fs.writeFileSync(
  tmpFile,
  JSON.stringify({
    tables: {
      'SAPABAP1.MYTABLE': {
        description: 'T1',
        columns: {
          ST: { description: 'Status', values: { A: 'Active' } }
        }
      },
      'HSP.SAPABAP1.MYTABLE2': {
        description: 'Cross-DB key'
      }
    }
  }),
  'utf8'
);

const prevPath = process.env.HANA_SEMANTICS_PATH;
const prevUrl = process.env.HANA_SEMANTICS_URL;
process.env.HANA_SEMANTICS_PATH = tmpFile;
delete process.env.HANA_SEMANTICS_URL;

delete require.cache[configPath];
delete require.cache[loaderPath];

console.log('semantics loader tests\n');

(async () => {
  const { getTableSemantics, clearSemanticsCacheForTests } = require(loaderPath);

  const sem = await getTableSemantics('SAPABAP1', 'MYTABLE');
  assert.strictEqual(sem.description, 'T1');
  assert.strictEqual(sem.columns.ST.values.A, 'Active');

  const semUpper = await getTableSemantics('sapabap1', 'mytable');
  assert.strictEqual(semUpper.description, 'T1');

  const semDb = await getTableSemantics('SAPABAP1', 'MYTABLE2', 'HSP');
  assert.strictEqual(semDb.description, 'Cross-DB key');
  const semDbMissing = await getTableSemantics('SAPABAP1', 'MYTABLE2');
  assert.strictEqual(semDbMissing, null);
  console.log('  ok: load file + schema/table key variants + catalog_database keys');

  clearSemanticsCacheForTests();
  if (prevPath === undefined) delete process.env.HANA_SEMANTICS_PATH;
  else process.env.HANA_SEMANTICS_PATH = prevPath;
  if (prevUrl === undefined) delete process.env.HANA_SEMANTICS_URL;
  else process.env.HANA_SEMANTICS_URL = prevUrl;

  delete require.cache[configPath];
  delete require.cache[loaderPath];

  const { getTableSemantics: g2 } = require(loaderPath);
  const empty = await g2('X', 'Y');
  assert.strictEqual(empty, null);
  console.log('  ok: no PATH/URL returns null semantics');

  fs.rmSync(tmpDir, { recursive: true, force: true });

  console.log('\nDone.');
})().catch((e) => {
  console.error(e);
  if (prevPath === undefined) delete process.env.HANA_SEMANTICS_PATH;
  else process.env.HANA_SEMANTICS_PATH = prevPath;
  if (prevUrl === undefined) delete process.env.HANA_SEMANTICS_URL;
  else process.env.HANA_SEMANTICS_URL = prevUrl;
  try {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  } catch (_) {}
  process.exit(1);
});
