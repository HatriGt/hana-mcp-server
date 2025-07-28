#!/usr/bin/env node

// Simple test script for HANA MCP Server
const { spawn } = require('child_process');

console.log('🧪 Testing HANA MCP Server...');

// Start the server
const server = spawn('/opt/homebrew/bin/node', ['hana-mcp-server.js'], {
  stdio: ['pipe', 'pipe', 'pipe']
});

// Test messages
const testMessages = [
  {
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'test', version: '1.0' }
    }
  },
  {
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/list',
    params: {}
  },
  {
    jsonrpc: '2.0',
    id: 3,
    method: 'tools/call',
    params: {
      name: 'hana_show_config',
      arguments: {}
    }
  }
];

let messageIndex = 0;

function sendNextMessage() {
  if (messageIndex < testMessages.length) {
    const message = testMessages[messageIndex];
    console.log(`📤 Sending: ${message.method}`);
    server.stdin.write(JSON.stringify(message) + '\n');
    messageIndex++;
  } else {
    setTimeout(() => server.kill(), 1000);
  }
}

server.stdout.on('data', (data) => {
  const output = data.toString().trim();
  if (output) {
    console.log(`📥 Received: ${output.substring(0, 100)}...`);
    try {
      const parsed = JSON.parse(output);
      if (parsed.result && parsed.result.tools) {
        console.log(`✅ Tools available: ${parsed.result.tools.map(t => t.name).join(', ')}`);
      }
    } catch (e) {
      console.log(`❌ Invalid JSON: ${e.message}`);
    }
  }
});

server.stderr.on('data', (data) => {
  console.log(`🔍 Server log: ${data.toString().trim()}`);
});

server.on('close', (code) => {
  console.log(`🏁 Server closed with code ${code}`);
  console.log('✅ Test completed successfully!');
});

setTimeout(sendNextMessage, 500); 