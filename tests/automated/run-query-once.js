#!/usr/bin/env node
/**
 * One-off: run a single SQL query via the MCP server and print the result.
 * Usage: HANA_HOST=... HANA_PASSWORD=... HANA_DATABASE_NAME=HSQ node tests/automated/run-query-once.js
 * Query is read from first argument or default below.
 */
const path = require('path');
const { spawn } = require('child_process');

const serverScript = path.join(__dirname, '..', '..', 'hana-mcp-server.js');
const projectRoot = path.join(__dirname, '..', '..');
const query = process.argv[2] || `SELECT COUNT(*) AS cnt, YYATYPE FROM SAPABAP1.dfkkop WHERE yyELSCLAIMNUM != '' GROUP BY YYATYPE`;

const serverEnv = {
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
  ENABLE_FILE_LOGGING: process.env.ENABLE_FILE_LOGGING ?? 'false'
};

const server = spawn(process.execPath, [serverScript], {
  stdio: ['pipe', 'pipe', 'pipe'],
  cwd: projectRoot,
  env: serverEnv
});

const pending = new Map();

server.stdout.on('data', (data) => {
  const line = data.toString().trim();
  if (!line) return;
  try {
    const response = JSON.parse(line);
    if (response.id !== undefined && pending.has(response.id)) {
      pending.get(response.id)(response);
      pending.delete(response.id);
    }
  } catch (_) {}
});

server.stderr.on('data', () => {});

function send(id, method, params) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => {
      if (pending.has(id)) {
        pending.delete(id);
        reject(new Error('Timeout'));
      }
    }, 15000);
    pending.set(id, (response) => {
      clearTimeout(t);
      if (response.error) reject(new Error(response.error.message || JSON.stringify(response.error)));
      else resolve(response);
    });
    server.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
  });
}

async function main() {
  await send(1, 'initialize', {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'run-query-once', version: '1.0.0' }
  });
  const res = await send(2, 'tools/call', {
    name: 'hana_execute_query',
    arguments: { query }
  });
  server.stdin.end();
  server.kill();

  const content = res.result?.content;
  if (!content || !Array.isArray(content)) {
    console.log(JSON.stringify(res, null, 2));
    return;
  }
  for (const c of content) {
    if (c.type === 'text') {
      console.log(c.text);
    }
  }
}

main().catch((err) => {
  console.error(err.message || err);
  server.kill();
  process.exit(1);
});
