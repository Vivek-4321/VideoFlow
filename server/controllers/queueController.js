const logger = require('../utils/logger');

class QueueController {
  constructor(queue, workers) {
    this.queue = queue;
    this.workers = workers;
  }

  // Get queue status
  async getQueueStatus(req, res) {
    try {
      const waiting = await this.queue.getWaiting();
      const active = await this.queue.getActive();
      const completed = await this.queue.getCompleted();
      const failed = await this.queue.getFailed();

      res.status(200).json({
        success: true,
        data: {
          waiting: waiting.length,
          active: active.length,
          completed: completed.length,
          failed: failed.length,
          workers: this.workers.length,
        },
      });
    } catch (error) {
      logger.error(`Error getting queue status:`, error);
      res.status(500).json({
        success: false,
        error: `Failed to get queue status: ${error.message}`,
      });
    }
  }
}

module.exports = QueueController;