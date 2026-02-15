#!/usr/bin/env node

const { startServer } = await import('../src/server.js');
await startServer();
