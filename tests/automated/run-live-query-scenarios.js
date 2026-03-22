#!/usr/bin/env node
/**
 * Live HANA: run several hana_execute_query scenarios against a table from env (no hard-coded ref).
 *
 * Requires: same HANA_* as MCP (host, user, password, tenant, etc.)
 * Required env: HANA_LIVE_TABLE_REF — SQL FROM fragment, e.g. HSP.SAPABAP1.DFKKOP
 *
 * Each scenario spawns a fresh server so HANA_MAX_RESULT_* env is picked up per process.
 *
 * Usage:
 *   export HANA_HOST=... HANA_USER=... HANA_PASSWORD=... HANA_DATABASE_NAME=HQP
 *   export HANA_LIVE_TABLE_REF=HSP.SAPABAP1.DFKKOP
 *   node tests/automated/run-live-query-scenarios.js
 */
const path = require('path');
const { spawn } = require('child_process');

const ref = process.env.HANA_LIVE_TABLE_REF?.trim();
if (!ref) {
  console.error('Set HANA_LIVE_TABLE_REF to your SQL FROM fragment (e.g. HSP.SAPABAP1.DFKKOP).');
  process.exit(1);
}

const serverScript = path.join(__dirname, '..', '..', 'hana-mcp-server.js');
const projectRoot = path.join(__dirname, '..', '..');
const TIMEOUT_MS = Math.min(
  Math.max(parseInt(process.env.HANA_RUN_QUERY_TIMEOUT_MS, 10) || 120000, 5000),
  600000
);

function baseServerEnv(overrides = {}) {
  return {
    ...process.env,
    HANA_HOST: process.env.HANA_HOST || 'your-hana-host.com',
    HANA_PORT: process.env.HANA_PORT || '443',
    HANA_USER: process.env.HANA_USER || 'your-username',
    HANA_PASSWORD: process.env.HANA_PASSWORD || 'your-password',
    HANA_SCHEMA: process.env.HANA_SCHEMA || 'SAPABAP1',
    HANA_SSL: process.env.HANA_SSL ?? 'false',
    HANA_ENCRYPT: process.env.HANA_ENCRYPT ?? 'false',
    HANA_VALIDATE_CERT: process.env.HANA_VALIDATE_CERT ?? 'false',
    HANA_CONNECTION_TYPE: process.env.HANA_CONNECTION_TYPE || 'auto',
    HANA_INSTANCE_NUMBER: process.env.HANA_INSTANCE_NUMBER || '',
    HANA_DATABASE_NAME: process.env.HANA_DATABASE_NAME || '',
    LOG_LEVEL: process.env.LOG_LEVEL || 'warn',
    ENABLE_CONSOLE_LOGGING: process.env.ENABLE_CONSOLE_LOGGING ?? 'false',
    ENABLE_FILE_LOGGING: process.env.ENABLE_FILE_LOGGING ?? 'false',
    ...overrides
  };
}

function runScenario(label, serverEnv, toolArgs) {
  return new Promise((resolve, reject) => {
    const server = spawn(process.execPath, [serverScript], {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: projectRoot,
      env: serverEnv
    });

    const pending = new Map();
    let buf = '';

    server.stdout.on('data', (data) => {
      buf += data.toString();
      let idx;
      while ((idx = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, idx).trim();
        buf = buf.slice(idx + 1);
        if (!line) continue;
        try {
          const response = JSON.parse(line);
          if (response.id !== undefined && pending.has(response.id)) {
            pending.get(response.id)(response);
            pending.delete(response.id);
          }
        } catch (_) {
          /* ignore non-JSON */
        }
      }
    });

    function send(id, method, params) {
      return new Promise((res, rej) => {
        const t = setTimeout(() => {
          if (pending.has(id)) {
            pending.delete(id);
            rej(new Error('Timeout'));
          }
        }, TIMEOUT_MS);
        pending.set(id, (response) => {
          clearTimeout(t);
          if (response.error) rej(new Error(response.error.message || JSON.stringify(response.error)));
          else res(response);
        });
        server.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
      });
    }

    (async () => {
      try {
        await send(1, 'initialize', {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: { name: 'run-live-query-scenarios', version: '1.0.0' }
        });
        const res = await send(2, 'tools/call', {
          name: 'hana_execute_query',
          arguments: toolArgs
        });
        server.stdin.end();
        server.kill();
        resolve({ label, res });
      } catch (e) {
        try {
          server.stdin.end();
          server.kill();
        } catch (_) {}
        reject(e);
      }
    })();
  });
}

function summarize(sc) {
  if (!sc || typeof sc !== 'object') return '(no structuredContent)';
  const parts = [
    `kind=${sc.kind}`,
    `returnedRows=${sc.returnedRows}`,
    `maxRows=${sc.maxRows}`,
    `offset=${sc.offset}`,
    `truncated=${sc.truncated}`,
    `nextOffset=${sc.nextOffset}`,
    `columns=${Array.isArray(sc.columns) ? sc.columns.length : 0}`,
    `columnsOmitted=${sc.columnsOmitted ?? 0}`,
    `totalRows=${sc.totalRows ?? 'null'}`,
    `appliedWrap=${sc.appliedWrap}`
  ];
  return parts.join(' | ');
}

async function main() {
  const qAll = `SELECT * FROM ${ref}`;
  const qOneCol = `SELECT * FROM ${ref}`;

  const scenarios = [
    {
      label: '1) Default page size (no tool maxRows; server uses HANA_MAX_RESULT_ROWS or 50)',
      env: {},
      args: { query: qAll }
    },
    {
      label: '2) HANA_MAX_RESULT_ROWS=3 (env caps every SELECT page)',
      env: { HANA_MAX_RESULT_ROWS: '3' },
      args: { query: qAll }
    },
    {
      label: '3) Tool maxRows=2 under HANA_MAX_RESULT_ROWS=50',
      env: { HANA_MAX_RESULT_ROWS: '50' },
      args: { query: qAll, maxRows: 2 }
    },
    {
      label: '4) Tool maxRows=100 clamped by HANA_MAX_RESULT_ROWS=5',
      env: { HANA_MAX_RESULT_ROWS: '5' },
      args: { query: qAll, maxRows: 100 }
    },
    {
      label: '5) maxRows=1 + includeTotal (COUNT over same subquery)',
      env: { HANA_MAX_RESULT_ROWS: '50' },
      args: { query: qAll, maxRows: 1, includeTotal: true }
    },
    {
      label: '6) HANA_MAX_RESULT_COLS=5 (extra columns omitted from output)',
      env: { HANA_MAX_RESULT_ROWS: '1', HANA_MAX_RESULT_COLS: '5' },
      args: { query: qOneCol }
    }
  ];

  console.log(`Table ref (FROM): ${ref}\n`);

  for (const s of scenarios) {
    const argSummary = { ...s.args };
    if (argSummary.query) argSummary.query = `SELECT * FROM <HANA_LIVE_TABLE_REF>`;
    process.stdout.write(`${s.label}\n  env: ${JSON.stringify(s.env)}\n  args: ${JSON.stringify(argSummary)}\n`);
    try {
      const { res } = await runScenario(s.label, baseServerEnv(s.env), s.args);
      const sc = res.result?.structuredContent;
      const err = res.result?.isError;
      if (err) {
        const text = res.result?.content?.[0]?.text || JSON.stringify(res.result);
        console.log(`  ERROR: ${text.slice(0, 500)}${text.length > 500 ? '…' : ''}\n`);
        continue;
      }
      console.log(`  ${summarize(sc)}\n`);
      if (sc?.rows?.length && s.label.startsWith('6)')) {
        console.log(`  sample row keys: ${Object.keys(sc.rows[0] || {}).join(', ')}\n`);
      }
    } catch (e) {
      console.log(`  FAILED: ${e.message}\n`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
