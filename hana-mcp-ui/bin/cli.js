#!/usr/bin/env node

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import chalk from 'chalk';
import open from 'open';
import fs from 'fs-extra';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = dirname(__dirname);

console.log(chalk.blue.bold('🚀 Starting HANA MCP UI...'));
console.log(chalk.gray('Professional database configuration management'));

// Check if we're in development or production
const isDev = process.env.NODE_ENV === 'development' || fs.existsSync(join(rootDir, 'src'));

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
backendProcess = spawn('node', [join(rootDir, 'server', 'index.js')], {
  stdio: 'inherit',
  env: { ...process.env, PORT: '3001' }
});

backendProcess.on('error', (err) => {
  console.error(chalk.red('Backend server error:'), err);
});

// Wait for backend to start
setTimeout(() => {
  if (isDev) {
    // Development mode - start Vite dev server
    console.log(chalk.cyan('⚛️  Starting React dev server...'));
    frontendProcess = spawn('bun', ['vite', '--port', '5173', '--host'], {
      stdio: 'inherit',
      cwd: rootDir,
      shell: true
    });
  } else {
    // Production mode - serve built files
    console.log(chalk.cyan('📦 Serving production build...'));
    frontendProcess = spawn('bun', ['vite', 'preview', '--port', '5173', '--host'], {
      stdio: 'inherit',
      cwd: rootDir,
      shell: true
    });
  }

  frontendProcess.on('error', (err) => {
    console.error(chalk.red('Frontend server error:'), err);
  });

  // Open browser after frontend starts
  setTimeout(() => {
    console.log(chalk.green.bold('\n✨ HANA MCP UI is ready!'));
    console.log(chalk.gray('Opening browser at http://localhost:5173'));
    open('http://localhost:5173');
  }, 3000);
}, 2000);