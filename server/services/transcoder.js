
/**
 * Enhanced FFmpeg Progress Tracking with Dynamic Phase Allocation
 * Removed artificial caps and added intelligent progress distribution
 */
const path = require('path');
const fs = require('fs');
const { promisify } = require('util');
const { v4: uuidv4 } = require('uuid');
const Docker = require('dockerode');
const archiver = require('archiver');
const Setting = require('../models/setting');
const Job = require('../models/job');
const storageService = require('./storage');
const thumbnailService = require('./thumbnailService');
const logger = require('../utils/logger');
const ffmpegHelpers = require('../utils/ffmpeg');

// Promisify fs functions
const stat = promisify(fs.stat);
const mkdir = promisify(fs.mkdir);
const readdir = promisify(fs.readdir);
const unlink = promisify(fs.unlink);
const rmdir = promisify(fs.rmdir);
const writeFile = promisify(fs.writeFile);

// Initialize Docker client
const docker = new Docker();

/**
 * Dynamic Phase Allocation Calculator
 * Intelligently distributes progress based on job complexity
 */
const calculatePhaseWeights = (job, videoMetadata, fileSize) => {
  const phases = {
    download: 2,      // Base: 2%
    metadata: 1,      // Base: 1%
    watermark: 0,     // Conditional
    transcoding: 70,  // Base: 70%
    thumbnails: 0,    // Conditional
    audio: 0,         // Conditional
    upload: 5,        // Base: 5%
    finalization: 2   // Base: 2%
  };

  let totalAllocated = phases.download + phases.metadata + phases.upload + phases.finalization;

  // Dynamic download weight based on file size
  if (fileSize) {
    const fileSizeMB = fileSize / (1024 * 1024);
    if (fileSizeMB > 1000) phases.download = 5;      // Large files: 5%
    else if (fileSizeMB > 500) phases.download = 3;   // Medium files: 3%
    // Small files keep 2%
  }

  // Watermark download weight
  if (job.outputOptions?.watermark?.imageUrl) {
    phases.watermark = 1;
    totalAllocated += 1;
  }

  // Transcoding weight based on complexity
  let transcodingComplexity = 1;
  
  // Resolution complexity
  const resolutionCount = job.outputOptions?.resolutions?.length || 1;
  if (resolutionCount > 1) {
    transcodingComplexity *= (1 + (resolutionCount - 1) * 0.3); // +30% per additional resolution
  }

  // Format complexity
  const isStreamingFormat = ['hls', 'dash'].includes(job.outputFormat);
  if (isStreamingFormat) {
    transcodingComplexity *= 1.2; // +20% for streaming formats
  }

  // Encoding complexity
  if (job.outputOptions?.twoPass) {
    transcodingComplexity *= 1.8; // +80% for two-pass encoding
  }

  if (job.outputOptions?.videoCodec === 'h265' || job.outputOptions?.videoCodec === 'av1') {
    transcodingComplexity *= 1.4; // +40% for advanced codecs
  }

  // Crop/watermark processing complexity
  if (job.outputOptions?.crop?.enabled || job.outputOptions?.watermark?.imageUrl) {
    transcodingComplexity *= 1.1; // +10% for video filters
  }

  // Video duration complexity
  if (videoMetadata?.duration) {
    if (videoMetadata.duration > 3600) transcodingComplexity *= 1.2; // +20% for videos > 1 hour
    else if (videoMetadata.duration > 1800) transcodingComplexity *= 1.1; // +10% for videos > 30 min
  }

  // Calculate base transcoding weight (minimum 40%, maximum 85%)
  phases.transcoding = Math.max(40, Math.min(85, Math.round(phases.transcoding * transcodingComplexity)));

  // Thumbnail weight based on settings
  if (job.outputOptions?.thumbnails?.enabled) {
    const thumbnailParams = job.getThumbnailParameters(videoMetadata?.duration || 300);
    if (thumbnailParams) {
      let thumbnailWeight = 8; // Base: 8%
      
      // Adjust based on thumbnail count
      if (thumbnailParams.totalThumbnails > 50) thumbnailWeight = 15;      // Many thumbnails: 15%
      else if (thumbnailParams.totalThumbnails > 20) thumbnailWeight = 12; // Moderate: 12%
      
      // Adjust based on sprite generation
      if (thumbnailParams.generateSprite) thumbnailWeight += 3; // +3% for sprite sheet
      if (thumbnailParams.generateVTT) thumbnailWeight += 1;    // +1% for VTT
      
      phases.thumbnails = thumbnailWeight;
      totalAllocated += thumbnailWeight;
    }
  }

  // Audio extraction weight
  if (job.outputOptions?.extractAudio && job.outputOptions?.audioFormat !== 'none') {
    phases.audio = 5; // 5% for audio extraction
    totalAllocated += 5;
  }

  // Adjust upload weight based on output complexity
  let uploadComplexity = 1;
  if (isStreamingFormat && resolutionCount > 1) {
    uploadComplexity = 1.5 + (resolutionCount * 0.2); // More files to upload
  }
  if (phases.thumbnails > 0) {
    uploadComplexity += 0.3; // Additional thumbnail uploads
  }
  
  phases.upload = Math.round(phases.upload * uploadComplexity);
  
  // Recalculate transcoding to fit remaining space
  const remainingSpace = 100 - (totalAllocated + phases.audio + phases.upload);
  if (remainingSpace > 0) {
    phases.transcoding = Math.max(phases.transcoding, remainingSpace);
  }

  // Ensure total is exactly 100%
  const actualTotal = Object.values(phases).reduce((sum, weight) => sum + weight, 0);
  if (actualTotal !== 100) {
    const adjustment = 100 - actualTotal;
    phases.transcoding += adjustment; // Adjust transcoding to make total 100%
  }

  logger.info(`Dynamic phase allocation:`, phases);
  logger.info(`Transcoding complexity factor: ${transcodingComplexity.toFixed(2)}`);
  
  return phases;
};

/**
 * Enhanced Progress Tracker with no artificial caps
 */
class ProgressTracker {
  constructor(phaseWeights, globalCallback) {
    this.phases = phaseWeights;
    this.globalCallback = globalCallback;
    this.currentPhase = null;
    this.completedWeight = 0;
    this.lastReportedProgress = 0;
  }

  startPhase(phaseName) {
    if (this.currentPhase) {
      // Complete previous phase
      this.completedWeight += this.phases[this.currentPhase] || 0;
    }
    
    this.currentPhase = phaseName;
    logger.info(`Starting phase: ${phaseName} (${this.phases[phaseName] || 0}% allocation)`);
  }

  updatePhase(phaseProgress) {
    if (!this.currentPhase) return;

    // Remove artificial caps - let phase progress go to 100%
    const clampedPhaseProgress = Math.max(0, Math.min(100, phaseProgress));
    
    const phaseWeight = this.phases[this.currentPhase] || 0;
    const phaseContribution = (clampedPhaseProgress / 100) * phaseWeight;
    const totalProgress = this.completedWeight + phaseContribution;
    
    // Only update if progress increased meaningfully
    if (totalProgress > this.lastReportedProgress + 0.5) {
      const roundedProgress = Math.min(100, Math.round(totalProgress));
      
      if (this.globalCallback) {
        this.globalCallback(roundedProgress);
      }
      
      this.lastReportedProgress = roundedProgress;
      
      logger.debug(`Phase ${this.currentPhase}: ${clampedPhaseProgress.toFixed(1)}% → Global: ${roundedProgress}%`);
    }
  }

  completePhase() {
    if (this.currentPhase) {
      this.updatePhase(100); // Ensure phase completes to 100%
      this.completedWeight += this.phases[this.currentPhase] || 0;
      logger.info(`Completed phase: ${this.currentPhase}`);
      this.currentPhase = null;
    }
  }

  complete() {
    this.completePhase();
    if (this.globalCallback) {
      this.globalCallback(100);
    }
    logger.info('All phases completed - 100%');
  }
}

/**
 * Enhanced FFmpeg progress parsing with multiple patterns
 */
const parseFFmpegProgress = (output, videoDuration) => {
  const progressData = {
    frame: 0,
    fps: 0,
    time: 0,
    size: 0,
    bitrate: 0,
    speed: 0,
    progress: 0
  };

  try {
    // Pattern 1: Standard FFmpeg output
    const standardPattern = /frame=\s*(\d+).*?fps=\s*([\d.]+).*?size=\s*(\d+).*?time=(\d{2}):(\d{2}):(\d{2})\.(\d{2}).*?bitrate=\s*([\d.]+).*?speed=\s*([\d.]+)/;
    const standardMatch = output.match(standardPattern);
    
    if (standardMatch) {
      const hours = parseInt(standardMatch[4]);
      const minutes = parseInt(standardMatch[5]);
      const seconds = parseInt(standardMatch[6]);
      const centiseconds = parseInt(standardMatch[7]);
      
      progressData.frame = parseInt(standardMatch[1]);
      progressData.fps = parseFloat(standardMatch[2]);
      progressData.time = hours * 3600 + minutes * 60 + seconds + centiseconds / 100;
      progressData.size = parseInt(standardMatch[3]);
      progressData.bitrate = parseFloat(standardMatch[8]);
      progressData.speed = parseFloat(standardMatch[9]);
      
      if (videoDuration && videoDuration > 0) {
        progressData.progress = Math.min((progressData.time / videoDuration) * 100, 100);
      }
      
      return progressData;
    }

    // Pattern 2: Simple time pattern
    const timePattern = /time=(\d{2}):(\d{2}):(\d{2})\.(\d{2})/;
    const timeMatch = output.match(timePattern);
    
    if (timeMatch) {
      const hours = parseInt(timeMatch[1]);
      const minutes = parseInt(timeMatch[2]);
      const seconds = parseInt(timeMatch[3]);
      const centiseconds = parseInt(timeMatch[4]);
      
      progressData.time = hours * 3600 + minutes * 60 + seconds + centiseconds / 100;
      
      if (videoDuration && videoDuration > 0) {
        progressData.progress = Math.min((progressData.time / videoDuration) * 100, 100);
      }
      
      return progressData;
    }

    // Pattern 3: Frame count pattern
    const framePattern = /frame=\s*(\d+)/;
    const frameMatch = output.match(framePattern);
    
    if (frameMatch) {
      progressData.frame = parseInt(frameMatch[1]);
      
      if (videoDuration && videoDuration > 0) {
        const expectedFrames = Math.ceil(videoDuration * 30);
        progressData.progress = Math.min((progressData.frame / expectedFrames) * 100, 100);
      }
      
      return progressData;
    }

    // Pattern 4: Progress file format
    const progressFilePattern = /out_time_ms=(\d+)/;
    const progressFileMatch = output.match(progressFilePattern);
    
    if (progressFileMatch) {
      const timeMs = parseInt(progressFileMatch[1]);
      progressData.time = timeMs / 1000000;
      
      if (videoDuration && videoDuration > 0) {
        progressData.progress = Math.min((progressData.time / videoDuration) * 100, 100);
      }
      
      return progressData;
    }

  } catch (error) {
    logger.warn(`Error parsing FFmpeg progress: ${error.message}`);
  }

  return null;
};

/**
 * Enhanced video metadata extraction
 */
const getVideoMetadata = async (inputFilePath) => {
  try {
    logger.info(`Getting video metadata for: ${inputFilePath}`);
    
    const cmdArgs = [
      '-v', 'quiet',
      '-print_format', 'json',
      '-show_format',
      '-show_streams',
      `/input/${path.basename(inputFilePath)}`
    ];
    
    let container = await docker.createContainer({
      Image: 'jrottenberg/ffmpeg:latest',
      Cmd: ['ffprobe'].concat(cmdArgs),
      HostConfig: {
        Binds: [
          `${path.dirname(inputFilePath)}:/input:ro`
        ],
        Memory: 512 * 1024 * 1024,
        CpuShares: 512
      },
      WorkingDir: '/input'
    });
    
    await container.start();
    
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('FFprobe timeout')), 30000);
    });
    
    const resultPromise = container.wait();
    const result = await Promise.race([resultPromise, timeoutPromise]);
    
    const logStream = await container.logs({
      stdout: true,
      stderr: true
    });
    
    const output = logStream.toString();
    await container.remove();
    
    if (result.StatusCode === 0 && output.trim().length > 0) {
      try {
        let jsonStr = output.trim();
        
        const jsonStart = jsonStr.indexOf('{');
        const jsonEnd = jsonStr.lastIndexOf('}');
        
        if (jsonStart >= 0 && jsonEnd > jsonStart) {
          jsonStr = jsonStr.substring(jsonStart, jsonEnd + 1);
        }
        
        const metadata = JSON.parse(jsonStr);
        const videoStream = metadata.streams.find(stream => stream.codec_type === 'video');
        const format = metadata.format;
        
        if (videoStream && format) {
          const videoMetadata = {
            duration: parseFloat(format.duration) || parseFloat(videoStream.duration) || 0,
            width: videoStream.width || 1920,
            height: videoStream.height || 1080,
            frameRate: eval(videoStream.r_frame_rate) || 30,
            bitrate: parseInt(format.bit_rate) || 0,
            codec: videoStream.codec_name || 'unknown',
            pixelFormat: videoStream.pix_fmt || 'unknown',
            totalFrames: videoStream.nb_frames ? parseInt(videoStream.nb_frames) : null
          };
          
          logger.info(`Video metadata successfully extracted:`, videoMetadata);
          return videoMetadata;
        }
      } catch (parseError) {
        logger.error(`Error parsing FFprobe JSON output: ${parseError.message}`);
      }
    }
    
    return await getVideoDurationSimple(inputFilePath);
    
  } catch (error) {
    logger.error(`Error getting video metadata: ${error.message}`);
    return {
      duration: 60,
      width: 1920,
      height: 1080,
      frameRate: 30,
      bitrate: 5000000,
      codec: 'unknown',
      pixelFormat: 'yuv420p',
      totalFrames: null
    };
  }
};

/**
 * Enhanced FFmpeg runner with real-time progress tracking
 */
const runFFmpegWithProgress = async (cmdArgs, inputDir, outputDir, videoDuration, progressCallback, watermarkPath = null, operationType = 'transcoding') => {
  try {
    logger.info(`Starting FFmpeg operation: ${operationType}`);
    logger.info(`Command: ffmpeg ${cmdArgs.join(' ')}`);
    
    const binds = [
      `${inputDir}:/input:ro`,
      `${outputDir}:/output:rw`
    ];
    
    if (watermarkPath) {
      logger.info(`Watermark available at: /input/${path.basename(watermarkPath)}`);
    }

    const enhancedCmdArgs = [...cmdArgs];
    
    if (operationType === 'thumbnails' && !enhancedCmdArgs.includes('-progress')) {
      enhancedCmdArgs.splice(-1, 0, '-progress', '/output/progress.txt');
    }

    const container = await docker.createContainer({
      Image: 'jrottenberg/ffmpeg:latest',
      Cmd: enhancedCmdArgs,
      HostConfig: {
        Binds: binds,
        Memory: 2 * 1024 * 1024 * 1024,
        CpuShares: 1024,
        NetworkMode: 'none'
      },
      Tty: false,
      AttachStdout: true,
      AttachStderr: true
    });
    
    await container.start();
    
    return new Promise(async (resolve, reject) => {
      let lastProgress = 0;
      let outputBuffer = '';
      let startTime = Date.now();
      let lastUpdateTime = Date.now();
      let progressUpdateInterval;
      
      try {
        const logStream = await container.logs({
          follow: true,
          stdout: true,
          stderr: true,
          timestamps: false
        });
        
        const processData = (data) => {
          const chunk = data.toString();
          outputBuffer += chunk;
          
          const lines = chunk.split('\n');
          
          for (const line of lines) {
            if (line.trim()) {
              const progressData = parseFFmpegProgress(line, videoDuration);
              
              if (progressData && progressData.progress > 0) {
                const currentProgress = progressData.progress; // No artificial rounding
                const now = Date.now();
                
                if (currentProgress > lastProgress || (now - lastUpdateTime) > 2000) {
                  lastProgress = currentProgress;
                  lastUpdateTime = now;
                  
                  logger.debug(`FFmpeg ${operationType}: ${currentProgress.toFixed(1)}% (${progressData.time?.toFixed(1)}s / ${videoDuration?.toFixed(1)}s)`);
                  
                  if (progressCallback) {
                    progressCallback(currentProgress);
                  }
                }
              }
            }
          }
        };
        
        // Intelligent fallback progress for operations without clear duration
        if (!videoDuration || videoDuration <= 0) {
          const progressRates = {
            'thumbnails': 8,        // 8% per second
            'metadata': 20,         // 20% per second  
            'audio-extraction': 15, // 15% per second
            'transcoding': 3        // 3% per second
          };
          
          const rate = progressRates[operationType] || 3;
          
          progressUpdateInterval = setInterval(() => {
            const elapsedSeconds = (Date.now() - startTime) / 1000;
            const estimatedProgress = Math.min(elapsedSeconds * rate, 95); // Cap at 95% until completion
            
            if (estimatedProgress > lastProgress) {
              lastProgress = estimatedProgress;
              if (progressCallback) {
                progressCallback(estimatedProgress);
              }
            }
          }, 1000);
        }
        
        if (logStream && typeof logStream.on === 'function') {
          logStream.on('data', processData);
          
          logStream.on('end', async () => {
            if (progressUpdateInterval) {
              clearInterval(progressUpdateInterval);
            }
            
            const result = await container.wait();
            const exitCode = result.StatusCode;
            
            await container.remove();
            
            if (exitCode !== 0) {
              logger.error(`FFmpeg ${operationType} failed with exit code ${exitCode}`);
              logger.error(`FFmpeg output: ${outputBuffer.slice(-2000)}`);
              return reject(new Error(`FFmpeg ${operationType} failed with exit code ${exitCode}`));
            }
            
            if (progressCallback) {
              progressCallback(100); // Always complete to 100%
            }
            resolve();
          });
          
          logStream.on('error', (err) => {
            logger.error(`FFmpeg ${operationType} stream error: ${err.message}`);
            if (progressUpdateInterval) {
              clearInterval(progressUpdateInterval);
            }
            reject(err);
          });
        } else {
          // Fallback method
          const result = await container.wait();
          const exitCode = result.StatusCode;
          
          if (progressUpdateInterval) {
            clearInterval(progressUpdateInterval);
          }
          
          await container.remove();
          
          if (exitCode !== 0) {
            const finalLogs = await container.logs({ stdout: true, stderr: true });
            logger.error(`FFmpeg ${operationType} failed: ${finalLogs.toString().slice(-1000)}`);
            return reject(new Error(`FFmpeg ${operationType} failed with exit code ${exitCode}`));
          }
          
          if (progressCallback) {
            progressCallback(100);
          }
          resolve();
        }
      } catch (streamError) {
        logger.error(`Error in FFmpeg ${operationType}: ${streamError.message}`);
        
        if (progressUpdateInterval) {
          clearInterval(progressUpdateInterval);
        }
        
        try {
          const result = await container.wait();
          await container.remove();
          
          if (result.StatusCode !== 0) {
            return reject(new Error(`FFmpeg ${operationType} failed`));
          }
          
          if (progressCallback) {
            progressCallback(100);
          }
          resolve();
        } catch (fallbackError) {
          reject(fallbackError);
        }
      }
    });
  } catch (error) {
    logger.error(`Docker error in ${operationType}: ${error.message}`);
    throw error;
  }
};

/**
 * Process a transcoding job with dynamic phase allocation and enhanced progress tracking
 */
const processJob = async (jobId, progressCallback) => {
  const job = await Job.findById(jobId);
  if (!job) {
    throw new Error(`Job not found: ${jobId}`);
  }
  
  logger.info(`Processing job ${jobId} with dynamic phase allocation`);
  
  const settings = await Setting.getSettings();
  
  const workDir = path.join(settings.tempPath, `job-${jobId}-${uuidv4()}`);
  await storageService.ensureTempDir(workDir);
  
  const inputDir = path.join(workDir, 'input');
  const outputDir = path.join(workDir, 'output');
  await storageService.ensureTempDir(inputDir);
  await storageService.ensureTempDir(outputDir);
  
  let watermarkPath = null;
  let progressTracker = null;
  
  try {
    const timestamp = Date.now();
    const outputFormat = job.outputFormat;
    const isHls = outputFormat === 'hls';
    const isDash = outputFormat === 'dash';
    const isStreamingFormat = isHls || isDash;
    const isMultiResolution = job.outputOptions.resolutions && job.outputOptions.resolutions.length > 1;
    
    const sanitizedFileName = isStreamingFormat ? 
      `video_${timestamp}` : 
      `video_${timestamp}.${outputFormat}`;
      
    const inputFilePath = path.join(inputDir, `input_${timestamp}.mp4`);
    
    // Phase 1: Download with progress tracking
    logger.info(`Phase 1: Downloading input file`);
    
    // Create progress callback for download that reports to 0-100% of its allocation
    const downloadProgressCallback = (downloadProgress) => {
      if (progressTracker) {
        progressTracker.updatePhase(downloadProgress);
      }
    };
    
    await storageService.downloadFileWithProgress(job.inputUrl, inputFilePath, downloadProgressCallback);
    
    // Get file stats for dynamic allocation
    const fileStats = await stat(inputFilePath);
    if (fileStats.size === 0) {
      throw new Error('Downloaded file is empty (0 bytes)');
    }
    
    // Phase 2: Extract metadata to get video info for allocation
    logger.info(`Phase 2: Extracting video metadata for dynamic allocation`);
    const videoMetadata = await getVideoMetadata(inputFilePath);
    
    // Calculate dynamic phase weights based on job complexity
    const phaseWeights = calculatePhaseWeights(job, videoMetadata, fileStats.size);
    
    // Initialize progress tracker with dynamic weights
    progressTracker = new ProgressTracker(phaseWeights, progressCallback);
    
    // Start download phase retroactively (already completed)
    progressTracker.startPhase('download');
    progressTracker.completePhase();
    
    // Complete metadata phase
    progressTracker.startPhase('metadata');
    progressTracker.completePhase();
    
    // Phase 3: Download watermark if needed
    if (job.outputOptions?.watermark?.imageUrl) {
      progressTracker.startPhase('watermark');
      logger.info(`Downloading watermark image`);
      
      const watermarkProgressCallback = (progress) => progressTracker.updatePhase(progress);
      watermarkPath = await downloadWatermarkImageWithProgress(
        job.outputOptions.watermark.imageUrl, inputDir, watermarkProgressCallback);
      
      progressTracker.completePhase();
    }
    
    // Phase 4: Transcoding with dynamic allocation
    progressTracker.startPhase('transcoding');
    logger.info(`Starting transcoding with ${phaseWeights.transcoding}% allocation`);
    
    const transcodingProgressCallback = (progress) => progressTracker.updatePhase(progress);
    
    let result = {};
    
    if (isStreamingFormat) {
      if (isMultiResolution) {
        result = await processMultiResolutionStreaming(
          job, settings, inputFilePath, outputDir, 
          transcodingProgressCallback, 
          videoMetadata, watermarkPath);
      } else {
        result = await processSingleResolutionStreaming(
          job, settings, inputFilePath, outputDir, 
          transcodingProgressCallback, 
          videoMetadata, watermarkPath);
      }
    } else {
      result = await processRegularFormat(
        job, settings, inputFilePath, outputDir, 
        transcodingProgressCallback, 
        sanitizedFileName, videoMetadata, watermarkPath);
    }
    
    progressTracker.completePhase();
    
    // Phase 5: Audio extraction if requested
    if (phaseWeights.audio > 0) {
      progressTracker.startPhase('audio');
      logger.info(`Extracting audio with ${phaseWeights.audio}% allocation`);
      
      const audioProgressCallback = (progress) => progressTracker.updatePhase(progress);
      
      const audioResult = await extractAudio(
        job, settings, inputFilePath, outputDir, timestamp, videoMetadata, audioProgressCallback);
      
      if (result.outputUrls && !result.outputUrls.find(url => url.resolution === 'audio')) {
        result.outputUrls.push({
          resolution: 'audio',
          url: audioResult.audioUrl
        });
      }
      
      progressTracker.completePhase();
    }
    
    // Phase 6: Thumbnail generation if enabled
    if (phaseWeights.thumbnails > 0) {
      progressTracker.startPhase('thumbnails');
      logger.info(`Generating thumbnails with ${phaseWeights.thumbnails}% allocation`);
      
      const thumbnailProgressCallback = (progress) => progressTracker.updatePhase(progress);
      
      try {
        const thumbnailResult = await thumbnailService.generateThumbnails(
          inputFilePath, outputDir, job, videoMetadata, thumbnailProgressCallback
        );
        
        if (thumbnailResult) {
          const thumbnailUrls = await thumbnailService.uploadThumbnails(
            thumbnailResult, storageService, job.userId, job._id);
          
          result.thumbnailUrls = thumbnailUrls;
          
          await thumbnailService.cleanupThumbnails(thumbnailResult.thumbnailsDir);
        }
        
        progressTracker.completePhase();
      } catch (thumbnailError) {
        logger.error(`Error generating thumbnails: ${thumbnailError.message}`);
        progressTracker.completePhase(); // Complete phase even on error
      }
    }
    
    // Phase 7: Upload with progress tracking
    progressTracker.startPhase('upload');
    logger.info(`Uploading results with ${phaseWeights.upload}% allocation`);
    
    const uploadProgressCallback = (progress) => progressTracker.updatePhase(progress);
    
    // Create ZIP file for streaming formats
    if (isStreamingFormat) {
      const zipFileName = `${sanitizedFileName}_${outputFormat}.zip`;
      const zipFilePath = path.join(workDir, zipFileName);
      
      await createZipArchive(outputDir, zipFilePath);
      
      const zipDestPath = `transcoded/${job.userId}/${jobId}/${zipFileName}`;
      const zipUrl = await storageService.uploadToFirebaseWithProgress(
        zipFilePath, zipDestPath, uploadProgressCallback);
      
      result.zipUrl = zipUrl;
    }
    
    progressTracker.completePhase();
    
    // Phase 8: Finalization
    progressTracker.startPhase('finalization');
    logger.info(`Finalizing job`);
    
    await cleanupJobFiles(workDir);
    
    progressTracker.complete();
    
    return result;
  } catch (error) {
    logger.error(`Error processing job ${jobId}: ${error.message}`);
    await cleanupJobFiles(workDir);
    throw error;
  }
};

// Download watermark with progress tracking
const downloadWatermarkImageWithProgress = async (watermarkUrl, inputDir, progressCallback) => {
  try {
    const timestamp = Date.now();
    const fileExtension = path.extname(new URL(watermarkUrl).pathname) || '.png';
    const watermarkFileName = `watermark_${timestamp}${fileExtension}`;
    const watermarkPath = path.join(inputDir, watermarkFileName);
    
    logger.info(`Downloading watermark from: ${watermarkUrl}`);
    
    await storageService.downloadFileWithProgress(watermarkUrl, watermarkPath, progressCallback);
    
    const fileStats = await stat(watermarkPath);
    if (fileStats.size === 0) {
      throw new Error('Downloaded watermark file is empty');
    }
    
    logger.info(`Watermark downloaded: ${watermarkPath} (${fileStats.size} bytes)`);
    return watermarkPath;
  } catch (error) {
    logger.error(`Error downloading watermark: ${error.message}`);
    throw new Error(`Failed to download watermark: ${error.message}`);
  }
};

// Enhanced regular format processing
const processRegularFormat = async (job, settings, inputFilePath, outputDir, progressCallback, sanitizedFileName, videoMetadata, watermarkPath = null) => {
  const outputFilePath = path.join(outputDir, sanitizedFileName);
  const options = job.outputOptions;
  
  if (options.crf !== undefined && options.twoPass === true) {
    logger.warn('CRF and two-pass encoding are incompatible. Disabling two-pass.');
    options.twoPass = false;
  }
  
  const isTwoPass = options.twoPass === true && options.crf === undefined;
  
  const cmdArgs = ffmpegHelpers.buildDirectConversionCommand(
    path.basename(inputFilePath), 
    sanitizedFileName, 
    job,
    watermarkPath
  );
  
  if (isTwoPass) {
    // First pass: 0-50% of transcoding progress
    const firstPassCallback = (progress) => progressCallback(progress / 2);
    
    await runFFmpegWithProgress(
      cmdArgs, 
      path.dirname(inputFilePath), 
      outputDir, 
      videoMetadata ? videoMetadata.duration : null,
      firstPassCallback,
      watermarkPath,
      'transcoding-pass1'
    );
    
    // Second pass: 50-100% of transcoding progress
    const secondPassCallback = (progress) => progressCallback(50 + (progress / 2));
    
    // Build second pass command (implementation depends on your setup)
    await runFFmpegWithProgress(
      cmdArgs, // You'd modify this for second pass
      path.dirname(inputFilePath), 
      outputDir, 
      videoMetadata ? videoMetadata.duration : null,
      secondPassCallback,
      watermarkPath,
      'transcoding-pass2'
    );
  } else {
    await runFFmpegWithProgress(
      cmdArgs, 
      path.dirname(inputFilePath), 
      outputDir, 
      videoMetadata ? videoMetadata.duration : null,
      progressCallback,
      watermarkPath,
      'transcoding'
    );
  }
  
  const outputFiles = await readdir(outputDir);
  
  if (outputFiles.length === 0) {
    throw new Error(`No output files were generated`);
  }
  
  const outputFileFull = path.join(outputDir, outputFiles[0]);
  
  const fileStats = await stat(outputFileFull);
  if (fileStats.size === 0) {
    throw new Error(`Generated file has zero size: ${outputFileFull}`);
  }
  
  const destPath = `transcoded/${job.userId}/${job._id}/${outputFiles[0]}`;
  const downloadURL = await storageService.uploadToFirebase(outputFileFull, destPath);
  
  return {
    outputUrls: [{
      resolution: job.outputOptions.resolutions?.length > 0 
        ? job.outputOptions.resolutions[0].label 
        : 'original',
      url: downloadURL
    }]
  };
};

// Enhanced multi-resolution streaming
const processMultiResolutionStreaming = async (job, settings, inputFilePath, outputDir, progressCallback, videoMetadata, watermarkPath = null) => {
  const outputFormat = job.outputFormat;
  const isHls = outputFormat === 'hls';
  const resolutions = job.outputOptions.resolutions;
  
  const outputUrls = [];
  const resolutionDirs = {};
  
  for (let i = 0; i < resolutions.length; i++) {
    const resolution = resolutions[i];
    const resolutionDir = path.join(outputDir, resolution.label);
    await storageService.ensureTempDir(resolutionDir);
    resolutionDirs[resolution.label] = resolutionDir;
    
    logger.info(`Processing resolution ${i + 1}/${resolutions.length}: ${resolution.label}`);
    
    const cmdArgs = ffmpegHelpers.buildStreamingCommandForResolution(
      inputFilePath, resolutionDir, job, resolution, watermarkPath);
    
    // Per-resolution progress: each resolution gets equal weight
    const resolutionProgressCallback = (ffmpegProgress) => {
      const resolutionWeight = 100 / resolutions.length;
      const currentResolutionProgress = i * resolutionWeight;
      const currentFFmpegProgress = (ffmpegProgress / 100) * resolutionWeight;
      const totalProgress = currentResolutionProgress + currentFFmpegProgress;
      
      progressCallback(totalProgress);
    };
    
    await runFFmpegWithProgress(
      cmdArgs, 
      path.dirname(inputFilePath), 
      resolutionDir, 
      videoMetadata ? videoMetadata.duration : null,
      resolutionProgressCallback,
      watermarkPath,
      `streaming-${resolution.label}`
    );
    
    // Upload files for this resolution
    const resFiles = await readdir(resolutionDir);
    const mainFile = isHls ? resFiles.find(f => f.endsWith('.m3u8')) : resFiles.find(f => f.endsWith('.mpd'));
    
    if (mainFile) {
      const mainFilePath = path.join(resolutionDir, mainFile);
      const destPath = `transcoded/${job.userId}/${job._id}/${resolution.label}/${mainFile}`;
      const downloadURL = await storageService.uploadToFirebase(mainFilePath, destPath);
      
      outputUrls.push({
        resolution: resolution.label,
        url: downloadURL
      });
    }
    
    // Upload all files for this resolution
    for (const file of resFiles) {
      const filePath = path.join(resolutionDir, file);
      const destPath = `transcoded/${job.userId}/${job._id}/${resolution.label}/${file}`;
      await storageService.uploadToFirebase(filePath, destPath);
    }
  }
  
  // Create and upload master playlist
  const masterFile = isHls ? 'master.m3u8' : 'manifest.mpd';
  const masterFilePath = path.join(outputDir, masterFile);
  
  if (isHls) {
    await ffmpegHelpers.createHlsMasterPlaylist(masterFilePath, resolutions);
  } else {
    await ffmpegHelpers.createDashManifest(masterFilePath, resolutions);
  }
  
  const masterDestPath = `transcoded/${job.userId}/${job._id}/${masterFile}`;
  const masterUrl = await storageService.uploadToFirebase(masterFilePath, masterDestPath);
  
  outputUrls.push({
    resolution: 'master',
    url: masterUrl
  });
  
  return {
    outputUrls,
    masterPlaylistUrl: masterUrl
  };
};

// Enhanced single resolution streaming
const processSingleResolutionStreaming = async (job, settings, inputFilePath, outputDir, progressCallback, videoMetadata, watermarkPath = null) => {
  const outputFormat = job.outputFormat;
  const isHls = outputFormat === 'hls';
  const resolution = job.outputOptions.resolutions && job.outputOptions.resolutions.length > 0 
    ? job.outputOptions.resolutions[0] 
    : { width: 1280, height: 720, label: '720p' };
  
  const cmdArgs = ffmpegHelpers.buildStreamingCommandForResolution(
    inputFilePath, outputDir, job, resolution, watermarkPath);
  
  await runFFmpegWithProgress(
    cmdArgs, 
    path.dirname(inputFilePath), 
    outputDir, 
    videoMetadata ? videoMetadata.duration : null,
    progressCallback,
    watermarkPath,
    `streaming-${resolution.label}`
  );
  
  const outputFiles = await readdir(outputDir);
  
  if (outputFiles.length === 0) {
    throw new Error(`No output files were generated`);
  }
  
  const mainFile = isHls ? outputFiles.find(f => f.endsWith('.m3u8')) : outputFiles.find(f => f.endsWith('.mpd'));
  
  if (!mainFile) {
    throw new Error(`No ${isHls ? 'm3u8' : 'mpd'} file was generated`);
  }
  
  const outputUrls = [];
  
  for (const file of outputFiles) {
    const filePath = path.join(outputDir, file);
    const destPath = `transcoded/${job.userId}/${job._id}/${file}`;
    
    const downloadURL = await storageService.uploadToFirebase(filePath, destPath);
    
    if (file === mainFile) {
      outputUrls.push({
        resolution: resolution.label,
        url: downloadURL
      });
    }
  }
  
  return {
    outputUrls,
    masterPlaylistUrl: outputUrls[0]?.url
  };
};

// Enhanced audio extraction
const extractAudio = async (job, settings, inputFilePath, outputDir, timestamp, videoMetadata, progressCallback = null) => {
  const audioFormat = job.outputOptions.audioFormat;
  const audioFileName = `audio_${timestamp}.${audioFormat}`;
  
  const cmdArgs = ffmpegHelpers.buildAudioExtractionCommand(
    path.basename(inputFilePath),
    audioFileName,
    job
  );
  
  await runFFmpegWithProgress(
    cmdArgs,
    path.dirname(inputFilePath),
    outputDir,
    videoMetadata ? videoMetadata.duration : null,
    progressCallback || (() => {}),
    null,
    'audio-extraction'
  );
  
  const audioFilePath = path.join(outputDir, audioFileName);
  const destPath = `transcoded/${job.userId}/${job._id}/${audioFileName}`;
  const audioUrl = await storageService.uploadToFirebase(audioFilePath, destPath);
  
  return { audioUrl };
};

// Fallback simple duration extraction
const getVideoDurationSimple = async (inputFilePath) => {
  try {
    const cmdArgs = [
      '-v', 'error',
      '-select_streams', 'v:0',
      '-show_entries', 'format=duration',
      '-of', 'csv=p=0',
      `/input/${path.basename(inputFilePath)}`
    ];
    
    let container = await docker.createContainer({
      Image: 'jrottenberg/ffmpeg:latest',
      Cmd: ['ffprobe'].concat(cmdArgs),
      HostConfig: {
        Binds: [
          `${path.dirname(inputFilePath)}:/input:ro`
        ],
        Memory: 256 * 1024 * 1024,
        CpuShares: 256
      }
    });
    
    await container.start();
    const result = await container.wait();
    const logStream = await container.logs({
      stdout: true,
      stderr: true
    });
    const output = logStream.toString();
    await container.remove();
    
    if (result.StatusCode === 0) {
      const duration = parseFloat(output.trim());
      if (!isNaN(duration) && duration > 0) {
        return { 
          duration, 
          width: 1920,
          height: 1080,
          frameRate: 30,
          bitrate: 5000000,
          codec: 'unknown',
          pixelFormat: 'yuv420p'
        };
      }
    }
    
    return {
      duration: 60,
      width: 1920,
      height: 1080,
      frameRate: 30,
      bitrate: 5000000,
      codec: 'unknown',
      pixelFormat: 'yuv420p'
    };
    
  } catch (error) {
    logger.error(`Error getting video duration (simplified): ${error.message}`);
    return {
      duration: 60,
      width: 1920,
      height: 1080,
      frameRate: 30,
      bitrate: 5000000,
      codec: 'unknown',
      pixelFormat: 'yuv420p'
    };
  }
};

// Create ZIP archive helper
const createZipArchive = async (sourceDir, zipFilePath) => {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(zipFilePath);
    const archive = archiver('zip', {
      zlib: { level: 9 }
    });
    
    output.on('close', () => {
      logger.info(`ZIP created: ${zipFilePath} (${archive.pointer()} bytes)`);
      resolve(zipFilePath);
    });
    
    archive.on('error', reject);
    
    archive.pipe(output);
    archive.directory(sourceDir, false);
    archive.finalize();
  });
};

// Clean up job files helper
const cleanupJobFiles = async (workDir) => {
  try {
    const deleteDirectory = async (dir) => {
      const entries = await readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          await deleteDirectory(fullPath);
        } else {
          await unlink(fullPath);
        }
      }
      
      await rmdir(dir);
    };
    
    await deleteDirectory(workDir);
    logger.info(`Cleaned up work directory: ${workDir}`);
  } catch (error) {
    logger.warn(`Failed to clean up work directory ${workDir}:`, error);
  }
};

module.exports = {
  processJob
};