#!/usr/bin/env node

import { spawn } from 'child_process';
import path from 'path';
import net from 'net';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_BACKEND_PORT = Number( 8001);
const DEFAULT_FRONTEND_PORT = Number(process.env.FRONTEND_PORT) || 8080;

function findAvailablePort(startPort, host = '127.0.0.1') {
  return new Promise((resolve) => {
    const tryPort = (port) => {
      const server = net.createServer();
      server.once('error', () => {
        // Try next port
        tryPort(port + 1);
      });
      server.once('listening', () => {
        server.close(() => resolve(port));
      });
      server.listen(port, host);
    };
    tryPort(startPort);
  });
}

(async () => {
  console.log('Starting SpendSwift full-stack dev environment...');

  const backendPort = await findAvailablePort(DEFAULT_BACKEND_PORT, '127.0.0.1');
  const frontendPort = await findAvailablePort(DEFAULT_FRONTEND_PORT, '0.0.0.0');

  console.log(`Frontend: http://localhost:${frontendPort}`);
  console.log(`Backend:  http://127.0.0.1:${backendPort}`);
  console.log('-----------------------------------');

  // Start Laravel backend
  const backendCwd = path.join(__dirname, 'Action-G-backend');
  const backendArgs = ['artisan', 'serve', '--host', '127.0.0.1', '--port', String(backendPort)];
  const backendProcess = spawn('php', backendArgs, {
    cwd: backendCwd,
    stdio: 'inherit',
    shell: true,
  });

  backendProcess.on('error', (error) => {
    console.error('Failed to start Laravel backend (php artisan serve):', error);
  });

  // Start Vite frontend with proxy to backend (port passed via env)
  const viteEnv = { ...process.env, BACKEND_PORT: String(backendPort) };
  const viteArgs = ['vite', '--port', String(frontendPort), '--host', '0.0.0.0'];
  const viteProcess = spawn('npx', viteArgs, {
    cwd: __dirname,
    stdio: 'inherit',
    shell: true,
    env: viteEnv,
  });

  viteProcess.on('error', (error) => {
    console.error('Failed to start Vite frontend:', error);
    // If frontend fails, stop backend too
    if (backendProcess && !backendProcess.killed) backendProcess.kill('SIGINT');
    process.exit(1);
  });

  const shutdown = () => {
    console.log('\nShutting down dev servers...');
    if (viteProcess && !viteProcess.killed) viteProcess.kill('SIGINT');
    if (backendProcess && !backendProcess.killed) backendProcess.kill('SIGINT');
  };

  viteProcess.on('close', (code) => {
    console.log(`Vite exited with code ${code}`);
    shutdown();
    process.exit(code ?? 0);
  });

  backendProcess.on('close', (code) => {
    console.log(`Laravel exited with code ${code}`);
  });

  // Handle process termination
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
})();
