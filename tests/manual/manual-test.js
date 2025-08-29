const { spawn } = require('child_process');
const readline = require('readline');

console.log('🔍 HANA MCP Server Manual Tester');
console.log('================================\n');

// Spawn the MCP server process
const server = spawn('/opt/homebrew/bin/node', ['../../hana-mcp-server.js'], {
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
    console.log('\n📤 Response:', JSON.stringify(response, null, 2));
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
  
  console.log(`\n📤 Sending: ${method}`);
  server.stdin.write(JSON.stringify(request) + '\n');
}

// Initialize server
async function initializeServer() {
  console.log('🚀 Initializing server...');
  sendRequest('initialize', {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'manual-test-client', version: '1.0.0' }
  });
  await new Promise(resolve => setTimeout(resolve, 1000));
}

// List available tools
async function listTools() {
  console.log('\n📋 Listing tools...');
  sendRequest('tools/list', {});
  await new Promise(resolve => setTimeout(resolve, 1000));
}

// Interactive menu
function showMenu() {
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
  console.log('\nEnter your choice (1-9):');
}

// Test functions
function testShowConfig() {
  sendRequest('tools/call', {
    name: "hana_show_config",
    arguments: {}
  });
}

function testConnection() {
  sendRequest('tools/call', {
    name: "hana_test_connection",
    arguments: {}
  });
}

function testListSchemas() {
  sendRequest('tools/call', {
    name: "hana_list_schemas",
    arguments: {}
  });
}

function testListTables() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  rl.question('Enter schema name (or press Enter for default): ', (schema) => {
    const args = schema.trim() ? { schema_name: schema.trim() } : {};
    sendRequest('tools/call', {
      name: "hana_list_tables",
      arguments: args
    });
    rl.close();
  });
}

function testDescribeTable() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  rl.question('Enter schema name: ', (schema) => {
    rl.question('Enter table name: ', (table) => {
      sendRequest('tools/call', {
        name: "hana_describe_table",
        arguments: {
          schema_name: schema.trim(),
          table_name: table.trim()
        }
      });
      rl.close();
    });
  });
}

function testListIndexes() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  rl.question('Enter schema name: ', (schema) => {
    rl.question('Enter table name: ', (table) => {
      sendRequest('tools/call', {
        name: "hana_list_indexes",
        arguments: {
          schema_name: schema.trim(),
          table_name: table.trim()
        }
      });
      rl.close();
    });
  });
}

function testExecuteQuery() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  rl.question('Enter SQL query: ', (query) => {
    sendRequest('tools/call', {
      name: "hana_execute_query",
      arguments: {
        query: query.trim()
      }
    });
    rl.close();
  });
}

function testShowEnvVars() {
  sendRequest('tools/call', {
    name: "hana_show_env_vars",
    arguments: {}
  });
}

// Main interactive loop
async function startInteractive() {
  await initializeServer();
  await listTools();
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  const askQuestion = () => {
    showMenu();
    rl.question('', (answer) => {
      switch (answer.trim()) {
        case '1':
          testShowConfig();
          break;
        case '2':
          testConnection();
          break;
        case '3':
          testListSchemas();
          break;
        case '4':
          testListTables();
          break;
        case '5':
          testDescribeTable();
          break;
        case '6':
          testListIndexes();
          break;
        case '7':
          testExecuteQuery();
          break;
        case '8':
          testShowEnvVars();
          break;
        case '9':
          console.log('👋 Goodbye!');
          rl.close();
          server.kill();
          return;
        default:
          console.log('❌ Invalid option. Please select 1-9.');
      }
      
      setTimeout(askQuestion, 2000);
    });
  };
  
  askQuestion();
}

// Handle server exit
server.on('close', (code) => {
  console.log(`\n🔚 Server closed with code ${code}`);
  process.exit(0);
});

server.on('error', (error) => {
  console.error('❌ Server error:', error);
  process.exit(1);
});

// Start interactive testing
startInteractive().catch(console.error); 