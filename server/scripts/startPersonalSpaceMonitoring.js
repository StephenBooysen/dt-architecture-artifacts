#!/usr/bin/env node

/**
 * @fileoverview Startup script for Personal Space Monitoring System
 * This script starts the complete personal space monitoring solution
 */

const path = require('path');
const { spawn } = require('child_process');

// Configuration
const MONITORING_SCRIPT = path.join(__dirname, '../workers/personalSpaceMonitor.js');

console.log('🚀 Starting Personal Space Monitoring System...');
console.log('====================================================');

// Start the monitoring orchestrator
const monitorProcess = spawn('node', [MONITORING_SCRIPT], {
  stdio: 'inherit', // Pass through stdio to see logs
  env: {
    ...process.env,
    NODE_ENV: process.env.NODE_ENV || 'development'
  }
});

// Handle process events
monitorProcess.on('error', (error) => {
  console.error('Failed to start monitoring system:', error);
  process.exit(1);
});

monitorProcess.on('close', (code) => {
  if (code !== 0) {
    console.error(`Monitoring system exited with code ${code}`);
    process.exit(code);
  } else {
    console.log('Monitoring system shut down gracefully');
  }
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down Personal Space Monitoring...');
  monitorProcess.kill('SIGINT');
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down Personal Space Monitoring...');
  monitorProcess.kill('SIGTERM');
});

console.log('Personal Space Monitoring System is starting...');
console.log('Press Ctrl+C to stop');