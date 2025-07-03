class HealthController {
  constructor(redisConnection, workers, queueName) {
    this.redisConnection = redisConnection;
    this.workers = workers;
    this.queueName = queueName;
  }

  // Health check endpoint
  async getHealthStatus(req, res) {
    try {
      // Check Redis connection
      const redisHealth = (await this.redisConnection.ping()) === "PONG";

      res.status(200).json({
        success: true,
        message: "Video transcoder API is running",
        timestamp: new Date().toISOString(),
        services: {
          redis: redisHealth,
          workers: this.workers.length,
          queue: this.queueName,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: "Health check failed",
        timestamp: new Date().toISOString(),
      });
    }
  }
}

module.exports = HealthController;