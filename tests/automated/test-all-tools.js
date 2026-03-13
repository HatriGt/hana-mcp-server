#!/usr/bin/env node
/**
 * Run every MCP tool and print each result.
 * Uses process.env for HANA_* (set env or use dummy defaults).
 * Usage: HANA_HOST=... HANA_PASSWORD=... ... node tests/automated/test-all-tools.js
 */

const path = require('path');
const { spawn } = require('child_process');

const serverScript = path.join(__dirname, '..', '..', 'hana-mcp-server.js');
const projectRoot = path.join(__dirname, '..', '..');

const serverEnv = {
  ...process.env,
  HANA_HOST: process.env.HANA_HOST || 'your-hana-host.com',
  HANA_PORT: process.env.HANA_PORT || '443',
  HANA_USER: process.env.HANA_USER || 'your-username',
  HANA_PASSWORD: process.env.HANA_PASSWORD || 'your-password',
  HANA_SCHEMA: process.env.HANA_SCHEMA || 'your-schema',
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
let nextId = 1;

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

function send(method, params) {
  const id = nextId++;
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

function getToolResult(res) {
  const content = res.result?.content;
  if (!content || !Array.isArray(content)) return res.result ? JSON.stringify(res.result).slice(0, 400) : 'no content';
  const text = content.map((c) => (c.type === 'text' ? c.text : '')).join('');
  return text.slice(0, 1200);
}

async function run() {
  console.log('HANA MCP Server – test all tools\n');
  await send('initialize', {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'test-all-tools', version: '1.0.0' }
  });
  console.log('Initialize: OK\n');

  const tools = [
    { name: 'hana_show_config', args: {}, desc: 'Show config' },
    { name: 'hana_test_connection', args: {}, desc: 'Test connection' },
    { name: 'hana_show_env_vars', args: {}, desc: 'Show env vars (masked)' },
    { name: 'hana_list_schemas', args: {}, desc: 'List schemas' },
    { name: 'hana_list_tables', args: { schema_name: 'SAPABAP1' }, desc: 'List tables in SAPABAP1' },
    { name: 'hana_describe_table', args: { schema_name: 'SAPABAP1', table_name: 'DFKKOP' }, desc: 'Describe SAPABAP1.DFKKOP' },
    { name: 'hana_list_indexes', args: { schema_name: 'SAPABAP1', table_name: 'DFKKOP' }, desc: 'List indexes on DFKKOP' },
    { name: 'hana_execute_query', args: { query: 'SELECT COUNT(*) AS cnt FROM SAPABAP1.DFKKOP' }, desc: 'Execute query (count DFKKOP)' }
  ];

  let firstIndexName = null;
  for (const { name, args, desc } of tools) {
    try {
      const res = await send('tools/call', { name, arguments: args });
      const out = getToolResult(res);
      const isError = res.result?.isError === true;
      console.log('---', name, '---');
      console.log(desc);
      console.log('Result:', isError ? '(tool reported error)' : 'OK');
      console.log(out);
      console.log('');
      if (name === 'hana_list_indexes' && out && !out.includes('error') && out.length > 10) {
        const match = out.match(/(?:INDEX_NAME|index[_\s]name)[:\s]*([A-Za-z0-9_]+)/i);
        if (match) firstIndexName = match[1];
      }
    } catch (e) {
      console.log('---', name, '---');
      console.log(desc);
      console.log('Error:', e.message);
      console.log('');
    }
  }

  if (firstIndexName) {
    try {
      const res = await send('tools/call', {
        name: 'hana_describe_index',
        arguments: { schema_name: 'SAPABAP1', table_name: 'DFKKOP', index_name: firstIndexName }
      });
      console.log('--- hana_describe_index ---');
      console.log('Describe index', firstIndexName, 'on SAPABAP1.DFKKOP');
      console.log('Result:', res.result?.isError ? '(error)' : 'OK');
      console.log(getToolResult(res));
      console.log('');
    } catch (e) {
      console.log('--- hana_describe_index ---');
      console.log('Error:', e.message);
      console.log('');
    }
  } else {
    console.log('--- hana_describe_index ---');
    console.log('Skipped (no index name from list_indexes)');
    console.log('');
  }

  server.stdin.end();
  server.kill();
  console.log('Done.');
}

run().catch((err) => {
  console.error(err);
  server.kill();
  process.exit(1);
});
