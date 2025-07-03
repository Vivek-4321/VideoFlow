const { Worker } = require("bullmq");
const Job = require("../models/job");
const logger = require("../utils/logger");
const simplifiedTranscoder = require("./transcoder");

class JobProcessingService {
  constructor(queueName, redisConnectionFactory) {
    this.queueName = queueName;
    this.redisConnectionFactory = redisConnectionFactory;
    this.workers = [];
    this.io = null;
  }

  // Set WebSocket instance
  setWebSocketInstance(io) {
    this.io = io;
  }

  // Enhanced progress callback that emits WebSocket events
  createProgressCallback(jobId, userId) {
    return async (progress) => {
      try {
        // Update database with progress
        await Job.findByIdAndUpdate(jobId, {
          progress: Math.round(progress),
          status: progress === 100 ? "completed" : "processing",
        });

        // Emit real-time progress to user
        if (this.io) {
          this.io.to(`user:${userId}`).emit("job-progress", {
            jobId,
            progress: Math.round(progress),
            status: progress === 100 ? "completed" : "processing",
            timestamp: new Date().toISOString(),
          });
        }

        logger.info(`Progress update: Job ${jobId} - ${Math.round(progress)}%`);
      } catch (error) {
        logger.error(`Error updating progress for job ${jobId}:`, error);
      }
    };
  }

  // Enhanced job processor with WebSocket integration
  async processJobWithWebSocket(job) {
    const { jobId } = job.data;
    let jobDoc;

    try {
      logger.info(`🚀 Starting job processing: ${jobId}`);

      // Get job document
      jobDoc = await Job.findById(jobId);
      if (!jobDoc) {
        throw new Error(`Job not found: ${jobId}`);
      }

      // Update job status to processing
      await Job.findByIdAndUpdate(jobId, {
        status: "processing",
        startedAt: new Date(),
        queueId: job.id,
        progress: 0,
      });

      // Emit job started event
      if (this.io) {
        this.io.to(`user:${jobDoc.userId}`).emit("job-started", {
          jobId,
          status: "processing",
          timestamp: new Date().toISOString(),
        });
      }

      // Create progress callback for this job
      const progressCallback = this.createProgressCallback(jobId, jobDoc.userId);

      // Process the job with real-time progress updates
      const result = await simplifiedTranscoder.processJob(
        jobId,
        progressCallback
      );

      // FIXED: Update job with ALL results including thumbnailUrls
      const updateData = {
        status: "completed",
        completedAt: new Date(),
        progress: 100,
      };

      // Add all result properties to update
      if (result.outputUrls) updateData.outputUrls = result.outputUrls;
      if (result.masterPlaylistUrl)
        updateData.masterPlaylistUrl = result.masterPlaylistUrl;
      if (result.zipUrl) updateData.zipUrl = result.zipUrl;
      if (result.thumbnailUrls) updateData.thumbnailUrls = result.thumbnailUrls; // ✅ CRITICAL: This saves thumbnails to DB

      const updatedJob = await Job.findByIdAndUpdate(jobId, updateData, {
        new: true,
      });

      // Emit job completion event with ALL data including thumbnails
      if (this.io) {
        this.io.to(`user:${jobDoc.userId}`).emit("job-completed", {
          jobId,
          status: "completed",
          progress: 100,
          outputUrls: result.outputUrls,
          masterPlaylistUrl: result.masterPlaylistUrl,
          zipUrl: result.zipUrl,
          thumbnailUrls: result.thumbnailUrls, // ✅ CRITICAL: This sends thumbnails via WebSocket
          timestamp: new Date().toISOString(),
        });
      }

      logger.info(`✅ Job completed successfully: ${jobId}`);
      return { success: true, ...result };
    } catch (error) {
      logger.error(`❌ Job processing failed: ${jobId}`, error);

      // Update job status to failed
      await Job.findByIdAndUpdate(jobId, {
        status: "failed",
        progress: 0,
        error: {
          message: error.message,
          details: error.stack,
          code: error.code || "PROCESSING_ERROR",
        },
      });

      // Emit job failure event
      if (jobDoc && this.io) {
        this.io.to(`user:${jobDoc.userId}`).emit("job-failed", {
          jobId,
          status: "failed",
          progress: 0,
          error: error.message,
          timestamp: new Date().toISOString(),
        });
      }

      throw error;
    }
  }

  // Create and start workers
  startWorkers(workerConcurrency = 3) {
    logger.info(`🔧 Starting ${workerConcurrency} workers...`);

    for (let i = 0; i < workerConcurrency; i++) {
      const worker = new Worker(this.queueName, (job) => this.processJobWithWebSocket(job), {
        connection: this.redisConnectionFactory(), // Each worker gets its own Redis connection
        concurrency: 1, // Process one job at a time per worker
        limiter: {
          max: 10, // Maximum 10 jobs per minute per worker
          duration: 60000,
        },
      });

      // Worker event handlers
      worker.on("ready", () => {
        logger.info(`✅ Worker ${i + 1} is ready`);
      });

      worker.on("error", (err) => {
        logger.error(`❌ Worker ${i + 1} error:`, err);
      });

      worker.on("completed", (job) => {
        logger.info(`✅ Worker ${i + 1} completed job: ${job.id}`);
      });

      worker.on("failed", (job, err) => {
        logger.error(`❌ Worker ${i + 1} failed job: ${job.id}`, err);
      });

      worker.on("stalled", (jobId) => {
        logger.warn(`⚠️ Worker ${i + 1} job stalled: ${jobId}`);
      });

      this.workers.push(worker);
    }

    return this.workers;
  }

  // Get workers array
  getWorkers() {
    return this.workers;
  }

  // Gracefully close all workers
  async closeWorkers() {
    await Promise.all(
      this.workers.map(async (worker, index) => {
        await worker.close();
        logger.info(`👷 Worker ${index + 1} closed`);
      })
    );
  }
}

module.exports = JobProcessingService;