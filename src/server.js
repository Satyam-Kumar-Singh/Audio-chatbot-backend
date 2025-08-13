import http from 'http';
import app from './app.js';
import { config } from './config/index.js';
import { initClientWSS } from './ws/client.ws.js';
import { validateEnv } from './utils/env.js';

validateEnv();

const server = http.createServer(app);

// Attach WebSocket for client <-> server
initClientWSS(server);

server.listen(config.port, () => {
  console.log(`🚀 Server running on http://localhost:${config.port}`);
});
