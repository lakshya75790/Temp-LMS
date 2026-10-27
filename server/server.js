const http = require('http');
const dotenv = require('dotenv');
dotenv.config();

const connectDB = require('./config/db');
const { initSocket } = require('./config/socket');
const app = require('./app');

const PORT = process.env.PORT || 5000;

// Create HTTP server and attach WebSockets immediately
const server = http.createServer(app);
initSocket(server);

// Global Unhandled Process Exception Handlers
process.on('uncaughtException', (err) => {
  console.error('[SERVER UNCAUGHT EXCEPTION]:', err.message || err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[SERVER UNHANDLED REJECTION]:', reason?.message || reason);
});

// Start listening on port immediately so HTTP connections are never refused during startup
server.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Please terminate the process using port ${PORT}.`);
    process.exit(1);
  } else {
    console.error('Server error:', err);
  }
});

// Connect to database and run background startup tasks
connectDB()
  .then(async () => {
    try {
      const ensureSuperAdminExists = require('./utils/seedSuperAdmin');
      await ensureSuperAdminExists();
      const { ensureOrganizationLicensesValid } = require('./services/licenseService');
      await ensureOrganizationLicensesValid();
      const { initScheduler } = require('./services/schedulerService');
      initScheduler();
      console.log('Background initialization tasks completed successfully.');
    } catch (err) {
      console.error('Warning: Background initialization task failed:', err.message || err);
    }
  })
  .catch((err) => {
    console.error('Database connection error during startup:', err.message || err);
  });

// Graceful Shutdown Handlers
const shutdown = async () => {
  if (server) {
    server.close();
  }
  try {
    const { prisma } = require('./config/prismaClient');
    await prisma.$disconnect();
  } catch (err) {
    // Ignore disconnect error during shutdown
  }
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
