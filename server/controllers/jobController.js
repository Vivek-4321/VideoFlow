const Job = require('../models/job');
const logger = require('../utils/logger');

class JobController {
  constructor(queue, io) {
    this.queue = queue;
    this.io = io;
  }

  // Create a new transcoding job
  async createJob(req, res) {
    try {
      const { inputUrl, inputFileName, outputFormat, outputOptions } = req.body;
      
      // Get userId from authenticated user (either from token or API key)
      const userId = req.user.uid;
      
      logger.info('Creating job with userId from auth:', { 
        userId, 
        apiKeyUsed: req.apiKeyUsed,
        userObject: req.user 
      });

      // Create job in database
      const job = await Job.create({
        userId,
        inputUrl,
        inputFileName,
        outputFormat,
        outputOptions,
        status: "pending",
        progress: 0,
      });

      // Add job to queue with priority (you can implement user-based priority)
      const queueJob = await this.queue.add(
        "transcode",
        { jobId: job._id },
        {
          priority: 1, // Default priority, can be higher for premium users
          delay: 0, // No delay for immediate processing
        }
      );

      // Update job with queue ID
      await Job.findByIdAndUpdate(job._id, { queueId: queueJob.id });

      // Emit job creation event
      this.io.to(`user:${userId}`).emit("job-created", {
        jobId: job._id,
        status: "pending",
        queuePosition: await this.queue.getWaiting().then((jobs) => jobs.length),
        timestamp: new Date().toISOString(),
      });

      res.status(201).json({
        success: true,
        data: {
          jobId: job._id,
          status: job.status,
          queuePosition: await this.queue.getWaiting().then((jobs) => jobs.length),
        },
      });
    } catch (error) {
      logger.error(`Error creating job:`, error);
      res.status(500).json({
        success: false,
        error: `Failed to create job: ${error.message}`,
      });
    }
  }

  // Get job details by ID with expiration handling
  async getJobById(req, res) {
    try {
      const job = await Job.findById(req.params.id);
      if (!job) {
        return res.status(404).json({
          success: false,
          error: "Job not found",
        });
      }

      // Check if job should be expired but isn't marked yet
      const oneHourAgo = new Date(Date.now() - (60 * 60 * 1000));
      const shouldBeExpired = job.status === 'completed' && 
                             job.completedAt && 
                             job.completedAt < oneHourAgo;

      if (shouldBeExpired && job.status !== 'expired') {
        // Mark as expired immediately
        await Job.findByIdAndUpdate(job._id, { status: 'expired' });
        job.status = 'expired';
      }

      // Don't return file URLs for expired jobs
      const responseData = {
        jobId: job._id,
        userId: job.userId,
        inputFileName: job.inputFileName,
        outputFormat: job.outputFormat,
        status: job.status,
        progress: job.progress,
        createdAt: job.createdAt,
        startedAt: job.startedAt,
        completedAt: job.completedAt,
        error: job.error
      };

      // Only include file URLs if not expired
      if (job.status !== 'expired') {
        responseData.outputUrls = job.outputUrls;
        responseData.masterPlaylistUrl = job.masterPlaylistUrl;
        responseData.zipUrl = job.zipUrl;
        responseData.thumbnailUrls = job.thumbnailUrls;
      } else {
        // For expired jobs, show expiration message
        responseData.expiredMessage = "This job's files have been automatically deleted after 1 hour retention period.";
      }

      return res.status(200).json({
        success: true,
        data: responseData,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: `Failed to get job: ${error.message}`,
      });
    }
  }

  // List jobs for authenticated user
  async getJobsForUser(req, res) {
    try {
      // Get userId from authenticated user (either from token or API key)
      const userId = req.user.uid;
      const { status, page = 1, limit = 10 } = req.query;

      const query = { userId };
      if (status) {
        query.status = status;
      }

      const options = {
        sort: { createdAt: -1 },
        page: parseInt(page),
        limit: parseInt(limit),
      };

      const jobs = await Job.find(query)
        .sort(options.sort)
        .skip((options.page - 1) * options.limit)
        .limit(options.limit);

      const total = await Job.countDocuments(query);

      return res.status(200).json({
        success: true,
        data: {
          jobs: jobs.map((job) => ({
            jobId: job._id,
            inputFileName: job.inputFileName,
            outputFormat: job.outputFormat,
            status: job.status,
            progress: job.progress,
            createdAt: job.createdAt,
            completedAt: job.completedAt,
          })),
          pagination: {
            total,
            page: options.page,
            limit: options.limit,
            pages: Math.ceil(total / options.limit),
          },
        },
      });
    } catch (error) {
      logger.error(`Error listing jobs:`, error);
      return res.status(500).json({
        success: false,
        error: `Failed to list jobs: ${error.message}`,
      });
    }
  }

  // List jobs by userId (for admin/internal use)
  async getJobsByUserId(req, res) {
    try {
      const { userId } = req.params;
      const { status, page = 1, limit = 10 } = req.query;

      const query = { userId };
      if (status) {
        query.status = status;
      }

      const options = {
        sort: { createdAt: -1 },
        page: parseInt(page),
        limit: parseInt(limit),
      };

      const jobs = await Job.find(query)
        .sort(options.sort)
        .skip((options.page - 1) * options.limit)
        .limit(options.limit);

      const total = await Job.countDocuments(query);

      return res.status(200).json({
        success: true,
        data: {
          jobs: jobs.map((job) => ({
            jobId: job._id,
            inputFileName: job.inputFileName,
            outputFormat: job.outputFormat,
            status: job.status,
            progress: job.progress,
            createdAt: job.createdAt,
            completedAt: job.completedAt,
          })),
          pagination: {
            total,
            page: options.page,
            limit: options.limit,
            pages: Math.ceil(total / options.limit),
          },
        },
      });
    } catch (error) {
      logger.error(`Error listing jobs:`, error);
      return res.status(500).json({
        success: false,
        error: `Failed to list jobs: ${error.message}`,
      });
    }
  }

  // Cancel job
  async cancelJob(req, res) {
    try {
      const job = await Job.findById(req.params.id);
      if (!job) {
        return res.status(404).json({
          success: false,
          error: "Job not found",
        });
      }

      if (job.status === "pending" && job.queueId) {
        // Remove from queue if still pending
        try {
          const queueJob = await this.queue.getJob(job.queueId);
          if (queueJob) {
            await queueJob.remove();
          }
        } catch (err) {
          logger.warn(`Could not remove job from queue: ${err.message}`);
        }
      }

      // Update job status
      await Job.findByIdAndUpdate(req.params.id, {
        status: "cancelled",
        completedAt: new Date(),
      });

      // Emit cancellation event
      this.io.to(`user:${job.userId}`).emit("job-cancelled", {
        jobId: job._id,
        status: "cancelled",
        timestamp: new Date().toISOString(),
      });

      res.status(200).json({
        success: true,
        message: "Job cancelled successfully",
      });
    } catch (error) {
      logger.error(`Error cancelling job:`, error);
      res.status(500).json({
        success: false,
        error: `Failed to cancel job: ${error.message}`,
      });
    }
  }
}

module.exports = JobController;