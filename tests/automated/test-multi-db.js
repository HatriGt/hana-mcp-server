#!/usr/bin/env node
/**
 * Tests for multi-database mode (HANA_DATABASES):
 *   - profile parsing, defaults and boot-time validation errors
 *   - request-scoped profile (AsyncLocalStorage) incl. concurrent isolation
 *   - per-profile write permissions and limit overrides
 *   - required `database` parameter in tool schemas + validation
 *   - hana_list_databases / env display never leak passwords
 *   - snapshots bound to their database
 *   - single-database (legacy) mode unchanged
 */

const assert = require('assert');
const path = require('path');

const root = path.join(__dirname, '..', '..');
const { Config } = require(path.join(root, 'src', 'utils', 'config'));
const { runWithProfile } = require(path.join(root, 'src', 'database', 'db-context'));

const PROFILES = {
  qa: {
    host: 'qa.example', port: 30015, user: 'U_QA', password: 'pw-qa-secret',
    databaseName: 'HSQ', schema: 'SAPABAP1', connectionType: 'mdc_tenant', instanceNumber: '10',
    permissions: { insert: true, update: true }
  },
  prod: {
    host: 'prod.example', user: 'U_PROD', password: 'pw-prod-secret',
    databaseName: 'HQP', limits: { maxResultRows: 10, queryTimeoutMs: 5000 }
  }
};

function withEnv(overrides, fn) {
  const saved = {};
  for (const [k, v] of Object.entries(overrides)) {
    saved[k] = process.env[k];
    if (v === undefined || v === null) delete process.env[k];
    else process.env[k] = String(v);
  }
  try {
    return fn();
  } finally {
    for (const k of Object.keys(overrides)) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  }
}

const multiEnv = { HANA_DATABASES: JSON.stringify(PROFILES), HANA_MAX_RESULT_ROWS: '50' };

let failed = 0;
async function test(name, fn) {
  try {
    await fn();
    console.log('  ok:', name);
  } catch (e) {
    failed++;
    console.error('  FAIL:', name, '\n   ', e.message);
  }
}

async function main() {
  console.log('multi-database tests\n');

  // --- Config / profiles ---------------------------------------------------

  await test('parses profiles and applies field defaults', () => withEnv(multiEnv, () => {
    const c = new Config();
    assert.strictEqual(c.isMultiDb(), true);
    assert.deepStrictEqual(c.getProfileKeys(), ['qa', 'prod']);
    const prod = c.profiles.get('prod');
    assert.strictEqual(prod.hana.port, 443);
    assert.strictEqual(prod.hana.encrypt, true);
    assert.strictEqual(prod.hana.connectionType, 'auto');
  }));

  await test('invalid JSON fails fast with a clear error', () => withEnv({ HANA_DATABASES: '{nope' }, () => {
    assert.throws(() => new Config(), /HANA_DATABASES is not valid JSON/);
  }));

  await test('profile missing credentials fails fast naming the profile', () => withEnv({
    HANA_DATABASES: JSON.stringify({ broken: { host: 'h', user: 'u' } })
  }, () => {
    assert.throws(() => new Config(), /HANA_DATABASES\["broken"\] is missing: password/);
  }));

  await test('invalid profile key is rejected', () => withEnv({
    HANA_DATABASES: JSON.stringify({ 'bad key!': { host: 'h', user: 'u', password: 'p' } })
  }, () => {
    assert.throws(() => new Config(), /key "bad key!" is invalid/);
  }));

  await test('no active profile outside a request: unconfigured, writes denied', () => withEnv(multiEnv, () => {
    const c = new Config();
    assert.strictEqual(c.getActiveProfileKey(), null);
    assert.strictEqual(c.isHanaConfigured(), false);
    const l = c.getQueryLimits();
    assert.strictEqual(l.allowInsert, false);
    assert.strictEqual(l.allowUpdate, false);
    assert.strictEqual(l.allowDelete, false);
  }));

  await test('active profile drives connection params and permissions', () => withEnv(multiEnv, () => {
    const c = new Config();
    runWithProfile('qa', () => {
      assert.strictEqual(c.getActiveProfileKey(), 'qa');
      assert.strictEqual(c.getConnectionParams().serverNode, 'qa.example:30015');
      assert.strictEqual(c.getConnectionParams().databaseName, 'HSQ');
      const l = c.getQueryLimits();
      assert.strictEqual(l.allowInsert, true);
      assert.strictEqual(l.allowUpdate, true);
      assert.strictEqual(l.allowDelete, false, 'omitted permission defaults to false');
    });
    runWithProfile('prod', () => {
      const l = c.getQueryLimits();
      assert.strictEqual(l.allowInsert, false);
      assert.strictEqual(l.allowUpdate, false);
      assert.strictEqual(l.allowDelete, false);
    });
  }));

  await test('per-profile limit overrides, global values otherwise', () => withEnv(multiEnv, () => {
    const c = new Config();
    runWithProfile('prod', () => {
      const l = c.getQueryLimits();
      assert.strictEqual(l.maxResultRows, 10);
      assert.strictEqual(l.queryTimeoutMs, 5000);
      assert.strictEqual(l.maxResultCols, 50, 'not overridden -> global default');
      assert.strictEqual(l.queryLimitsEnabled, true, 'a profile cap enables limits for that profile');
    });
    runWithProfile('qa', () => {
      assert.strictEqual(c.getQueryLimits().maxResultRows, 50, 'global HANA_MAX_RESULT_ROWS');
      assert.strictEqual(c.getQueryLimits().queryLimitsEnabled, false, 'global default (off)');
    });
  }));

  await test('concurrent requests keep their own profile', () => withEnv(multiEnv, async () => {
    const c = new Config();
    const tick = () => new Promise((r) => setTimeout(r, 5));
    const seen = await Promise.all([
      runWithProfile('qa', async () => { await tick(); return c.getHanaConfig().host; }),
      runWithProfile('prod', async () => { await tick(); return c.getHanaConfig().host; }),
      runWithProfile('qa', async () => { await tick(); await tick(); return c.getHanaConfig().host; })
    ]);
    assert.deepStrictEqual(seen, ['qa.example', 'prod.example', 'qa.example']);
  }));

  await test('summaries and env display never contain passwords', () => withEnv(multiEnv, () => {
    const c = new Config();
    const text = JSON.stringify(c.getProfileSummaries()) + JSON.stringify(c.getEnvironmentVars());
    assert.ok(!text.includes('pw-qa-secret') && !text.includes('pw-prod-secret'));
    assert.ok(c.getEnvironmentVars().HANA_DATABASES.startsWith('SET (2 profiles'));
    const qa = c.getProfileSummaries().find((p) => p.database === 'qa');
    assert.deepStrictEqual(qa.permissions, { read: true, insert: true, update: true, delete: false });
  }));

  await test('redactSecrets masks every profile password', () => withEnv(multiEnv, () => {
    const { redactSecrets } = require(path.join(root, 'src', 'utils', 'sensitive-redact'));
    const out = redactSecrets('login pw-qa-secret / pw-prod-secret failed');
    assert.strictEqual(out, 'login [REDACTED] / [REDACTED] failed');
  }));

  await test('single-database mode: implicit "default" profile, flat HANA_* + HANA_ALLOW_*', () => withEnv({
    HANA_DATABASES: undefined, HANA_HOST: 'flat.example', HANA_USER: 'u', HANA_PASSWORD: 'p',
    HANA_ALLOW_INSERT: 'true', HANA_ALLOW_DELETE: undefined
  }, () => {
    const c = new Config();
    assert.strictEqual(c.isMultiDb(), false);
    assert.strictEqual(c.getActiveProfileKey(), 'default');
    assert.strictEqual(c.getHanaConfig().host, 'flat.example');
    assert.strictEqual(c.getQueryLimits().allowInsert, true);
    assert.strictEqual(c.getQueryLimits().allowDelete, false);
  }));

  // --- Server wiring (singletons built with HANA_DATABASES set) --------------

  process.env.HANA_DATABASES = multiEnv.HANA_DATABASES;
  for (const k of Object.keys(require.cache)) {
    if (k.startsWith(path.join(root, 'src'))) delete require.cache[k];
  }
  const { TOOLS } = require(path.join(root, 'src', 'constants', 'tool-definitions'));
  const ToolRegistry = require(path.join(root, 'src', 'tools'));
  const MCPHandler = require(path.join(root, 'src', 'server', 'mcp-handler'));
  const snapshotStore = require(path.join(root, 'src', 'query-snapshot-store'));
  const ctx = require(path.join(root, 'src', 'database', 'db-context'));

  const call = (name, args) => MCPHandler.handleToolsCall(1, { name, arguments: args });

  await test('DB tools require `database` with an enum of profile keys', () => {
    const q = TOOLS.find((t) => t.name === 'hana_execute_query');
    assert.strictEqual(q.inputSchema.required[0], 'database');
    assert.deepStrictEqual(q.inputSchema.properties.database.enum, ['qa', 'prod']);
    for (const name of ['hana_show_env_vars', 'hana_list_databases']) {
      const t = TOOLS.find((x) => x.name === name);
      assert.ok(!t.inputSchema.properties.database, `${name} must not take database`);
    }
  });

  await test('call without database is rejected before touching HANA', async () => {
    const res = await call('hana_list_schemas', {});
    assert.ok(res.error, 'expected JSON-RPC error');
    assert.match(res.error.message, /Missing required parameters: database/);
  });

  await test('unknown database is rejected with the valid list', async () => {
    const res = await call('hana_list_schemas', { database: 'dev' });
    assert.ok(res.error);
    assert.match(res.error.message, /Unknown database "dev". Valid values: qa, prod/);
  });

  await test('hana_list_databases returns profiles without secrets', async () => {
    const res = await call('hana_list_databases', {});
    const sc = res.result.structuredContent;
    assert.strictEqual(sc.databaseParameterRequired, true);
    assert.deepStrictEqual(sc.databases.map((d) => d.database), ['qa', 'prod']);
    assert.ok(!JSON.stringify(res).includes('pw-'));
  });

  await test('hana_show_config reports the selected database', async () => {
    const res = await call('hana_show_config', { database: 'prod' });
    const text = res.result.content[0].text;
    assert.ok(text.includes('prod.example'));
    assert.ok(!text.includes('pw-prod-secret'));
  });

  await test('DML gate follows the selected profile', async () => {
    const res = await call('hana_execute_query', { database: 'prod', query: 'DELETE FROM T' });
    const text = JSON.stringify(res);
    assert.ok(/DELETE\/TRUNCATE operations are not enabled on database \\"prod\\"/.test(text), text.slice(0, 300));
    assert.ok(/HANA_DATABASES\[\\"prod\\"\]\.permissions/.test(text), 'hint names the profile, not HANA_ALLOW_*');
  });

  await test('snapshot from one database cannot be paged on another', async () => {
    const id = ctx.runWithProfile('qa', () => snapshotStore.createSnapshot({ query: 'SELECT 1 FROM DUMMY' }));
    const res = await call('hana_query_next_page', { database: 'prod', snapshot_id: id, offset: 10 });
    const text = JSON.stringify(res);
    assert.ok(/different database/.test(text) && /qa/.test(text), text.slice(0, 300));
  });

  await test('initialize instructions tell agents to pass database', () => {
    const r = MCPHandler.handleInitialize(1, {});
    const ins = r.result.instructions;
    assert.ok(ins.includes('multiple HANA databases: qa, prod'));
    assert.ok(ins.includes('REQUIRES a "database" argument'));
    assert.ok(ins.includes('Call hana_list_databases first'));
  });

  await test('tool registry includes hana_list_databases', () => {
    assert.ok(ToolRegistry.hasTool('hana_list_databases'));
  });

  console.log(failed ? `\n${failed} failed` : '\nDone.');
  process.exit(failed ? 1 : 0);
}

main();
