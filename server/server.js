require("dotenv").config();
const express = require("express");
const http = require("http");
const morgan = require("morgan");
const cors = require("cors");
const bodyParser = require("body-parser");
const connectDB = require("./config/db");
const logger = require("./utils/logger");
const { Queue } = require("bullmq");
const Redis = require("ioredis");
const cleanupService = require('./services/cleanupService');

// Import modular services
const WebSocketService = require('./services/websocketService');
const JobProcessingService = require('./services/jobProcessingService');

// Import controllers
const JobController = require('./controllers/jobController');
const QueueController = require('./controllers/queueController');
const HealthController = require('./controllers/healthController');
const CleanupController = require('./controllers/cleanupController');

// Import route setup functions
const setupJobRoutes = require('./routes/jobRoutes');
const setupQueueRoutes = require('./routes/queueRoutes');
const setupHealthRoutes = require('./routes/healthRoutes');
const setupCleanupRoutes = require('./routes/cleanupRoutes');
const apiKeyRoutes = require('./routes/apiKeyRoutes');
const usageRoutes = require('./routes/usageRoutes');

// Initialize Express app
const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

// Initialize WebSocket service
const webSocketService = new WebSocketService(server);
const io = webSocketService.getIO();

// CORS middleware
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Auth-Mode"],
  })
);

// Logging middleware
app.use(morgan("dev"));

// Request processing middleware
app.use(bodyParser.json({ limit: "10mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "10mb" }));

// Redis connection with retry logic
const createRedisConnection = () => {
  return new Redis({
    host: process.env.REDIS_HOST || "localhost",
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD,
    maxRetriesPerRequest: null,
    retryDelayOnFailover: 100,
    enableReadyCheck: false,
    lazyConnect: true,
    reconnectOnError: (err) => {
      const targetError = "READONLY";
      return err.message.includes(targetError);
    },
  });
};

const redisConnection = createRedisConnection();

// Create queue with proper error handling
const QUEUE_NAME = "videoTranscoding";
const queue = new Queue(QUEUE_NAME, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 5000,
    },
    removeOnComplete: 10, // Keep only 10 completed jobs
    removeOnFail: 20, // Keep 20 failed jobs for debugging
  },
});

// Initialize job processing service
const jobProcessingService = new JobProcessingService(QUEUE_NAME, createRedisConnection);
jobProcessingService.setWebSocketInstance(io);

// Start workers
const WORKER_CONCURRENCY = parseInt(process.env.WORKER_CONCURRENCY) || 3;
const workers = jobProcessingService.startWorkers(WORKER_CONCURRENCY);

// Initialize controllers
const jobController = new JobController(queue, io);
const queueController = new QueueController(queue, workers);
const healthController = new HealthController(redisConnection, workers, QUEUE_NAME);
const cleanupController = new CleanupController();

// Setup routes
app.use('/api/v1/cleanup', setupCleanupRoutes(cleanupController));
app.use('/api/v1/api-keys', apiKeyRoutes);
app.use('/api/v1/usage', usageRoutes);
app.use('/api/v1/jobs', setupJobRoutes(jobController));
app.use('/api/v1/queue', setupQueueRoutes(queueController));
app.use('/api/v1/health', setupHealthRoutes(healthController));

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error("Unhandled error:", err);
  res.status(500).json({
    success: false,
    error: "Internal server error",
  });
});

// Graceful shutdown
const gracefulShutdown = async (signal) => {
  logger.info(`🛑 Received ${signal}. Starting graceful shutdown...`);

  try {
    // Close HTTP server
    server.close(() => {
      logger.info("📡 HTTP server closed");
    });

    // Close all workers
    await jobProcessingService.closeWorkers();

    // Close Redis connections
    await redisConnection.quit();
    logger.info("🔴 Redis connections closed");

    // Close WebSocket server
    webSocketService.close(() => {
      logger.info("🔌 WebSocket server closed");
    });

    logger.info("✅ Graceful shutdown completed");
    process.exit(0);
  } catch (error) {
    logger.error("❌ Error during shutdown:", error);
    process.exit(1);
  }
};

// Handle shutdown signals
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// Handle uncaught exceptions
process.on("uncaughtException", (err) => {
  logger.error("Uncaught Exception:", err);
  gracefulShutdown("UNCAUGHT_EXCEPTION");
});

process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection at:", promise, "reason:", reason);
  gracefulShutdown("UNHANDLED_REJECTION");
});

// Start server
const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();

    server.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`);
      logger.info(`👷 ${WORKER_CONCURRENCY} workers started`);
      logger.info(`🔌 WebSocket server ready`);
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    logger.error(`Failed to start server:`, error);
    process.exit(1);
  }
};

startServer();

cleanupService.startCleanupCron();