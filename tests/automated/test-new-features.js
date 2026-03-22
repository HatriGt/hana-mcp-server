/**
 * Tests for new MCP features: protocol alignment, pagination, resources, tasks, tool annotations.
 * Runs against the stdio server; does not require a real HANA connection for most tests.
 */

const path = require('path');
const { spawn } = require('child_process');

const serverScript = path.join(__dirname, '..', '..', 'hana-mcp-server.js');
const projectRoot = path.join(__dirname, '..', '..');

let server;
const pending = new Map();
let stderr = '';

function startServer() {
  server = spawn(process.execPath, [serverScript], {
    stdio: ['pipe', 'pipe', 'pipe'],
    cwd: projectRoot,
    env: {
      ...process.env,
      HANA_HOST: 'test-host.example.com',
      HANA_PORT: '443',
      HANA_USER: 'testuser',
      HANA_PASSWORD: 'testpass',
      HANA_SCHEMA: 'TEST_SCHEMA',
      HANA_SSL: 'false',
      HANA_ENCRYPT: 'false',
      HANA_VALIDATE_CERT: 'false'
    }
  });

  server.stdout.on('data', (data) => {
    const line = data.toString().trim();
    if (!line) return;
    try {
      const response = JSON.parse(line);
      const id = response.id;
      if (id !== undefined && pending.has(id)) {
        pending.get(id)(response);
        pending.delete(id);
      }
    } catch (_) {
      // ignore non-JSON lines
    }
  });

  server.stderr.on('data', (data) => {
    stderr += data.toString();
  });
}

function sendRequest(id, method, params = {}, options = {}) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      if (pending.has(id)) {
        pending.delete(id);
        reject(new Error(`Timeout waiting for response: ${method}`));
      }
    }, 8000);
    pending.set(id, (response) => {
      clearTimeout(timeout);
      if (!options.allowError && response.error) {
        reject(new Error(response.error.message || JSON.stringify(response.error)));
      } else {
        resolve(response);
      }
    });
    server.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
  });
}

let nextId = 1;
function req(method, params) {
  return sendRequest(nextId++, method, params);
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

async function runTests() {
  startServer();
  await new Promise((r) => setTimeout(r, 500));

  const results = { passed: 0, failed: 0, tests: [] };

  function ok(name) {
    results.passed++;
    results.tests.push({ name, status: 'pass' });
    console.log('  ✅', name);
  }
  function fail(name, err) {
    results.failed++;
    results.tests.push({ name, status: 'fail', error: err.message });
    console.log('  ❌', name, '-', err.message);
  }

  console.log('\n--- 1. Initialize (protocol version, instructions, capabilities) ---\n');

  try {
    const init = await req('initialize', {
      protocolVersion: '2025-11-25',
      capabilities: {},
      clientInfo: { name: 'test', version: '1.0.0' }
    });
    assert(init.result.protocolVersion === '2025-11-25', 'protocolVersion');
    assert(typeof init.result.instructions === 'string' && init.result.instructions.length > 0, 'instructions');
    assert(init.result.capabilities?.tools?.listChanged === false, 'tools capability');
    assert(init.result.capabilities?.resources, 'resources capability');
    assert(init.result.capabilities?.tasks?.requests?.tools?.call !== undefined, 'tasks capability');
    assert(init.result.serverInfo?.title === 'HANA MCP Server', 'serverInfo.title');
    ok('Initialize returns 2025-11-25, instructions, capabilities (tools, resources, tasks), serverInfo');
  } catch (e) {
    fail('Initialize', e);
  }

  try {
    const initOld = await req('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'test', version: '1.0.0' }
    });
    assert(initOld.result.protocolVersion === '2024-11-05', 'version negotiation');
    ok('Initialize with 2024-11-05 negotiates to 2024-11-05');
  } catch (e) {
    fail('Initialize version negotiation', e);
  }

  console.log('\n--- 2. Tools list (annotations, pagination) ---\n');

  try {
    const list = await req('tools/list', {});
    assert(Array.isArray(list.result.tools), 'tools array');
    assert(list.result.tools.length >= 11, 'at least 11 tools');
    const first = list.result.tools[0];
    assert(first.annotations && typeof first.annotations.readOnlyHint === 'boolean', 'annotations');
    assert(first.title, 'title');
    const queryTool = list.result.tools.find((t) => t.name === 'hana_execute_query');
    assert(queryTool?.execution?.taskSupport === 'optional', 'taskSupport optional');
    assert(queryTool?.outputSchema?.type === 'object', 'hana_execute_query outputSchema');
    const listSchemasTool = list.result.tools.find((t) => t.name === 'hana_list_schemas');
    assert(listSchemasTool?.outputSchema?.type === 'object', 'hana_list_schemas outputSchema');
    assert(list.result.tools.some((t) => t.name === 'hana_explain_table'), 'hana_explain_table present');
    assert(list.result.tools.some((t) => t.name === 'hana_query_next_page'), 'hana_query_next_page present');
    ok('Tools list returns tools with annotations, title, outputSchema on query/list tools, new explain/next_page tools');
  } catch (e) {
    fail('Tools list', e);
  }

  try {
    const listPage2 = await req('tools/list', { cursor: Buffer.from(JSON.stringify({ offset: 5 }), 'utf8').toString('base64') });
    assert(Array.isArray(listPage2.result.tools), 'tools array with cursor');
    ok('Tools list with cursor returns paginated tools');
  } catch (e) {
    fail('Tools list pagination', e);
  }

  console.log('\n--- 3. Prompts list (arguments, pagination shape) ---\n');

  try {
    const prompts = await req('prompts/list', {});
    assert(Array.isArray(prompts.result.prompts), 'prompts array');
    assert(prompts.result.prompts.length >= 1, 'at least one prompt');
    const p = prompts.result.prompts[0];
    assert(p.name && p.description, 'name and description');
    assert(Array.isArray(p.arguments) || p.arguments === undefined, 'arguments array or absent');
    ok('Prompts list returns prompts with name, description, arguments');
  } catch (e) {
    fail('Prompts list', e);
  }

  console.log('\n--- 4. Resources list, read, templates ---\n');

  try {
    const resList = await req('resources/list', {});
    assert(Array.isArray(resList.result.resources), 'resources array');
    ok('Resources list returns resources array (may be empty if no DB)');
  } catch (e) {
    fail('Resources list', e);
  }

  try {
    const templates = await req('resources/templates/list', {});
    assert(Array.isArray(templates.result.resourceTemplates), 'resourceTemplates');
    assert(templates.result.resourceTemplates.some((t) => t.uriTemplate && t.uriTemplate.includes('hana:///')), 'hana URI template');
    ok('Resources templates list returns hana:/// URI templates');
  } catch (e) {
    fail('Resources templates list', e);
  }

  try {
    const readResp = await sendRequest(nextId++, 'resources/read', { uri: 'hana:///schemas' }, { allowError: true });
    if (readResp.result && readResp.result.contents) {
      assert(Array.isArray(readResp.result.contents), 'contents array');
      assert(readResp.result.contents[0].uri === 'hana:///schemas' && readResp.result.contents[0].text !== undefined, 'schemas content');
      ok('Resources read hana:///schemas returns contents with text');
    } else if (readResp.error) {
      assert([-32001, -32603].includes(readResp.error.code), 'expected no-connection or internal error when DB unavailable');
      ok('Resources read hana:///schemas returns error when no DB connection (expected in test)');
    } else {
      throw new Error('Unexpected response shape');
    }
  } catch (e) {
    fail('Resources read hana:///schemas', e);
  }

  console.log('\n--- 5. Tool call (CallToolResult with content, isError) ---\n');

  try {
    const call = await req('tools/call', { name: 'hana_show_config', arguments: {} });
    assert(call.result.content && Array.isArray(call.result.content), 'content array');
    assert(call.result.content[0].type === 'text' && typeof call.result.content[0].text === 'string', 'text content');
    ok('Tools call returns CallToolResult with content[].type and content[].text');
  } catch (e) {
    fail('Tools call show_config', e);
  }

  try {
    const testConn = await req('tools/call', { name: 'hana_test_connection', arguments: {} });
    assert(testConn.result.content, 'content');
    assert(testConn.result.isError === true, 'isError true when connection fails');
    ok('Connection test returns isError: true when no DB (tool execution error)');
  } catch (e) {
    fail('Tools call test_connection isError', e);
  }

  console.log('\n--- 6. Task-augmented tools/call, tasks/get, tasks/result, tasks/list, tasks/cancel ---\n');

  let taskId;
  try {
    const taskCall = await req('tools/call', {
      name: 'hana_show_config',
      arguments: {},
      task: { ttl: 60000 }
    });
    assert(taskCall.result.task, 'task in result');
    assert(taskCall.result.task.taskId && taskCall.result.task.status, 'taskId and status');
    taskId = taskCall.result.task.taskId;
    ok('Tools call with task returns CreateTaskResult with task.taskId');
  } catch (e) {
    fail('Tools call with task', e);
  }

  if (taskId) {
    await new Promise((r) => setTimeout(r, 400));
    try {
      const get = await req('tasks/get', { taskId });
      assert(get.result.taskId === taskId, 'taskId');
      assert(['working', 'completed'].includes(get.result.status), 'status');
      ok('Tasks get returns task status');
    } catch (e) {
      fail('Tasks get', e);
    }

    await new Promise((r) => setTimeout(r, 600));
    try {
      const result = await req('tasks/result', { taskId });
      assert(result.result.content && Array.isArray(result.result.content), 'result content');
      ok('Tasks result returns tool result content');
    } catch (e) {
      fail('Tasks result', e);
    }
  }

  try {
    const listTasks = await req('tasks/list', {});
    assert(Array.isArray(listTasks.result.tasks), 'tasks array');
    ok('Tasks list returns tasks array');
  } catch (e) {
    fail('Tasks list', e);
  }

  try {
    const cancelCall = await req('tools/call', {
      name: 'hana_show_config',
      arguments: {},
      task: { ttl: 60000 }
    });
    const cancelId = cancelCall.result?.task?.taskId;
    if (cancelId) {
      const cancelResp = await sendRequest(nextId++, 'tasks/cancel', { taskId: cancelId }, { allowError: true });
      if (cancelResp.result && cancelResp.result.status === 'cancelled') {
        ok('Tasks cancel returns status cancelled');
      } else if (cancelResp.error && cancelResp.error.message && cancelResp.error.message.includes('terminal')) {
        ok('Tasks cancel rejects when task already completed (valid behavior)');
      } else {
        throw new Error(cancelResp.error?.message || 'Unexpected cancel response');
      }
    } else {
      ok('Tasks cancel (task created for cancel test)');
    }
  } catch (e) {
    fail('Tasks cancel', e);
  }

  console.log('\n--- 7. Invalid / edge cases ---\n');

  try {
    const badTool = await sendRequest(nextId++, 'tools/call', { name: 'nonexistent_tool', arguments: {} }, { allowError: true });
    assert(badTool.error && badTool.error.code === -32601, 'method not found / tool not found');
    ok('Unknown tool returns JSON-RPC error');
  } catch (e) {
    fail('Unknown tool error', e);
  }

  try {
    const badResource = await sendRequest(nextId++, 'resources/read', { uri: 'hana:///invalid/path' }, { allowError: true });
    assert(badResource.error && (badResource.error.code === -32002 || badResource.error.code === -32603), 'resource not found or error');
    ok('Invalid resource URI returns error');
  } catch (e) {
    fail('Invalid resource URI', e);
  }

  server.stdin.end();
  server.kill();
  await new Promise((r) => setTimeout(r, 300));

  console.log('\n--- 8. HTTP transport (optional) ---\n');

  const http = require('http');
  const httpScript = path.join(__dirname, '..', '..', 'src', 'server', 'http-index.js');
  const httpPort = 31999;
  const httpServer = spawn(process.execPath, [httpScript], {
    stdio: ['ignore', 'pipe', 'pipe'],
    cwd: projectRoot,
    env: { ...process.env, MCP_HTTP_PORT: String(httpPort), MCP_HTTP_HOST: '127.0.0.1' }
  });
  await new Promise((r) => setTimeout(r, 800));

  try {
    const initBody = JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: { protocolVersion: '2025-11-25', capabilities: {}, clientInfo: { name: 'test', version: '1.0.0' } }
    });
    const res = await new Promise((resolve, reject) => {
      const req = http.request({
        host: '127.0.0.1',
        port: httpPort,
        path: '/mcp',
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(initBody) }
      }, (r) => {
        let data = '';
        r.on('data', (c) => { data += c; });
        r.on('end', () => resolve({ status: r.statusCode, data }));
      });
      req.on('error', reject);
      req.setTimeout(5000, () => reject(new Error('HTTP timeout')));
      req.write(initBody);
      req.end();
    });
    assert(res.status === 200, 'HTTP 200');
    const parsed = JSON.parse(res.data);
    assert(parsed.result && parsed.result.protocolVersion, 'initialize result');
    ok('HTTP POST /mcp initialize returns 200 and JSON-RPC result');
  } catch (e) {
    fail('HTTP transport initialize', e);
  } finally {
    httpServer.kill();
    await new Promise((r) => setTimeout(r, 200));
  }

  console.log('\n========================================');
  console.log(`Result: ${results.passed} passed, ${results.failed} failed`);
  console.log('========================================\n');

  if (results.failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error(err);
  if (server) {
    server.stdin.end();
    server.kill();
  }
  process.exit(1);
});
