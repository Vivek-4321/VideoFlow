const cron = require('node-cron');
const Job = require('../models/job');
const { deleteFromFirebase } = require('./storage');
const logger = require('../utils/logger');

class CleanupService {
  constructor() {
    this.isRunning = false;
    this.retryAttempts = 3;
    this.retryDelay = 5000; // 5 seconds
  }

  // Start the cleanup cron job - runs every 15 minutes
  startCleanupCron() {
    logger.info('🗑️ Starting video cleanup cron job (every 1 minute for testing)');
    
    // Run every 1 minute for testing: */1 * * * *
    // Change to */15 * * * * for production (every 15 minutes)
    cron.schedule('*/1 * * * *', async () => {
      if (this.isRunning) {
        logger.warn('⚠️ Cleanup job already running, skipping this cycle');
        return;
      }

      try {
        this.isRunning = true;
        await this.cleanupExpiredVideos();
      } catch (error) {
        logger.error('❌ Error in cleanup cron job:', error);
      } finally {
        this.isRunning = false;
      }
    }, {
      scheduled: true,
      timezone: "UTC"
    });

    logger.info('✅ Cleanup cron job scheduled successfully');
  }

  // Main cleanup function
  async cleanupExpiredVideos() {
    try {
      logger.info('🧹 Starting cleanup cycle...');
      
      // Find completed jobs older than 1 hour
      const oneHourAgo = new Date(Date.now() - (60 * 60 * 1000));
      
      const expiredJobs = await Job.find({
        status: 'completed',
        completedAt: { $lt: oneHourAgo },
        $or: [
          { cleanupStatus: { $exists: false } },
          { cleanupStatus: 'pending' },
          { cleanupStatus: 'failed' }
        ]
      });

      if (expiredJobs.length === 0) {
        logger.info('✅ No expired videos found');
        return;
      }

      logger.info(`🗑️ Found ${expiredJobs.length} expired video jobs to cleanup`);

      let successCount = 0;
      let failCount = 0;

      // Process each expired job
      for (const job of expiredJobs) {
        try {
          await this.cleanupSingleJob(job);
          successCount++;
          logger.info(`✅ Successfully cleaned up job: ${job._id}`);
        } catch (error) {
          failCount++;
          logger.error(`❌ Failed to cleanup job ${job._id}:`, error);
          
          // Update job with failed cleanup status
          await Job.findByIdAndUpdate(job._id, {
            cleanupStatus: 'failed',
            cleanupAttempts: (job.cleanupAttempts || 0) + 1,
            lastCleanupError: error.message,
            lastCleanupAttempt: new Date()
          });
        }
      }

      logger.info(`🧹 Cleanup cycle completed: ${successCount} success, ${failCount} failed`);
      
    } catch (error) {
      logger.error('❌ Error in cleanup cycle:', error);
    }
  }

  // Cleanup a single job with retry mechanism
  async cleanupSingleJob(job) {
    const maxRetries = this.retryAttempts;
    let attempt = 0;
    let lastError;

    while (attempt < maxRetries) {
      try {
        attempt++;
        logger.info(`🗑️ Cleaning up job ${job._id} (attempt ${attempt}/${maxRetries})`);

        // Mark as cleanup in progress
        await Job.findByIdAndUpdate(job._id, {
          cleanupStatus: 'in_progress',
          cleanupAttempts: attempt,
          lastCleanupAttempt: new Date()
        });

        // Delete all files associated with this job
        await this.deleteJobFiles(job);

        // Mark job as cleaned up and expired
        await Job.findByIdAndUpdate(job._id, {
          status: 'expired',
          cleanupStatus: 'completed',
          cleanupCompletedAt: new Date(),
          cleanupAttempts: attempt
        });

        logger.info(`✅ Job ${job._id} cleanup completed successfully`);
        return; // Success, exit retry loop

      } catch (error) {
        lastError = error;
        logger.error(`❌ Cleanup attempt ${attempt} failed for job ${job._id}:`, error);

        if (attempt < maxRetries) {
          logger.info(`⏳ Retrying in ${this.retryDelay / 1000} seconds...`);
          await this.delay(this.retryDelay);
        }
      }
    }

    // All retries failed
    throw new Error(`Cleanup failed after ${maxRetries} attempts: ${lastError.message}`);
  }

  // Delete all files associated with a job
  async deleteJobFiles(job) {
    const deletionPromises = [];
    const baseJobPath = `transcoded/${job.userId}/${job._id}`;

    try {
      logger.info(`🗂️ Analyzing job files for deletion: ${job._id}`);

      // 1. Delete output video files
      if (job.outputUrls && job.outputUrls.length > 0) {
        logger.info(`📹 Found ${job.outputUrls.length} output video files to delete`);
        for (const output of job.outputUrls) {
          if (output.url) {
            const filePath = this.extractFirebasePathFromUrl(output.url);
            if (filePath) {
              deletionPromises.push(
                this.deleteFileWithRetry(filePath, `output video: ${output.resolution}`)
              );
            } else {
              logger.warn(`⚠️ Could not extract path from output URL: ${output.url}`);
            }
          }
        }
      }

      // 2. Delete master playlist
      if (job.masterPlaylistUrl) {
        logger.info(`📋 Found master playlist to delete`);
        const filePath = this.extractFirebasePathFromUrl(job.masterPlaylistUrl);
        if (filePath) {
          deletionPromises.push(
            this.deleteFileWithRetry(filePath, 'master playlist')
          );
        } else {
          logger.warn(`⚠️ Could not extract path from master playlist URL: ${job.masterPlaylistUrl}`);
        }
      }

      // 3. Delete ZIP file
      if (job.zipUrl) {
        logger.info(`🗜️ Found ZIP file to delete`);
        const filePath = this.extractFirebasePathFromUrl(job.zipUrl);
        if (filePath) {
          deletionPromises.push(
            this.deleteFileWithRetry(filePath, 'ZIP archive')
          );
        } else {
          logger.warn(`⚠️ Could not extract path from ZIP URL: ${job.zipUrl}`);
        }
      }

      // 4. Delete thumbnail files
      if (job.thumbnailUrls) {
        let thumbnailCount = 0;

        // Individual thumbnails
        if (job.thumbnailUrls.individual && job.thumbnailUrls.individual.length > 0) {
          thumbnailCount += job.thumbnailUrls.individual.length;
          for (const thumbUrl of job.thumbnailUrls.individual) {
            const filePath = this.extractFirebasePathFromUrl(thumbUrl);
            if (filePath) {
              deletionPromises.push(
                this.deleteFileWithRetry(filePath, 'individual thumbnail')
              );
            }
          }
        }

        // Sprite sheet
        if (job.thumbnailUrls.sprite) {
          thumbnailCount++;
          const filePath = this.extractFirebasePathFromUrl(job.thumbnailUrls.sprite);
          if (filePath) {
            deletionPromises.push(
              this.deleteFileWithRetry(filePath, 'sprite sheet')
            );
          }
        }

        // VTT file
        if (job.thumbnailUrls.vtt) {
          thumbnailCount++;
          const filePath = this.extractFirebasePathFromUrl(job.thumbnailUrls.vtt);
          if (filePath) {
            deletionPromises.push(
              this.deleteFileWithRetry(filePath, 'VTT file')
            );
          }
        }

        // ZIP of thumbnails
        if (job.thumbnailUrls.zip) {
          thumbnailCount++;
          const filePath = this.extractFirebasePathFromUrl(job.thumbnailUrls.zip);
          if (filePath) {
            deletionPromises.push(
              this.deleteFileWithRetry(filePath, 'thumbnails ZIP')
            );
          }
        }

        // Custom thumbnails
        if (job.thumbnailUrls.custom && job.thumbnailUrls.custom.length > 0) {
          thumbnailCount += job.thumbnailUrls.custom.length;
          for (const customThumb of job.thumbnailUrls.custom) {
            if (customThumb.url) {
              const filePath = this.extractFirebasePathFromUrl(customThumb.url);
              if (filePath) {
                deletionPromises.push(
                  this.deleteFileWithRetry(filePath, `custom thumbnail: ${customThumb.timestamp}`)
                );
              }
            }
          }
        }

        if (thumbnailCount > 0) {
          logger.info(`🖼️ Found ${thumbnailCount} thumbnail files to delete`);
        }
      }

      logger.info(`📋 Total files scheduled for deletion: ${deletionPromises.length}`);

      // Execute all deletions with better error handling
      if (deletionPromises.length === 0) {
        logger.info(`ℹ️ No files found to delete for job ${job._id}`);
        return;
      }

      const results = await Promise.allSettled(deletionPromises);
      
      // Analyze results with improved logic
      let successCount = 0;
      let alreadyDeletedCount = 0;
      let actualFailureCount = 0;
      
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          if (result.value === 'already-deleted') {
            alreadyDeletedCount++;
          } else {
            successCount++;
          }
        } else {
          // Check if it's a "file not found" error which should be treated as success
          const error = result.reason;
          if (this.isFileNotFoundError(error)) {
            alreadyDeletedCount++;
            logger.debug(`ℹ️ File already deleted: ${error.message}`);
          } else {
            actualFailureCount++;
            logger.warn(`⚠️ File deletion failed: ${error.message}`);
          }
        }
      });

      const totalSuccess = successCount + alreadyDeletedCount;
      
      logger.info(`📊 Job ${job._id} file deletion summary: ${successCount} deleted, ${alreadyDeletedCount} already gone, ${actualFailureCount} failed`);

      // Only throw error if there are significant actual failures
      // Allow up to 10% failure rate for edge cases (reduced from 20%)
      const failureRate = actualFailureCount / deletionPromises.length;
      if (actualFailureCount > 0 && failureRate > 0.1) {
        throw new Error(`Too many file deletions failed: ${actualFailureCount}/${deletionPromises.length} (${Math.round(failureRate * 100)}% failure rate)`);
      }

      if (actualFailureCount > 0) {
        logger.warn(`⚠️ Some files failed to delete but within acceptable limits: ${actualFailureCount}/${deletionPromises.length}`);
      }

    } catch (error) {
      logger.error(`❌ Error deleting files for job ${job._id}:`, error);
      throw error;
    }
  }

  // Enhanced file deletion with better error handling
  async deleteFileWithRetry(filePath, description) {
    try {
      if (!filePath || filePath.trim() === '') {
        logger.warn(`⚠️ Empty file path provided for ${description}`);
        return 'already-deleted';
      }

      // Log the deletion attempt
      logger.debug(`🗑️ Attempting to delete ${description}: ${filePath}`);

      await deleteFromFirebase(filePath);
      logger.debug(`✅ Successfully deleted ${description}: ${filePath}`);
      return 'deleted';
    } catch (error) {
      // Enhanced error checking for file not found
      if (this.isFileNotFoundError(error)) {
        logger.debug(`ℹ️ File already deleted: ${description}: ${filePath}`);
        return 'already-deleted';
      }
      
      logger.error(`❌ Failed to delete ${description}: ${filePath}`, error);
      throw error;
    }
  }

  // Enhanced method to check if error indicates file not found
  isFileNotFoundError(error) {
    if (!error) return false;
    
    const errorMessage = error.message || '';
    const errorCode = error.code || '';
    
    // Check various formats of "file not found" errors
    return (
      errorCode === 'storage/object-not-found' ||
      errorCode === 'object-not-found' ||
      errorMessage.includes('does not exist') ||
      errorMessage.includes('object-not-found') ||
      errorMessage.includes('No such object') ||
      errorMessage.includes('not found') ||
      error.status === 404
    );
  }

  // Enhanced path extraction with better validation
  extractFirebasePathFromUrl(downloadUrl) {
    try {
      if (!downloadUrl || typeof downloadUrl !== 'string') {
        logger.warn(`⚠️ Invalid URL provided: ${downloadUrl}`);
        return null;
      }

      const url = new URL(downloadUrl);
      
      // For Firebase Storage URLs
      if (url.hostname.includes('firebasestorage.googleapis.com')) {
        // Handle both /o/ and /v0/b/ URL formats
        let pathMatch;
        
        // Format 1: /v0/b/bucket/o/path?alt=media&token=...
        if (url.pathname.includes('/o/')) {
          pathMatch = url.pathname.match(/\/o\/(.+?)(?:\?|$)/);
        }
        
        // Format 2: Direct storage URLs
        if (!pathMatch && url.pathname.startsWith('/v0/b/')) {
          // Extract everything after /o/ or handle direct paths
          const parts = url.pathname.split('/o/');
          if (parts.length > 1) {
            pathMatch = [null, parts[1]];
          }
        }
        
        if (pathMatch && pathMatch[1]) {
          // Decode the URL-encoded path
          let decodedPath = decodeURIComponent(pathMatch[1]);
          
          // Remove query parameters if any remain
          decodedPath = decodedPath.split('?')[0];
          
          logger.debug(`📍 Extracted Firebase path: ${decodedPath}`);
          return decodedPath;
        }
        
        // Fallback: try to extract from search params
        const encodedPath = url.searchParams.get('name');
        if (encodedPath) {
          const decodedPath = decodeURIComponent(encodedPath);
          logger.debug(`📍 Extracted Firebase path from params: ${decodedPath}`);
          return decodedPath;
        }
      }
      
      // For direct URLs, extract path from pathname
      if (url.pathname.startsWith('/transcoded/')) {
        const path = url.pathname.substring(1); // Remove leading slash
        logger.debug(`📍 Extracted direct path: ${path}`);
        return path;
      }
      
      logger.warn(`⚠️ Could not extract path from URL: ${downloadUrl}`);
      logger.debug(`🔍 URL analysis - hostname: ${url.hostname}, pathname: ${url.pathname}, search: ${url.search}`);
      return null;
    } catch (error) {
      logger.warn(`⚠️ Error parsing URL: ${downloadUrl} - ${error.message}`);
      return null;
    }
  }

  // Utility function for delays
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Manual cleanup trigger for testing
  async manualCleanup() {
    if (this.isRunning) {
      logger.warn('⚠️ Cleanup job already running');
      return { success: false, message: 'Cleanup already in progress' };
    }

    try {
      this.isRunning = true;
      logger.info('🔧 Manual cleanup triggered');
      await this.cleanupExpiredVideos();
      return { success: true, message: 'Manual cleanup completed' };
    } catch (error) {
      logger.error('❌ Manual cleanup failed:', error);
      return { success: false, message: error.message };
    } finally {
      this.isRunning = false;
    }
  }

  // Test path extraction with sample URLs
  testPathExtraction() {
    const testUrls = [
      'https://firebasestorage.googleapis.com/v0/b/blog-app-5ed76.appspot.com/o/transcoded%2F6848c93873f5eb81a511c852%2F6848c990f51f27cfca4e2a0f%2Fvideo_1749600656300.mp4?alt=media&token=44be0bc5-a70f-4885-9a43-25cb6e1c9608',
      'https://firebasestorage.googleapis.com/v0/b/blog-app-5ed76.appspot.com/o/transcoded%2F6848c93873f5eb81a511c852%2F6848c990f51f27cfca4e2a0f%2Fthumbnails%2Fsprite.jpg?alt=media&token=0f16a012-4bed-4766-950d-ff0ae01255f4',
      'https://firebasestorage.googleapis.com/v0/b/blog-app-5ed76.appspot.com/o/transcoded%2F6848c93873f5eb81a511c852%2F6848c990f51f27cfca4e2a0f%2Fthumbnails%2Fthumbnails.vtt?alt=media&token=bccf9f50-4ac7-4a6d-8cd7-1bff9a34dcbb'
    ];

    logger.info('🧪 Testing path extraction...');
    testUrls.forEach((url, index) => {
      const extractedPath = this.extractFirebasePathFromUrl(url);
      logger.info(`Test ${index + 1}: ${extractedPath ? '✅' : '❌'} ${extractedPath || 'FAILED'}`);
    });
  }

  // Get cleanup statistics
  async getCleanupStats() {
    try {
      const stats = await Job.aggregate([
        {
          $group: {
            _id: '$cleanupStatus',
            count: { $sum: 1 }
          }
        }
      ]);

      const expiredCount = await Job.countDocuments({ status: 'expired' });
      const pendingCleanup = await Job.countDocuments({
        status: 'completed',
        completedAt: { $lt: new Date(Date.now() - (60 * 60 * 1000)) },
        $or: [
          { cleanupStatus: { $exists: false } },
          { cleanupStatus: 'pending' }
        ]
      });

      return {
        expired: expiredCount,
        pendingCleanup,
        cleanupStats: stats
      };
    } catch (error) {
      logger.error('Error getting cleanup stats:', error);
      return null;
    }
  }
}

module.exports = new CleanupService();