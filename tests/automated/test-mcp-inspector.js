#!/usr/bin/env node

const { spawn } = require('child_process');
const readline = require('readline');

console.log('🔍 HANA MCP Server Inspector');
console.log('============================\n');

// Start the MCP server
        const server = spawn('/opt/homebrew/bin/node', ['../../hana-mcp-server.js'], {
  stdio: ['pipe', 'pipe', 'pipe'],
  env: {
    ...process.env,
    HANA_HOST: "7f94bf00-5c54-40ee-8ec6-e3800940be1b.hna1.prod-eu10.hanacloud.ondemand.com",
    HANA_PORT: "443",
    HANA_USER: "3E05051BFEBB48FDAAC49AADCF353842_6I8ZPQG3KO8JEX49ADIEJ0DSR_RT",
    HANA_PASSWORD: "El6I4.sKUgFFstxPzP_BebVV4i4lTMveWhpg4zH4VqRXTS1x_.2zhkx5yxbG1UfCE5826bN.DzkUwvlvAJx5Az2-i6uz0vBq_HgP5bwLFdIREFXJix6WUSf1qeou0BPJ",
    HANA_SCHEMA: "61000330C5F74440BC7E6784B1745EB6",
    HANA_SSL: "true",
    HANA_ENCRYPT: "true",
    HANA_VALIDATE_CERT: "true"
  }
});

// Handle server output
server.stdout.on('data', (data) => {
  const lines = data.toString().split('\n').filter(line => line.trim());
  lines.forEach(line => {
    try {
      const response = JSON.parse(line);
      console.log('📤 Response:', JSON.stringify(response, null, 2));
    } catch (e) {
      // Not JSON, ignore
    }
  });
});

server.stderr.on('data', (data) => {
  console.log('🔧 Server Log:', data.toString().trim());
});

// Test functions
async function testInitialize() {
  console.log('\n🧪 Testing: Initialize');
  const request = {
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: {
        name: "mcp-inspector",
        version: "1.0.0"
      }
    }
  };
  server.stdin.write(JSON.stringify(request) + '\n');
}

async function testToolsList() {
  console.log('\n🧪 Testing: Tools List');
  const request = {
    jsonrpc: "2.0",
    id: 2,
    method: "tools/list",
    params: {}
  };
  server.stdin.write(JSON.stringify(request) + '\n');
}

async function testShowConfig() {
  console.log('\n🧪 Testing: Show Config');
  const request = {
    jsonrpc: "2.0",
    id: 3,
    method: "tools/call",
    params: {
      name: "hana_show_config",
      arguments: {}
    }
  };
  server.stdin.write(JSON.stringify(request) + '\n');
}

async function testListSchemas() {
  console.log('\n🧪 Testing: List Schemas');
  const request = {
    jsonrpc: "2.0",
    id: 4,
    method: "tools/call",
    params: {
      name: "hana_list_schemas",
      arguments: {}
    }
  };
  server.stdin.write(JSON.stringify(request) + '\n');
}

async function testListTables() {
  console.log('\n🧪 Testing: List Tables');
  const request = {
    jsonrpc: "2.0",
    id: 5,
    method: "tools/call",
    params: {
      name: "hana_list_tables",
      arguments: {
        schema_name: "61000330C5F74440BC7E6784B1745EB6"
      }
    }
  };
  server.stdin.write(JSON.stringify(request) + '\n');
}

async function testExecuteQuery() {
  console.log('\n🧪 Testing: Execute Query');
  const request = {
    jsonrpc: "2.0",
    id: 6,
    method: "tools/call",
    params: {
      name: "hana_execute_query",
      arguments: {
        query: "SELECT SCHEMA_NAME FROM SYS.SCHEMAS LIMIT 5"
      }
    }
  };
  server.stdin.write(JSON.stringify(request) + '\n');
}

// Run tests
async function runTests() {
  await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for server to start
  
  await testInitialize();
  await new Promise(resolve => setTimeout(resolve, 500));
  
  await testToolsList();
  await new Promise(resolve => setTimeout(resolve, 500));
  
  await testShowConfig();
  await new Promise(resolve => setTimeout(resolve, 500));
  
  await testListSchemas();
  await new Promise(resolve => setTimeout(resolve, 500));
  
  await testListTables();
  await new Promise(resolve => setTimeout(resolve, 500));
  
  await testExecuteQuery();
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  console.log('\n✅ Tests completed!');
  server.kill();
  process.exit(0);
}

// Handle server errors
server.on('error', (error) => {
  console.error('❌ Server error:', error);
  process.exit(1);
});

server.on('close', (code) => {
  console.log(`\n🔚 Server closed with code ${code}`);
});

// Start tests
runTests().catch(console.error); 