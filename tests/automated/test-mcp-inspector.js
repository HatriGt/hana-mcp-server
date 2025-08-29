const { spawn } = require('child_process');

console.log('🔍 HANA MCP Server Inspector');
console.log('============================\n');

// Spawn the MCP server process
const server = spawn('/opt/homebrew/opt/node@20/bin/node', ['../../hana-mcp-server.js'], {
  stdio: ['pipe', 'pipe', 'pipe'],
  env: {
    HANA_HOST: "your-hana-host.com",
    HANA_PORT: "443",
    HANA_USER: "your-username",
    HANA_PASSWORD: "your-password",
    HANA_SCHEMA: "your-schema",
    HANA_SSL: "true",
    HANA_ENCRYPT: "true",
    HANA_VALIDATE_CERT: "true",
    HANA_DATABASE: "your-tenant-database"
  }
});

// Handle server output
server.stdout.on('data', (data) => {
  try {
    const response = JSON.parse(data.toString().trim());
    console.log('📤 Response:', JSON.stringify(response, null, 2));
  } catch (error) {
    console.log('🔧 Server Log:', data.toString().trim());
  }
});

server.stderr.on('data', (data) => {
  console.log('🔧 Server Log:', data.toString().trim());
});

// Send request function
function sendRequest(method, params = {}) {
  const request = {
    jsonrpc: '2.0',
    id: Date.now(),
    method,
    params
  };
  
  server.stdin.write(JSON.stringify(request) + '\n');
}

// Test functions
async function testInitialize() {
  console.log('\n🧪 Testing: Initialize');
  sendRequest('initialize', {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'test-client', version: '1.0.0' }
  });
  await new Promise(resolve => setTimeout(resolve, 1000));
}

async function testToolsList() {
  console.log('\n🧪 Testing: Tools List');
  sendRequest('tools/list', {});
  await new Promise(resolve => setTimeout(resolve, 1000));
}

async function testShowConfig() {
  console.log('\n🧪 Testing: Show Config');
  sendRequest('tools/call', {
    name: "hana_show_config",
    arguments: {}
  });
  await new Promise(resolve => setTimeout(resolve, 1000));
}

async function testListSchemas() {
  console.log('\n🧪 Testing: List Schemas');
  sendRequest('tools/call', {
    name: "hana_list_schemas",
    arguments: {}
  });
  await new Promise(resolve => setTimeout(resolve, 1000));
}

async function testListTables() {
  console.log('\n🧪 Testing: List Tables');
  sendRequest('tools/call', {
    name: "hana_list_tables",
    arguments: { schema_name: "SYSTEM" }
  });
  await new Promise(resolve => setTimeout(resolve, 1000));
}

async function testExecuteQuery() {
  console.log('\n🧪 Testing: Execute Query');
  sendRequest('tools/call', {
    name: "hana_execute_query",
    arguments: {
      query: "SELECT 1 as test_value FROM DUMMY"
    }
  });
  await new Promise(resolve => setTimeout(resolve, 1000));
}

// Main test runner
async function runTests() {
  try {
    await testInitialize();
    await testToolsList();
    await testShowConfig();
    await testListSchemas();
    await testListTables();
    await testExecuteQuery();
    
    console.log('\n✅ Tests completed!');
    
    // Close server
    server.stdin.end();
    server.kill();
    
  } catch (error) {
    console.error('❌ Test error:', error);
    server.kill();
  }
}

// Handle server exit
server.on('close', (code) => {
  console.log(`\n🔚 Server closed with code ${code}`);
});

server.on('error', (error) => {
  console.error('❌ Server error:', error);
});

// Start tests
runTests().catch(console.error); 