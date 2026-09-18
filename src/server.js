const app = require('./app');
const connectDB = require('./config/db');
const env = require('./config/env');

async function start() {
  await connectDB();

  const server = app.listen(env.PORT, () => {
    console.log(`[server] VÉRANT API running in ${env.NODE_ENV} mode on port ${env.PORT}`);
    console.log(`[server] Health check → http://localhost:${env.PORT}/api/health`);
  });

  // Fail loudly instead of leaving the process in a broken half-alive state
  process.on('unhandledRejection', (err) => {
    console.error('[fatal] Unhandled Rejection:', err);
    server.close(() => process.exit(1));
  });

  process.on('uncaughtException', (err) => {
    console.error('[fatal] Uncaught Exception:', err);
    process.exit(1);
  });

  process.on('SIGTERM', () => {
    console.log('[server] SIGTERM received. Shutting down gracefully.');
    server.close(() => process.exit(0));
  });
}

start();
