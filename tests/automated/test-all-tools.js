#!/usr/bin/env node
/**
 * Live HANA integration: exercise MCP tools and resources against a real database.
 *
 * Pinning (no hard-coded names in repo — all via env):
 *   HANA_LIVE_TABLE_REF — SQL FROM fragment (e.g. three-part name). Used in execute_query tests.
 *   HANA_LIVE_TOOL_SCHEMA / HANA_LIVE_TOOL_TABLE — optional; MCP tools (describe, indexes, resources)
 *     use these. If unset, last two segments of TABLE_REF are used.
 *   If describe_table fails but the ref is queryable, a SELECT probe still pins liveSqlFrom.
 *   HANA_LIVE_SAMPLE_SCHEMA + HANA_LIVE_SAMPLE_TABLE — two-part pin when you do not use TABLE_REF.
 *   If none verify, falls back to list_tables discovery.
 *
 * Optional:
 *   HANA_LIVE_DISTINCT_COLUMN — if set (e.g. YYATYPE), runs SELECT DISTINCT col FROM <ref>
 *   HANA_LIVE_TRY_REAL_TABLE  — if "1", run live-table SQL on discovered work table when no pin
 *
 * Env:
 *   HANA_*                    — connection (see README)
 *   HANA_LIVE_STRICT          — if "1", exit non-zero when any required scenario fails
 *
 * Usage:
 *   npm run test:live
 *   HANA_HOST=... HANA_PASSWORD=... node tests/automated/test-all-tools.js
 */

const path = require('path');
const { spawn } = require('child_process');

const serverScript = path.join(__dirname, '..', '..', 'hana-mcp-server.js');
const projectRoot = path.join(__dirname, '..', '..');

const schemaFromEnv = process.env.HANA_SCHEMA || '';
const LIVE_STRICT = process.env.HANA_LIVE_STRICT === '1';
const REQUEST_TIMEOUT_MS = Math.min(
  Math.max(parseInt(process.env.HANA_LIVE_TIMEOUT_MS, 10) || 60000, 5000),
  300000
);

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
        reject(new Error(`Timeout after ${REQUEST_TIMEOUT_MS}ms: ${method}`));
      }
    }, REQUEST_TIMEOUT_MS);
    pending.set(id, (response) => {
      clearTimeout(t);
      if (response.error) {
        reject(new Error(response.error.message || JSON.stringify(response.error)));
      } else {
        resolve(response);
      }
    });
    server.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
  });
}

function getStructured(res) {
  return res.result?.structuredContent;
}

function getText(res) {
  const content = res.result?.content;
  if (!content || !Array.isArray(content)) return '';
  return content.map((c) => (c.type === 'text' ? c.text : '')).join('');
}

function isToolError(res) {
  return res.result?.isError === true;
}

function firstIndexNameFromListText(text) {
  const m = text.match(/^-\s+([A-Za-z0-9_]+)\s+\(/m);
  return m ? m[1] : null;
}

/**
 * HANA_LIVE_TABLE_REF → SQL FROM fragment + schema/table for MCP tools (last two dot segments).
 * @returns {{ sqlFrom: string, schema: string, table: string } | null}
 */
function parseLiveTableRef(raw) {
  const s = String(raw ?? '').trim();
  if (!s) return null;
  if (!/^[\w.]+$/i.test(s)) return null;
  const parts = s.split('.').filter(Boolean);
  if (parts.length < 2) return null;
  return {
    sqlFrom: s,
    schema: parts[parts.length - 2],
    table: parts[parts.length - 1]
  };
}

function logSection(title) {
  console.log(`\n=== ${title} ===`);
}

function logCase(name, ok, detail = '') {
  const mark = ok ? 'OK' : 'FAIL';
  console.log(`  [${mark}] ${name}${detail ? ` — ${detail}` : ''}`);
}

async function callTool(name, args) {
  return send('tools/call', { name, arguments: args || {} });
}

async function run() {
  const failures = [];

  function requireOk(name, condition, detail) {
    if (!condition) {
      failures.push({ name, detail: detail || 'assertion failed' });
      logCase(name, false, detail || '');
      return false;
    }
    logCase(name, true);
    return true;
  }

  console.log('HANA MCP Server — live integration (all tools + resources)\n');
  console.log(`Timeout: ${REQUEST_TIMEOUT_MS}ms  strict: ${LIVE_STRICT}\n`);

  await send('initialize', {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'test-all-tools', version: '2.0.0' }
  });
  logSection('initialize');
  logCase('initialize', true);

  logSection('hana_show_config');
  try {
    const res = await callTool('hana_show_config', {});
    requireOk('hana_show_config', !isToolError(res) && getText(res).length > 0);
  } catch (e) {
    failures.push({ name: 'hana_show_config', detail: e.message });
    logCase('hana_show_config', false, e.message);
  }

  logSection('hana_test_connection');
  try {
    const res = await callTool('hana_test_connection', {});
    if (isToolError(res)) {
      console.error('\nLive test requires a working HANA connection. Check HANA_HOST, HANA_USER, HANA_PASSWORD, HANA_DATABASE_NAME (MDC), etc.\n');
      console.error(getText(res).slice(0, 800));
      server.stdin.end();
      server.kill();
      process.exit(1);
    }
    requireOk('hana_test_connection', true);
  } catch (e) {
    console.error(e.message);
    server.stdin.end();
    server.kill();
    process.exit(1);
  }

  logSection('hana_show_env_vars');
  try {
    const res = await callTool('hana_show_env_vars', {});
    const t = getText(res);
    requireOk('hana_show_env_vars', !isToolError(res) && t.includes('HANA_HOST'));
  } catch (e) {
    failures.push({ name: 'hana_show_env_vars', detail: e.message });
    logCase('hana_show_env_vars', false, e.message);
  }

  let schemas = [];
  logSection('hana_list_schemas (full page)');
  try {
    const res = await callTool('hana_list_schemas', { limit: 200, offset: 0 });
    const sc = getStructured(res);
    schemas = sc?.items || [];
    requireOk('hana_list_schemas', Array.isArray(schemas) && schemas.length > 0, `got ${schemas.length} schemas`);
  } catch (e) {
    failures.push({ name: 'hana_list_schemas', detail: e.message });
    logCase('hana_list_schemas', false, e.message);
  }

  if (schemas.length > 0) {
    logSection('hana_list_schemas (prefix filter)');
    try {
      const sample = schemas.find((s) => s && s.length > 0) || schemas[0];
      const prefix = sample[0];
      const res = await callTool('hana_list_schemas', { prefix, limit: 50, offset: 0 });
      const sc = getStructured(res);
      const items = sc?.items || [];
      const ok = items.every((s) => !s || s.startsWith(prefix));
      requireOk('hana_list_schemas prefix', ok && items.length > 0, `prefix=${prefix}`);
    } catch (e) {
      failures.push({ name: 'hana_list_schemas prefix', detail: e.message });
      logCase('hana_list_schemas prefix', false, e.message);
    }
  }

  /** Pick schema order: env default, SYS / SYSTEM, then any schema from list (may be paged) */
  const preferredOrder = [
    schemaFromEnv,
    'SYS',
    'SYSTEM',
    ...schemas.filter((s) => s && s !== schemaFromEnv && s !== 'SYS' && s !== 'SYSTEM')
  ];
  const uniqueSchemas = [...new Set(preferredOrder.filter(Boolean))];

  let workSchema = null;
  let workTable = null;
  let liveSqlFrom = null;

  async function tryListTables(sch, extra = {}) {
    const res = await callTool('hana_list_tables', {
      schema_name: sch,
      limit: 40,
      offset: 0,
      ...extra
    });
    const sc = getStructured(res);
    return sc?.items || [];
  }

  /** Prefer tables the DB user can typically SELECT (avoid many SYS internals). */
  function pickQueryableTable(names) {
    if (!names || !names.length) return null;
    const bad = (t) =>
      /^\$|^\/|^_SYS|^SYS_/i.test(t) ||
      /ABSTRACT|INTERNAL/i.test(t) ||
      /^BIMC/i.test(t);
    return names.find((t) => t && !bad(t)) || null;
  }

  const liveSampleSch = process.env.HANA_LIVE_SAMPLE_SCHEMA;
  const liveSampleTbl = process.env.HANA_LIVE_SAMPLE_TABLE;
  const explicitSample =
    liveSampleSch != null &&
    String(liveSampleSch).trim().length > 0 &&
    liveSampleTbl != null &&
    String(liveSampleTbl).trim().length > 0;

  let usedPreferredSample = false;
  /** True when HANA_LIVE_TABLE_REF was accepted via execute_query probe but hana_describe_table failed. */
  let liveMetadataSkippable = false;

  logSection('Discover table (HANA_LIVE_TABLE_REF / HANA_LIVE_SAMPLE_* / fallback)');
  const refParsed = parseLiveTableRef(process.env.HANA_LIVE_TABLE_REF);
  if (refParsed) {
    const toolSch = process.env.HANA_LIVE_TOOL_SCHEMA?.trim() || refParsed.schema;
    const toolTbl = process.env.HANA_LIVE_TOOL_TABLE?.trim() || refParsed.table;
    let describeOkRef = false;
    try {
      const res = await callTool('hana_describe_table', {
        schema_name: toolSch,
        table_name: toolTbl
      });
      describeOkRef = !isToolError(res) && getText(res).length > 10;
    } catch (_) {
      describeOkRef = false;
    }
    let refOk = describeOkRef;
    if (!refOk) {
      try {
        const probe = await callTool('hana_execute_query', {
          query: `SELECT 1 AS _live_probe FROM ${refParsed.sqlFrom} WHERE 1 = 0`
        });
        refOk = !isToolError(probe);
      } catch (_) {
        refOk = false;
      }
    }
    if (refOk) {
      workSchema = toolSch;
      workTable = toolTbl;
      liveSqlFrom = refParsed.sqlFrom;
      usedPreferredSample = true;
      liveMetadataSkippable = !describeOkRef;
      logCase(
        'HANA_LIVE_TABLE_REF',
        true,
        liveSqlFrom + (liveMetadataSkippable ? ' (SQL probe; metadata tools skipped)' : '')
      );
    }
  }

  if (!workTable && explicitSample) {
    const sch = String(liveSampleSch).trim();
    const tbl = String(liveSampleTbl).trim();
    try {
      const res = await callTool('hana_describe_table', {
        schema_name: sch,
        table_name: tbl
      });
      if (!isToolError(res) && getText(res).length > 10) {
        workSchema = sch;
        workTable = tbl;
        liveSqlFrom = null;
        usedPreferredSample = true;
        logCase('HANA_LIVE_SAMPLE_*', true, `${workSchema}.${workTable}`);
      }
    } catch (_) {
      /* fall through to discovery */
    }
  }

  if (!workTable) {
    async function trySchema(sch, opts = {}) {
      try {
        const items = await tryListTables(sch, opts);
        const t = pickQueryableTable(items);
        if (!t) return null;
        return { sch, tbl: t };
      } catch (_) {
        return null;
      }
    }

    // 1) Default schema from env with a large page (S/4 tenant usually has many SAPABAP1 tables)
    const defSch = serverEnv.HANA_SCHEMA;
    if (defSch && defSch !== 'your-schema') {
      let hit = await trySchema(defSch, { limit: 200, offset: 0 });
      if (hit) {
        workSchema = hit.sch;
        workTable = hit.tbl;
      }
    }

    // 2) Other schemas (not SYS/SYSTEM) from catalog
    if (!workTable) {
      const userSchemas = uniqueSchemas.filter((s) => s && s !== 'SYS' && s !== 'SYSTEM');
      for (const sch of userSchemas) {
        if (defSch && sch === defSch) continue;
        const hit = await trySchema(sch, { limit: 100, offset: 0 });
        if (hit) {
          workSchema = hit.sch;
          workTable = hit.tbl;
          break;
        }
      }
    }

    // 3) SYS / SYSTEM last (metadata OK; SELECT often denied)
    if (!workTable) {
      for (const sch of ['SYS', 'SYSTEM']) {
        const hit = await trySchema(sch, { limit: 80, offset: 0 });
        if (hit) {
          workSchema = hit.sch;
          workTable = hit.tbl;
          break;
        }
      }
    }

    if (!workTable) {
      for (const sch of ['SYS', 'SYSTEM']) {
        try {
          const items = await tryListTables(sch, { prefix: 'M_', limit: 30, offset: 0 });
          const t = pickQueryableTable(items);
          if (t) {
            workSchema = sch;
            workTable = t;
            break;
          }
        } catch (_) {}
      }
    }
  }

  if (!workTable) {
    console.error('\nCould not find any table via list_tables. Is the user allowed to see metadata?\n');
    failures.push({ name: 'discover table', detail: 'no table found' });
  } else if (!usedPreferredSample) {
    logCase('discovered', true, `${workSchema}.${workTable}`);
  }

  if (workSchema && workTable) {
    logSection('hana_list_tables (prefix)');
    try {
      const prefix = workTable[0] || 'A';
      const res = await callTool('hana_list_tables', {
        schema_name: workSchema,
        prefix,
        limit: 25,
        offset: 0
      });
      const sc = getStructured(res);
      const items = sc?.items || [];
      requireOk(
        'hana_list_tables prefix',
        items.length > 0 && items.every((t) => t.startsWith(prefix)),
        `prefix=${prefix}`
      );
    } catch (e) {
      failures.push({ name: 'hana_list_tables prefix', detail: e.message });
      logCase('hana_list_tables prefix', false, e.message);
    }

    if (liveMetadataSkippable) {
      console.log(
        '\n=== hana_describe_table / explain / indexes ===\n  skipped — HANA_LIVE_TABLE_REF accepted via SQL probe; set HANA_LIVE_TOOL_SCHEMA/TABLE if describe should apply'
      );
    } else {
      logSection('hana_describe_table');
      try {
        const res1 = await callTool('hana_describe_table', {
          schema_name: workSchema,
          table_name: workTable
        });
        requireOk('hana_describe_table (with schema)', !isToolError(res1) && getText(res1).length > 5);
      } catch (e) {
        failures.push({ name: 'hana_describe_table', detail: e.message });
        logCase('hana_describe_table (with schema)', false, e.message);
      }

      if (
        serverEnv.HANA_SCHEMA &&
        serverEnv.HANA_SCHEMA !== 'your-schema' &&
        workSchema === serverEnv.HANA_SCHEMA
      ) {
        try {
          const res2 = await callTool('hana_describe_table', { table_name: workTable });
          requireOk(
            'hana_describe_table (default schema)',
            !isToolError(res2),
            'schema_name omitted; HANA_SCHEMA matches work schema'
          );
        } catch (e) {
          failures.push({ name: 'hana_describe_table default schema', detail: e.message });
          logCase('hana_describe_table (default schema)', false, e.message);
        }
      }

      logSection('hana_explain_table');
      try {
        const res = await callTool('hana_explain_table', {
          schema_name: workSchema,
          table_name: workTable
        });
        const sc = getStructured(res);
        requireOk(
          'hana_explain_table',
          !isToolError(res) && sc && Array.isArray(sc.columns),
          `${sc?.columns?.length || 0} columns`
        );
      } catch (e) {
        failures.push({ name: 'hana_explain_table', detail: e.message });
        logCase('hana_explain_table', false, e.message);
      }

      logSection('hana_list_indexes');
      let indexName = null;
      try {
        const res = await callTool('hana_list_indexes', {
          schema_name: workSchema,
          table_name: workTable
        });
        const text = getText(res);
        indexName = firstIndexNameFromListText(text);
        requireOk('hana_list_indexes', !isToolError(res), indexName ? `sample index ${indexName}` : 'no indexes (ok)');
      } catch (e) {
        failures.push({ name: 'hana_list_indexes', detail: e.message });
        logCase('hana_list_indexes', false, e.message);
      }

      if (indexName) {
        logSection('hana_describe_index');
        try {
          const res = await callTool('hana_describe_index', {
            schema_name: workSchema,
            table_name: workTable,
            index_name: indexName
          });
          requireOk('hana_describe_index', !isToolError(res) && getText(res).includes(indexName));
        } catch (e) {
          failures.push({ name: 'hana_describe_index', detail: e.message });
          logCase('hana_describe_index', false, e.message);
        }
      } else {
        console.log('\n=== hana_describe_index ===\n  (skipped — no index parsed from list)');
      }
    }
  }

  logSection('hana_execute_query (DUMMY)');
  try {
    const res = await callTool('hana_execute_query', { query: 'SELECT 1 AS X FROM DUMMY' });
    const sc = getStructured(res);
    requireOk('hana_execute_query DUMMY', !isToolError(res) && sc?.kind === 'select', `rows=${sc?.returnedRows}`);
  } catch (e) {
    failures.push({ name: 'hana_execute_query DUMMY', detail: e.message });
    logCase('hana_execute_query DUMMY', false, e.message);
  }

  logSection('hana_execute_query (WITH subquery)');
  try {
    const res = await callTool('hana_execute_query', {
      query: 'WITH t AS (SELECT 1 AS c FROM DUMMY) SELECT c FROM t'
    });
    const sc = getStructured(res);
    requireOk('hana_execute_query WITH', !isToolError(res) && sc?.kind === 'select');
  } catch (e) {
    failures.push({ name: 'hana_execute_query WITH', detail: e.message });
    logCase('hana_execute_query WITH', false, e.message);
  }

  logSection('hana_execute_query (includeTotal)');
  try {
    const res = await callTool('hana_execute_query', {
      query: 'SELECT 1 AS X FROM DUMMY',
      includeTotal: true
    });
    const sc = getStructured(res);
    requireOk(
      'hana_execute_query includeTotal',
      !isToolError(res) && sc && typeof sc.totalRows === 'number',
      `totalRows=${sc?.totalRows}`
    );
  } catch (e) {
    failures.push({ name: 'hana_execute_query includeTotal', detail: e.message });
    logCase('hana_execute_query includeTotal', false, e.message);
  }

  /* Portable multi-row SELECT (no user-table SELECT privilege required). */
  const multiRowDummySql =
    'SELECT 1 AS x FROM DUMMY UNION ALL SELECT 2 AS x FROM DUMMY UNION ALL SELECT 3 AS x FROM DUMMY';

  logSection('hana_execute_query (COUNT via DUMMY UNION)');
  try {
    const res = await callTool('hana_execute_query', {
      query: `SELECT COUNT(*) AS cnt FROM (${multiRowDummySql}) AS _live_t`
    });
    requireOk('hana_execute_query COUNT', !isToolError(res), getText(res).slice(0, 120));
  } catch (e) {
    failures.push({ name: 'hana_execute_query COUNT', detail: e.message });
    logCase('hana_execute_query COUNT', false, e.message);
  }

  logSection('hana_execute_query (maxRows + optional hana_query_next_page)');
  try {
    const res = await callTool('hana_execute_query', {
      query: multiRowDummySql,
      maxRows: 1
    });
    const sc = getStructured(res);
    const truncated = sc?.truncated === true;
    requireOk(
      'hana_execute_query maxRows=1',
      !isToolError(res) && sc?.returnedRows >= 1,
      `truncated=${truncated}`
    );
    if (truncated && sc.snapshotId && sc.nextOffset != null) {
      const res2 = await callTool('hana_query_next_page', {
        snapshot_id: sc.snapshotId,
        offset: sc.nextOffset
      });
      const sc2 = getStructured(res2);
      requireOk(
        'hana_query_next_page',
        !isToolError(res2) && sc2?.kind === 'select',
        `returnedRows=${sc2?.returnedRows}`
      );
    } else {
      logCase('hana_query_next_page', true, 'skipped (result not truncated or no snapshot)');
    }
  } catch (e) {
    failures.push({ name: 'hana_execute_query paging', detail: e.message });
    logCase('hana_execute_query paging', false, e.message);
  }

  logSection('hana_execute_query (offset + maxRows)');
  try {
    const res = await callTool('hana_execute_query', {
      query: multiRowDummySql,
      maxRows: 2,
      offset: 1
    });
    const sc = getStructured(res);
    requireOk(
      'hana_execute_query offset',
      !isToolError(res) && sc && sc.offset === 1 && sc.returnedRows <= 2,
      `returned=${sc?.returnedRows}`
    );
  } catch (e) {
    failures.push({ name: 'hana_execute_query offset', detail: e.message });
    logCase('hana_execute_query offset', false, e.message);
  }

  const tryLiveTableSql =
    workSchema &&
    workTable &&
    (usedPreferredSample || process.env.HANA_LIVE_TRY_REAL_TABLE === '1');

  if (tryLiveTableSql) {
    const fromSql = liveSqlFrom || `"${workSchema}"."${workTable}"`;
    logSection('hana_execute_query (live table: COUNT + wide SELECT + paging)');
    try {
      const q = `SELECT COUNT(*) AS cnt FROM ${fromSql}`;
      const res = await callTool('hana_execute_query', { query: q });
      requireOk('hana_execute_query live COUNT', !isToolError(res), getText(res).slice(0, 100));
    } catch (e) {
      failures.push({ name: 'hana_execute_query live COUNT', detail: e.message });
      logCase('hana_execute_query live COUNT', false, e.message);
    }
    try {
      const res = await callTool('hana_execute_query', {
        query: `SELECT * FROM ${fromSql}`,
        maxRows: 1
      });
      const sc = getStructured(res);
      const truncated = sc?.truncated === true;
      requireOk(
        'hana_execute_query live maxRows=1',
        !isToolError(res) && sc?.returnedRows >= 1,
        `truncated=${truncated}`
      );
      if (truncated && sc.snapshotId && sc.nextOffset != null) {
        const res2 = await callTool('hana_query_next_page', {
          snapshot_id: sc.snapshotId,
          offset: sc.nextOffset
        });
        const sc2 = getStructured(res2);
        requireOk(
          'hana_query_next_page (live table)',
          !isToolError(res2) && sc2?.kind === 'select',
          `returnedRows=${sc2?.returnedRows}`
        );
      } else {
        logCase('hana_query_next_page (live table)', true, 'skipped (not truncated)');
      }
    } catch (e) {
      failures.push({ name: 'hana_execute_query live paging', detail: e.message });
      logCase('hana_execute_query live paging', false, e.message);
    }
    try {
      const res = await callTool('hana_execute_query', {
        query: `SELECT * FROM ${fromSql}`,
        maxRows: 2,
        offset: 1
      });
      const sc = getStructured(res);
      requireOk(
        'hana_execute_query live offset',
        !isToolError(res) && sc && sc.offset === 1 && sc.returnedRows <= 2,
        `returned=${sc?.returnedRows}`
      );
    } catch (e) {
      failures.push({ name: 'hana_execute_query live offset', detail: e.message });
      logCase('hana_execute_query live offset', false, e.message);
    }

    const distCol = process.env.HANA_LIVE_DISTINCT_COLUMN?.trim();
    if (distCol && /^[A-Za-z0-9_]+$/.test(distCol)) {
      logSection('hana_execute_query (HANA_LIVE_DISTINCT_COLUMN)');
      try {
        const res = await callTool('hana_execute_query', {
          query: `SELECT DISTINCT ${distCol} FROM ${fromSql}`
        });
        requireOk(
          'hana_execute_query DISTINCT',
          !isToolError(res) && getStructured(res)?.kind === 'select',
          `column=${distCol}`
        );
      } catch (e) {
        failures.push({ name: 'hana_execute_query DISTINCT', detail: e.message });
        logCase('hana_execute_query DISTINCT', false, e.message);
      }
    }
  }

  logSection('hana_query_next_page (invalid snapshot)');
  try {
    const res = await callTool('hana_query_next_page', {
      snapshot_id: '00000000-0000-4000-8000-000000000099',
      offset: 0
    });
    requireOk('hana_query_next_page invalid', isToolError(res), 'expected isError');
  } catch (e) {
    failures.push({ name: 'hana_query_next_page invalid', detail: e.message });
    logCase('hana_query_next_page invalid', false, e.message);
  }

  logSection('resources/list (+ optional cursor)');
  try {
    const res = await send('resources/list', {});
    const resources = res.result?.resources;
    const ok = Array.isArray(resources) && resources.length > 0;
    requireOk('resources/list', ok, `${resources?.length || 0} resources`);
    const cursor = res.result?.nextCursor;
    if (cursor) {
      const res2 = await send('resources/list', { cursor });
      requireOk(
        'resources/list cursor',
        Array.isArray(res2.result?.resources),
        `page2=${res2.result?.resources?.length}`
      );
    }
  } catch (e) {
    failures.push({ name: 'resources/list', detail: e.message });
    logCase('resources/list', false, e.message);
  }

  logSection('resources/templates/list');
  try {
    const res = await send('resources/templates/list', {});
    const tpl = res.result?.resourceTemplates;
    requireOk(
      'resources/templates/list',
      Array.isArray(tpl) && tpl.some((t) => t.uriTemplate?.includes('hana:///')),
      `${tpl?.length || 0} templates`
    );
  } catch (e) {
    failures.push({ name: 'resources/templates/list', detail: e.message });
    logCase('resources/templates/list', false, e.message);
  }

  logSection('resources/read hana:///schemas');
  try {
    const res = await send('resources/read', { uri: 'hana:///schemas' });
    const text = res.result?.contents?.[0]?.text;
    const j = text ? JSON.parse(text) : null;
    requireOk(
      'resources/read schemas',
      j && Array.isArray(j.schemas),
      `totalSchemas=${j?.totalSchemas} truncated=${j?.truncated}`
    );
  } catch (e) {
    failures.push({ name: 'resources/read schemas', detail: e.message });
    logCase('resources/read schemas', false, e.message);
  }

  if (workSchema) {
    const schemaUri = `hana:///schemas/${encodeURIComponent(workSchema)}`;
    logSection(`resources/read ${schemaUri}`);
    try {
      const res = await send('resources/read', { uri: schemaUri });
      const text = res.result?.contents?.[0]?.text;
      const j = text ? JSON.parse(text) : null;
      requireOk(
        'resources/read schema',
        j && j.schema === workSchema && Array.isArray(j.tables),
        `tables=${j?.tables?.length} truncated=${j?.truncated}`
      );
    } catch (e) {
      failures.push({ name: 'resources/read schema', detail: e.message });
      logCase('resources/read schema', false, e.message);
    }
  }

  if (workSchema && workTable) {
    if (liveMetadataSkippable) {
      console.log(
        '\n=== resources/read table ===\n  skipped — same as metadata skip for probe-only HANA_LIVE_TABLE_REF'
      );
    } else {
      const tableUri = `hana:///schemas/${encodeURIComponent(workSchema)}/tables/${encodeURIComponent(workTable)}`;
      logSection(`resources/read table`);
      try {
        const res = await send('resources/read', { uri: tableUri });
        const text = res.result?.contents?.[0]?.text;
        const j = text ? JSON.parse(text) : null;
        requireOk(
          'resources/read table',
          j && j.table === workTable && Array.isArray(j.columns),
          `${j?.columns?.length || 0} columns`
        );
      } catch (e) {
        failures.push({ name: 'resources/read table', detail: e.message });
        logCase('resources/read table', false, e.message);
      }
    }
  }

  logSection('prompts/list (smoke)');
  try {
    const res = await send('prompts/list', {});
    requireOk('prompts/list', Array.isArray(res.result?.prompts));
  } catch (e) {
    failures.push({ name: 'prompts/list', detail: e.message });
    logCase('prompts/list', false, e.message);
  }

  logSection('tools/list (smoke + cursor)');
  try {
    const res = await send('tools/list', {});
    const tools = res.result?.tools;
    requireOk('tools/list', Array.isArray(tools) && tools.length >= 8, `${tools?.length} tools`);
    const cursor = res.result?.nextCursor;
    if (cursor) {
      const res2 = await send('tools/list', { cursor });
      requireOk('tools/list cursor', Array.isArray(res2.result?.tools));
    }
  } catch (e) {
    failures.push({ name: 'tools/list', detail: e.message });
    logCase('tools/list', false, e.message);
  }

  server.stdin.end();
  server.kill();

  console.log('\n--- Summary ---');
  if (failures.length === 0) {
    console.log('All scenarios passed (within configured checks).');
  } else {
    console.log(`Failures: ${failures.length}`);
    for (const f of failures) {
      console.log(`  - ${f.name}: ${f.detail}`);
    }
  }

  if (LIVE_STRICT && failures.length > 0) {
    process.exit(1);
  }

  console.log('\nDone.');
}

run().catch((err) => {
  console.error(err);
  try {
    server.stdin.end();
    server.kill();
  } catch (_) {}
  process.exit(1);
});
