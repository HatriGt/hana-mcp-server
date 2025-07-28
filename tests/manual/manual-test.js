#!/usr/bin/env node

const { spawn } = require('child_process');
const readline = require('readline');

console.log('🔍 HANA MCP Server Manual Tester');
console.log('================================\n');

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

let requestId = 1;

// Handle server output
server.stdout.on('data', (data) => {
  const lines = data.toString().split('\n').filter(line => line.trim());
  lines.forEach(line => {
    try {
      const response = JSON.parse(line);
      console.log('\n📤 Response:', JSON.stringify(response, null, 2));
    } catch (e) {
      // Not JSON, ignore
    }
  });
});

server.stderr.on('data', (data) => {
  console.log('🔧 Server Log:', data.toString().trim());
});

// Send request function
function sendRequest(method, params = {}) {
  const request = {
    jsonrpc: "2.0",
    id: requestId++,
    method,
    params
  };
  console.log(`\n📤 Sending: ${method}`);
  server.stdin.write(JSON.stringify(request) + '\n');
}

// Initialize the server
setTimeout(() => {
  console.log('🚀 Initializing server...');
  sendRequest('initialize', {
    protocolVersion: "2024-11-05",
    capabilities: {},
    clientInfo: {
      name: "manual-tester",
      version: "1.0.0"
    }
  });
  
  setTimeout(() => {
    console.log('\n📋 Listing tools...');
    sendRequest('tools/list');
  }, 500);
}, 1000);

// Interactive menu
setTimeout(() => {
  console.log('\n\n🎯 Available Tests:');
  console.log('1. Show HANA Config');
  console.log('2. Test Connection');
  console.log('3. List Schemas');
  console.log('4. List Tables');
  console.log('5. Describe Table');
  console.log('6. List Indexes');
  console.log('7. Execute Query');
  console.log('8. Show Environment Variables');
  console.log('9. Exit');
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  function showMenu() {
    rl.question('\nSelect a test (1-9): ', (answer) => {
      switch(answer.trim()) {
        case '1':
          sendRequest('tools/call', {
            name: "hana_show_config",
            arguments: {}
          });
          break;
        case '2':
          sendRequest('tools/call', {
            name: "hana_test_connection",
            arguments: {}
          });
          break;
        case '3':
          sendRequest('tools/call', {
            name: "hana_list_schemas",
            arguments: {}
          });
          break;
        case '4':
          rl.question('Enter schema name: ', (schema) => {
            sendRequest('tools/call', {
              name: "hana_list_tables",
              arguments: { schema_name: schema.trim() }
            });
          });
          return;
        case '5':
          rl.question('Enter schema name: ', (schema) => {
            rl.question('Enter table name: ', (table) => {
              sendRequest('tools/call', {
                name: "hana_describe_table",
                arguments: { 
                  schema_name: schema.trim(),
                  table_name: table.trim()
                }
              });
            });
          });
          return;
        case '6':
          rl.question('Enter schema name: ', (schema) => {
            rl.question('Enter table name: ', (table) => {
              sendRequest('tools/call', {
                name: "hana_list_indexes",
                arguments: { 
                  schema_name: schema.trim(),
                  table_name: table.trim()
                }
              });
            });
          });
          return;
        case '7':
          rl.question('Enter SQL query: ', (query) => {
            sendRequest('tools/call', {
              name: "hana_execute_query",
              arguments: { query: query.trim() }
            });
          });
          return;
        case '8':
          sendRequest('tools/call', {
            name: "hana_show_env_vars",
            arguments: {}
          });
          break;
        case '9':
          console.log('👋 Goodbye!');
          server.kill();
          rl.close();
          process.exit(0);
          break;
        default:
          console.log('❌ Invalid option. Please select 1-9.');
      }
      setTimeout(showMenu, 1000);
    });
  }
  
  showMenu();
}, 3000);

// Handle server errors
server.on('error', (error) => {
  console.error('❌ Server error:', error);
  process.exit(1);
});

server.on('close', (code) => {
  console.log(`\n🔚 Server closed with code ${code}`);
  process.exit(0);
}); 