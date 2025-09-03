#!/usr/bin/env node

import { spawn, execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import chalk from 'chalk';
import open from 'open';
import { networkInterfaces } from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log(chalk.blue.bold('🚀 Starting HANA MCP UI...'));
console.log(chalk.gray('Professional database configuration management'));

let backendProcess, frontendProcess;

// Graceful shutdown
process.on('SIGINT', () => {
  console.log(chalk.yellow('\n🛑 Shutting down servers...'));
  if (backendProcess) backendProcess.kill();
  if (frontendProcess) frontendProcess.kill();
  process.exit(0);
});

// Start backend server
console.log(chalk.cyan('🔧 Starting backend server...'));
backendProcess = spawn('node', [join(__dirname, 'server', 'index.js')], {
  stdio: 'inherit',
  env: { ...process.env, PORT: '3001' }
});

backendProcess.on('error', (err) => {
  console.error(chalk.red('Backend server error:'), err);
});

// Function to check if port is in use and kill the process if needed
function checkPortAndKillProcess(port) {
  try {
    console.log(chalk.yellow(`🔍 Checking if port ${port} is already in use...`));
    
    // Check if the port is in use
    const checkCommand = process.platform === 'win32' 
      ? `netstat -ano | findstr :${port}`
      : `lsof -i :${port}`;
    
    try {
      const result = execSync(checkCommand, { encoding: 'utf8' });
      
      if (result) {
        console.log(chalk.yellow(`⚠️  Port ${port} is already in use. Finding the process...`));
        
        // Get the PID of the process using the port
        let pid;
        if (process.platform === 'win32') {
          // Extract PID from Windows netstat output
          const lines = result.split('\n');
          for (const line of lines) {
            if (line.includes(`LISTENING`)) {
              pid = line.trim().split(/\s+/).pop();
              break;
            }
          }
        } else {
          // Extract PID from lsof output
          const pidMatch = result.match(/\s+(\d+)\s+/);
          if (pidMatch && pidMatch[1]) {
            pid = pidMatch[1];
          }
        }
        
        if (pid) {
          console.log(chalk.yellow(`🛑 Killing process ${pid} that's using port ${port}...`));
          
          // Kill the process
          const killCommand = process.platform === 'win32'
            ? `taskkill /F /PID ${pid}`
            : `kill -9 ${pid}`;
          
          execSync(killCommand);
          console.log(chalk.green(`✅ Process terminated.`));
          
          // Wait a moment for the port to be released
          execSync('sleep 1');
        } else {
          console.log(chalk.red(`❌ Could not find the process using port ${port}.`));
        }
      }
    } catch (error) {
      // If the command fails, it likely means no process is using the port
      console.log(chalk.green(`✅ Port ${port} is available.`));
    }
  } catch (error) {
    console.error(chalk.red(`Error checking port ${port}:`, error.message));
  }
}

// Check and clear port 5173 if needed
checkPortAndKillProcess(5173);

// Start frontend server
console.log(chalk.cyan('⚛️  Starting React dev server...'));
frontendProcess = spawn('vite', ['--port', '5173', '--host', '0.0.0.0'], {
  stdio: 'inherit',
  cwd: __dirname,
  shell: true
});

frontendProcess.on('error', (err) => {
  console.error(chalk.red('Frontend server error:'), err);
});

// Open browser after a delay
setTimeout(() => {
  console.log(chalk.green.bold('\n✨ HANA MCP UI is ready!'));
  console.log(chalk.gray('Opening browser at http://localhost:5173'));
  open('http://localhost:5173');
}, 5000);


