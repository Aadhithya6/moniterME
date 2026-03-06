/**
 * HealthyFi API Server
 */
require('dotenv').config();
const app = require('./app');
const config = require('./config');

const server = app.listen(config.port, () => {
  console.log(`HealthyFi API running on port ${config.port}`);
  console.log(`Environment: ${config.nodeEnv}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully.');
  server.close(() => {
    process.exit(0);
  });
});
