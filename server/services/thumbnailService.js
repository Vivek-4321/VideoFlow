/**
 * Enhanced Thumbnail Generation Service with Real-time Progress Tracking
 * FIXED: Corrected Docker path mapping and container directory structure
 */
const path = require('path');
const fs = require('fs');
const { promisify } = require('util');
const Docker = require('dockerode');
const sharp = require('sharp');
const archiver = require('archiver');
const logger = require('../utils/logger');

// Promisify fs functions
const stat = promisify(fs.stat);
const mkdir = promisify(fs.mkdir);
const readdir = promisify(fs.readdir);
const unlink = promisify(fs.unlink);
const writeFile = promisify(fs.writeFile);

// Initialize Docker client
const docker = new Docker();

/**
 * Enhanced FFmpeg progress parsing specifically for thumbnail generation
 */
const parseThumbnailProgress = (output, expectedThumbnails) => {
  try {
    // Pattern 1: Frame count (most reliable for thumbnails)
    const framePattern = /frame=\s*(\d+)/;
    const frameMatch = output.match(framePattern);
    
    if (frameMatch) {
      const currentFrame = parseInt(frameMatch[1]);
      if (expectedThumbnails && expectedThumbnails > 0) {
        const progress = Math.min((currentFrame / expectedThumbnails) * 100, 95);
        return {
          currentFrame,
          expectedFrames: expectedThumbnails,
          progress
        };
      }
    }

    // Pattern 2: Time-based progress for thumbnails
    const timePattern = /time=(\d{2}):(\d{2}):(\d{2})\.(\d{2})/;
    const timeMatch = output.match(timePattern);
    
    if (timeMatch) {
      const hours = parseInt(timeMatch[1]);
      const minutes = parseInt(timeMatch[2]);
      const seconds = parseInt(timeMatch[3]);
      const currentTime = hours * 3600 + minutes * 60 + seconds;
      
      // Since thumbnails are extracted at intervals, we can estimate progress
      return {
        currentTime,
        progress: Math.min(currentTime * 2, 95) // Rough estimation
      };
    }

    // Pattern 3: Look for actual thumbnail file creation messages
    const thumbnailPattern = /writing.*thumb_(\d+)\.jpg/i;
    const thumbnailMatch = output.match(thumbnailPattern);
    
    if (thumbnailMatch) {
      const thumbnailNumber = parseInt(thumbnailMatch[1]);
      if (expectedThumbnails && expectedThumbnails > 0) {
        const progress = Math.min((thumbnailNumber / expectedThumbnails) * 100, 95);
        return {
          currentThumbnail: thumbnailNumber,
          expectedThumbnails,
          progress
        };
      }
    }

  } catch (error) {
    logger.warn(`Error parsing thumbnail progress: ${error.message}`);
  }

  return null;
};

/**
 * Enhanced thumbnail generation with real-time progress tracking
 */
const generateThumbnails = async (inputFilePath, outputDir, job, videoMetadata, progressCallback) => {
  if (!job.outputOptions || !job.outputOptions.thumbnails || !job.outputOptions.thumbnails.enabled) {
    logger.info('Thumbnail generation is disabled for this job');
    return null;
  }
  
  const thumbnailParams = job.getThumbnailParameters(videoMetadata.duration);
  if (!thumbnailParams) {
    logger.warn('Could not calculate thumbnail parameters');
    return null;
  }
  
  logger.info(`Generating thumbnails: ${thumbnailParams.totalThumbnails} total (${thumbnailParams.intervalCount} intervals, ${thumbnailParams.customCount} custom)`);
  
  // Create thumbnails directory
  const thumbnailsDir = path.join(outputDir, 'thumbnails');
  await ensureDir(thumbnailsDir);
  
  try {
    let intervalThumbnails = [];
    let customThumbnails = [];
    let spriteImagePath = null;
    let vttPath = null;
    let thumbnailsZipPath = null;
    
    // Phase 1: Generate interval thumbnails if needed (40% of thumbnail progress)
    if (thumbnailParams.mode === 'interval' || thumbnailParams.mode === 'both') {
      logger.info('Phase 1: Generating interval thumbnails');
      const intervalProgressCallback = (progress) => {
        const adjustedProgress = Math.round(progress * 0.4);
        if (progressCallback) progressCallback(adjustedProgress);
      };

      intervalThumbnails = await generateIntervalThumbnails(
        inputFilePath, thumbnailsDir, job, thumbnailParams, intervalProgressCallback);
    }
    
    // Phase 2: Generate custom timestamp thumbnails if needed (30% of thumbnail progress)
    if (thumbnailParams.mode === 'custom' || thumbnailParams.mode === 'both') {
      logger.info('Phase 2: Generating custom timestamp thumbnails');
      const customProgressCallback = (progress) => {
        const baseProgress = (thumbnailParams.mode === 'both') ? 40 : 0;
        const adjustedProgress = baseProgress + Math.round(progress * 0.3);
        if (progressCallback) progressCallback(adjustedProgress);
      };

      customThumbnails = await generateCustomThumbnails(
        inputFilePath, thumbnailsDir, job, thumbnailParams, customProgressCallback);
    }
    
    // Combine all thumbnails
    const allThumbnails = [...intervalThumbnails, ...customThumbnails];
    
    // Phase 3: Generate sprite sheet if enabled (15% of thumbnail progress)
    if (thumbnailParams.generateSprite && intervalThumbnails.length > 0) {
      logger.info('Phase 3: Creating sprite sheet');
      const baseProgress = (thumbnailParams.mode === 'custom') ? 30 : (thumbnailParams.mode === 'both') ? 70 : 40;
      if (progressCallback) progressCallback(baseProgress);
      
      spriteImagePath = await generateSpriteSheet(
        intervalThumbnails, thumbnailsDir, thumbnailParams);
      
      const finalProgress = baseProgress + 15;
      if (progressCallback) progressCallback(finalProgress);
      logger.info('Sprite sheet generated successfully');
    } else if (allThumbnails.length > 0) {
      // Create ZIP of all thumbnails if no sprite sheet
      logger.info('Phase 3: Creating thumbnails ZIP archive');
      const baseProgress = (thumbnailParams.mode === 'custom') ? 30 : (thumbnailParams.mode === 'both') ? 70 : 40;
      if (progressCallback) progressCallback(baseProgress);
      
      thumbnailsZipPath = await createThumbnailsZip(
        allThumbnails, thumbnailsDir);
      
      const finalProgress = baseProgress + 15;
      if (progressCallback) progressCallback(finalProgress);
      logger.info('Thumbnails ZIP created successfully');
    }
    
    // Phase 4: Generate VTT file if enabled (15% of thumbnail progress)
    if (thumbnailParams.generateVTT && intervalThumbnails.length > 0) {
      logger.info('Phase 4: Generating WebVTT file');
      
      const vttContent = generateVTTContent(
        thumbnailParams, spriteImagePath ? 'sprite.jpg' : null, intervalThumbnails);
      
      vttPath = path.join(thumbnailsDir, 'thumbnails.vtt');
      await writeFile(vttPath, vttContent);
      
      if (progressCallback) progressCallback(100);
      logger.info('WebVTT file generated successfully');
    } else {
      if (progressCallback) progressCallback(100);
    }
    
    return {
      intervalThumbnails,
      customThumbnails,
      allThumbnails,
      spriteImagePath,
      thumbnailsZipPath,
      vttPath,
      thumbnailsDir
    };
    
  } catch (error) {
    logger.error(`Error generating thumbnails: ${error.message}`);
    throw error;
  }
};

/**
 * FIXED: Generate interval-based thumbnails with correct Docker paths
 */
const generateIntervalThumbnails = async (inputFilePath, thumbnailsDir, job, thumbnailParams, progressCallback) => {
  const inputDir = path.dirname(inputFilePath);
  const inputFileName = path.basename(inputFilePath);
  const intervalDir = path.join(thumbnailsDir, 'intervals');
  await ensureDir(intervalDir);
  
  // Build FFmpeg command for interval thumbnail generation
  const videoFilter = buildThumbnailFilter(job, thumbnailParams);
  
  // FIXED: Correct Docker mount paths - the container mounts thumbnailsDir as /output
  const cmdArgs = [
    '-i', `/input/${inputFileName}`,
    '-vf', videoFilter,
    '-r', `1/${thumbnailParams.interval}`, // One frame every interval seconds
    '-q:v', '2', // High quality
    '-f', 'image2',
    '-y', // Overwrite output files
    // FIXED: Removed problematic -progress option that was causing directory issues
    '/output/intervals/thumb_%04d.jpg' // FIXED: Correct path relative to mount
  ];
  
  logger.info(`FFmpeg interval command: ffmpeg ${cmdArgs.join(' ')}`);
  
  // FIXED: Use thumbnailsDir as the output mount point
  await runFFmpegForThumbnails(
    cmdArgs, 
    inputDir, 
    thumbnailsDir, // FIXED: Mount thumbnailsDir directly instead of its parent
    thumbnailParams.intervalCount,
    progressCallback,
    'intervals'
  );
  
  // Read generated thumbnails
  const files = await readdir(intervalDir);
  const thumbnailFiles = files.filter(f => f.startsWith('thumb_') && f.endsWith('.jpg'));
  
  // Sort by filename to ensure correct order
  thumbnailFiles.sort();
  
  const thumbnailPaths = [];
  for (const file of thumbnailFiles) {
    thumbnailPaths.push(path.join(intervalDir, file));
  }
  
  logger.info(`Generated ${thumbnailPaths.length} interval thumbnails`);
  return thumbnailPaths;
};

/**
 * FIXED: Generate custom timestamp thumbnails with correct Docker paths
 */
const generateCustomThumbnails = async (inputFilePath, thumbnailsDir, job, thumbnailParams, progressCallback) => {
  const inputDir = path.dirname(inputFilePath);
  const inputFileName = path.basename(inputFilePath);
  const customDir = path.join(thumbnailsDir, 'custom');
  await ensureDir(customDir);
  
  const customTimestamps = thumbnailParams.customTimestamps;
  if (!customTimestamps || customTimestamps.length === 0) {
    logger.info('No custom timestamps to process');
    return [];
  }
  
  logger.info(`Generating ${customTimestamps.length} custom timestamp thumbnails`);
  
  const thumbnailPaths = [];
  
  // Process each custom timestamp individually
  for (let i = 0; i < customTimestamps.length; i++) {
    const timestamp = customTimestamps[i];
    const timestampSeconds = parseTimestamp(timestamp.timestamp);
    
    if (timestampSeconds === null) {
      logger.warn(`Invalid timestamp format: ${timestamp.timestamp}`);
      continue;
    }
    
    const outputFileName = `custom_${timestamp.timestamp.replace(/:/g, '-')}.jpg`;
    const videoFilter = buildThumbnailFilter(job, thumbnailParams);
    
    // Build FFmpeg command for specific timestamp
    const cmdArgs = [
      '-i', `/input/${inputFileName}`,
      '-ss', timestampSeconds.toString(), // Seek to specific timestamp
      '-vf', videoFilter,
      '-frames:v', '1', // Extract only one frame
      '-q:v', '2', // High quality
      '-f', 'image2',
      '-y', // Overwrite output files
      `/output/custom/${outputFileName}` // FIXED: Correct path relative to mount
    ];
    
    logger.info(`FFmpeg custom command: ffmpeg ${cmdArgs.join(' ')}`);
    
    // Individual progress callback for this thumbnail
    const individualProgressCallback = (progress) => {
      const overallProgress = ((i / customTimestamps.length) * 100) + (progress / customTimestamps.length);
      if (progressCallback) progressCallback(Math.round(overallProgress));
    };
    
    try {
      // FIXED: Use thumbnailsDir as the output mount point
      await runFFmpegForThumbnails(
        cmdArgs, 
        inputDir, 
        thumbnailsDir, // FIXED: Mount thumbnailsDir directly
        1, // Only one thumbnail expected
        individualProgressCallback,
        'custom'
      );
      
      const thumbnailPath = path.join(customDir, outputFileName);
      
      // Verify the thumbnail was created
      try {
        const stats = await stat(thumbnailPath);
        if (stats.size > 0) {
          thumbnailPaths.push(thumbnailPath);
          logger.info(`Generated custom thumbnail: ${outputFileName}`);
        } else {
          logger.warn(`Custom thumbnail is empty: ${outputFileName}`);
        }
      } catch (statError) {
        logger.warn(`Custom thumbnail not found: ${outputFileName}`);
      }
      
    } catch (error) {
      logger.error(`Error generating custom thumbnail ${outputFileName}: ${error.message}`);
      // Continue with other timestamps
    }
  }
  
  logger.info(`Generated ${thumbnailPaths.length} custom thumbnails`);
  return thumbnailPaths;
};

/**
 * Parse timestamp string (HH:MM:SS) to seconds
 */
const parseTimestamp = (timestamp) => {
  const parts = timestamp.split(':');
  if (parts.length !== 3) return null;
  
  const hours = parseInt(parts[0]) || 0;
  const minutes = parseInt(parts[1]) || 0;
  const seconds = parseInt(parts[2]) || 0;
  
  return hours * 3600 + minutes * 60 + seconds;
};

/**
 * Enhanced FFmpeg runner specifically for thumbnails with real-time progress
 * FIXED: Proper Docker mount and container handling
 */
const runFFmpegForThumbnails = async (cmdArgs, inputDir, outputDir, expectedThumbnails, progressCallback, operationType = 'thumbnails') => {
  try {
    logger.info(`Starting FFmpeg container for ${operationType} thumbnail generation`);
    logger.info(`Expected thumbnails: ${expectedThumbnails}`);
    logger.info(`Input dir: ${inputDir}, Output dir: ${outputDir}`);
    
    // FIXED: Ensure the required subdirectories exist before running FFmpeg
    if (operationType === 'intervals') {
      await ensureDir(path.join(outputDir, 'intervals'));
    } else if (operationType === 'custom') {
      await ensureDir(path.join(outputDir, 'custom'));
    }
    
    const container = await docker.createContainer({
      Image: 'jrottenberg/ffmpeg:latest',
      Cmd: cmdArgs,
      HostConfig: {
        Binds: [
          `${inputDir}:/input:ro`,
          `${outputDir}:/output:rw` // FIXED: Mount outputDir directly as /output
        ],
        Memory: 1024 * 1024 * 1024, // 1GB memory limit
        CpuShares: 512
      },
      // Force real-time output
      Tty: false,
      AttachStdout: true,
      AttachStderr: true
    });
    
    await container.start();
    
    return new Promise(async (resolve, reject) => {
      let lastProgress = 0;
      let outputBuffer = '';
      let thumbnailCount = 0;
      let startTime = Date.now();
      
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
          
          // Process each line for progress information
          const lines = chunk.split('\n');
          
          for (const line of lines) {
            if (line.trim()) {
              // Simple progress estimation based on output
              if (line.includes('frame=') || line.includes('time=')) {
                const progressData = parseThumbnailProgress(line, expectedThumbnails);
                
                if (progressData && progressData.progress > 0) {
                  const currentProgress = Math.round(progressData.progress);
                  const now = Date.now();
                  
                  // Update progress if there's meaningful change
                  if (currentProgress > lastProgress || (now - startTime) > 2000) {
                    lastProgress = currentProgress;
                    
                    logger.debug(`${operationType} generation progress: ${currentProgress}%`);
                    
                    if (progressCallback) {
                      progressCallback(currentProgress);
                    }
                  }
                }
              }
              
              // Count actual thumbnail creation by looking for successful outputs
              if (line.includes('.jpg') && (line.includes('Output') || line.includes('frame'))) {
                thumbnailCount++;
                const estimatedProgress = Math.min((thumbnailCount / expectedThumbnails) * 100, 95);
                
                if (estimatedProgress > lastProgress) {
                  lastProgress = estimatedProgress;
                  logger.info(`Thumbnail created: ${thumbnailCount}/${expectedThumbnails} (${Math.round(estimatedProgress)}%)`);
                  
                  if (progressCallback) {
                    progressCallback(estimatedProgress);
                  }
                }
              }
            }
          }
        };
        
        if (logStream && typeof logStream.on === 'function') {
          logStream.on('data', processData);
          
          logStream.on('end', async () => {
            logger.info(`FFmpeg ${operationType} thumbnail generation container logs ended`);
            
            const result = await container.wait();
            const exitCode = result.StatusCode;
            
            await container.remove();
            
            if (exitCode !== 0) {
              logger.error(`FFmpeg ${operationType} thumbnail generation failed with exit code ${exitCode}`);
              logger.error(`FFmpeg output: ${outputBuffer.slice(-2000)}`);
              return reject(new Error(`FFmpeg ${operationType} thumbnail generation failed with exit code ${exitCode}`));
            }
            
            // Final progress update
            if (progressCallback) progressCallback(100);
            
            resolve();
          });
          
          logStream.on('error', (err) => {
            logger.error(`FFmpeg ${operationType} thumbnail stream error: ${err.message}`);
            reject(err);
          });
        } else {
          // Fallback method without real-time streaming
          logger.info(`Log stream not available, using fallback method for ${operationType} thumbnail generation`);
          
          const result = await container.wait();
          const exitCode = result.StatusCode;
          
          const finalLogs = await container.logs({
            stdout: true,
            stderr: true
          });
          
          outputBuffer = finalLogs.toString();
          await container.remove();
          
          if (exitCode !== 0) {
            logger.error(`FFmpeg ${operationType} thumbnail generation failed with exit code ${exitCode}`);
            logger.error(`FFmpeg output: ${outputBuffer.slice(-2000)}`);
            return reject(new Error(`FFmpeg ${operationType} thumbnail generation failed with exit code ${exitCode}`));
          }
          
          if (progressCallback) progressCallback(100);
          resolve();
        }
      } catch (error) {
        logger.error(`Error in ${operationType} thumbnail generation: ${error.message}`);
        
        try {
          await container.remove();
        } catch (removeError) {
          logger.warn(`Failed to remove container: ${removeError.message}`);
        }
        
        reject(error);
      }
    });
  } catch (error) {
    logger.error(`Docker error in ${operationType} thumbnail generation: ${error.message}`);
    throw error;
  }
};

/**
 * Build video filter for thumbnail generation with crop support
 */
const buildThumbnailFilter = (job, thumbnailParams) => {
  const filters = [];
  
  // Add crop filter if enabled
  if (job.outputOptions.crop && job.outputOptions.crop.width && job.outputOptions.crop.height) {
    const cropFilter = `crop=${job.outputOptions.crop.width}:${job.outputOptions.crop.height}:${job.outputOptions.crop.x || 0}:${job.outputOptions.crop.y || 0}`;
    filters.push(cropFilter);
  }
  
  // Add scale filter for thumbnail size
  const scaleFilter = `scale=${thumbnailParams.thumbnailWidth}:${thumbnailParams.thumbnailHeight}`;
  filters.push(scaleFilter);
  
  // Return the complete filter chain
  return filters.join(',');
};

/**
 * Create ZIP archive of thumbnails with progress tracking
 */
const createThumbnailsZip = async (thumbnailPaths, outputDir) => {
  return new Promise((resolve, reject) => {
    const zipPath = path.join(outputDir, 'thumbnails.zip');
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', {
      zlib: { level: 9 } // Maximum compression
    });
    
    let processedFiles = 0;
    const totalFiles = thumbnailPaths.length;
    
    output.on('close', () => {
      logger.info(`Thumbnails ZIP created: ${zipPath} (${archive.pointer()} bytes)`);
      resolve(zipPath);
    });
    
    archive.on('error', (err) => {
      logger.error(`Error creating thumbnails ZIP: ${err.message}`);
      reject(err);
    });
    
    // Track progress of file addition
    archive.on('entry', (entry) => {
      processedFiles++;
      const progress = Math.round((processedFiles / totalFiles) * 100);
      logger.debug(`ZIP progress: ${progress}% (${processedFiles}/${totalFiles} files)`);
    });
    
    archive.pipe(output);
    
    // Add each thumbnail to the ZIP
    for (const thumbnailPath of thumbnailPaths) {
      const fileName = path.basename(thumbnailPath);
      archive.file(thumbnailPath, { name: fileName });
    }
    
    archive.finalize();
  });
};

/**
 * Generate sprite sheet from individual thumbnails using Sharp with progress
 */
const generateSpriteSheet = async (thumbnailPaths, outputDir, thumbnailParams) => {
  try {
    logger.info(`Creating sprite sheet with ${thumbnailParams.spriteColumns} columns and ${thumbnailParams.spriteRows} rows`);
    logger.info(`Individual thumbnail size: ${thumbnailParams.thumbnailWidth}x${thumbnailParams.thumbnailHeight}`);
    logger.info(`Sprite sheet size: ${thumbnailParams.spriteWidth}x${thumbnailParams.spriteHeight}`);
    
    const spriteWidth = thumbnailParams.spriteWidth;
    const spriteHeight = thumbnailParams.spriteHeight;
    
    // Create empty canvas with black background
    const sprite = sharp({
      create: {
        width: spriteWidth,
        height: spriteHeight,
        channels: 3,
        background: { r: 0, g: 0, b: 0 }
      }
    });
    
    // Prepare composite operations
    const compositeOps = [];
    
    for (let i = 0; i < thumbnailPaths.length; i++) {
      const row = Math.floor(i / thumbnailParams.spriteColumns);
      const col = i % thumbnailParams.spriteColumns;
      
      const left = col * thumbnailParams.thumbnailWidth;
      const top = row * thumbnailParams.thumbnailHeight;
      
      compositeOps.push({
        input: thumbnailPaths[i],
        left: left,
        top: top
      });
      
      // Log progress for large sprite sheets
      if (i % 10 === 0 || i === thumbnailPaths.length - 1) {
        const progress = Math.round(((i + 1) / thumbnailPaths.length) * 50); // 50% of sprite creation
        logger.debug(`Preparing sprite composition: ${progress}% (${i + 1}/${thumbnailPaths.length} thumbnails)`);
      }
    }
    
    // Create sprite sheet
    const spriteImagePath = path.join(outputDir, 'sprite.jpg');
    
    logger.info(`Compositing sprite sheet with ${compositeOps.length} thumbnails...`);
    
    await sprite
      .composite(compositeOps)
      .jpeg({ 
        quality: thumbnailParams.quality,
        progressive: true,
        mozjpeg: true
      })
      .toFile(spriteImagePath);
    
    // Verify the sprite sheet was created
    const spriteStats = await stat(spriteImagePath);
    if (spriteStats.size === 0) {
      throw new Error('Generated sprite sheet is empty');
    }
    
    logger.info(`Sprite sheet created successfully: ${spriteImagePath} (${spriteStats.size} bytes)`);
    return spriteImagePath;
    
  } catch (error) {
    logger.error(`Error creating sprite sheet: ${error.message}`);
    throw error;
  }
};

/**
 * Generate WebVTT content for thumbnail previews
 */
const generateVTTContent = (thumbnailParams, spriteFileName, individualThumbnails) => {
  let vttContent = 'WEBVTT\n\n';
  
  const intervalThumbnails = thumbnailParams.intervalCount;
  const interval = thumbnailParams.interval;
  const thumbnailWidth = thumbnailParams.thumbnailWidth;
  const thumbnailHeight = thumbnailParams.thumbnailHeight;
  const columns = thumbnailParams.spriteColumns;
  
  for (let i = 0; i < intervalThumbnails; i++) {
    const startTime = i * interval;
    const endTime = Math.min((i + 1) * interval, startTime + interval);
    
    // Format time for VTT (HH:MM:SS.mmm)
    const startTimeFormatted = formatVTTTime(startTime);
    const endTimeFormatted = formatVTTTime(endTime);
    
    if (spriteFileName) {
      // Using sprite sheet
      const row = Math.floor(i / columns);
      const col = i % columns;
      const xOffset = col * thumbnailWidth;
      const yOffset = row * thumbnailHeight;
      
      vttContent += `${startTimeFormatted} --> ${endTimeFormatted}\n`;
      vttContent += `${spriteFileName}#xywh=${xOffset},${yOffset},${thumbnailWidth},${thumbnailHeight}\n\n`;
    } else {
      // Using individual images
      const thumbnailIndex = i + 1; // FFmpeg starts numbering from 1
      const thumbnailFileName = `thumb_${thumbnailIndex.toString().padStart(4, '0')}.jpg`;
      
      vttContent += `${startTimeFormatted} --> ${endTimeFormatted}\n`;
      vttContent += `${thumbnailFileName}\n\n`;
    }
  }
  
  return vttContent;
};

/**
 * Format time in seconds to VTT format (HH:MM:SS.mmm)
 */
const formatVTTTime = (timeInSeconds) => {
  const hours = Math.floor(timeInSeconds / 3600);
  const minutes = Math.floor((timeInSeconds % 3600) / 60);
  const seconds = timeInSeconds % 60;
  
  const hoursStr = hours.toString().padStart(2, '0');
  const minutesStr = minutes.toString().padStart(2, '0');
  const secondsStr = seconds.toFixed(3).padStart(6, '0');
  
  return `${hoursStr}:${minutesStr}:${secondsStr}`;
};

/**
 * Upload thumbnails to storage and return URLs
 */
const uploadThumbnails = async (thumbnailResult, storageService, userId, jobId) => {
  if (!thumbnailResult) {
    return null;
  }
  
  const thumbnailUrls = {
    individual: [],
    sprite: null,
    vtt: null,
    zip: null,
    custom: [], // NEW: Custom timestamp thumbnails
    combined: [] // NEW: All thumbnails combined
  };
  
  try {
    logger.info('Starting thumbnail upload process...');
    
    // Upload interval thumbnails (only if no sprite sheet and no ZIP)
    if (thumbnailResult.intervalThumbnails && thumbnailResult.intervalThumbnails.length > 0 && !thumbnailResult.spriteImagePath && !thumbnailResult.thumbnailsZipPath) {
      logger.info(`Uploading ${thumbnailResult.intervalThumbnails.length} interval thumbnails...`);
      
      for (let i = 0; i < thumbnailResult.intervalThumbnails.length; i++) {
        const thumbnailPath = thumbnailResult.intervalThumbnails[i];
        const fileName = path.basename(thumbnailPath);
        const destPath = `transcoded/${userId}/${jobId}/thumbnails/intervals/${fileName}`;
        
        const url = await storageService.uploadToFirebase(thumbnailPath, destPath);
        thumbnailUrls.individual.push(url);
        
        // Log progress for large sets
        if (i % 5 === 0 || i === thumbnailResult.intervalThumbnails.length - 1) {
          const progress = Math.round(((i + 1) / thumbnailResult.intervalThumbnails.length) * 100);
          logger.debug(`Interval thumbnail upload: ${progress}% (${i + 1}/${thumbnailResult.intervalThumbnails.length})`);
        }
      }
    }
    
    // Upload custom thumbnails
    if (thumbnailResult.customThumbnails && thumbnailResult.customThumbnails.length > 0) {
      logger.info(`Uploading ${thumbnailResult.customThumbnails.length} custom thumbnails...`);
      
      for (let i = 0; i < thumbnailResult.customThumbnails.length; i++) {
        const thumbnailPath = thumbnailResult.customThumbnails[i];
        const fileName = path.basename(thumbnailPath);
        const destPath = `transcoded/${userId}/${jobId}/thumbnails/custom/${fileName}`;
        
        const url = await storageService.uploadToFirebase(thumbnailPath, destPath);
        
        // Extract timestamp from filename
        const timestampMatch = fileName.match(/custom_(\d{2}-\d{2}-\d{2})/);
        const timestamp = timestampMatch ? timestampMatch[1].replace(/-/g, ':') : `custom_${i}`;
        
        thumbnailUrls.custom.push({
          timestamp,
          url
        });
        
        // Log progress
        if (i % 5 === 0 || i === thumbnailResult.customThumbnails.length - 1) {
          const progress = Math.round(((i + 1) / thumbnailResult.customThumbnails.length) * 100);
          logger.debug(`Custom thumbnail upload: ${progress}% (${i + 1}/${thumbnailResult.customThumbnails.length})`);
        }
      }
    }
    
    // Upload sprite sheet
    if (thumbnailResult.spriteImagePath) {
      logger.info('Uploading sprite sheet...');
      const destPath = `transcoded/${userId}/${jobId}/thumbnails/sprite.jpg`;
      thumbnailUrls.sprite = await storageService.uploadToFirebase(thumbnailResult.spriteImagePath, destPath);
      logger.info('Sprite sheet uploaded successfully');
    }
    
    // Upload thumbnails ZIP
    if (thumbnailResult.thumbnailsZipPath) {
      logger.info('Uploading thumbnails ZIP...');
      const destPath = `transcoded/${userId}/${jobId}/thumbnails/thumbnails.zip`;
      thumbnailUrls.zip = await storageService.uploadToFirebase(thumbnailResult.thumbnailsZipPath, destPath);
      logger.info('Thumbnails ZIP uploaded successfully');
    }
    
    // Upload VTT file
    if (thumbnailResult.vttPath) {
      logger.info('Uploading WebVTT file...');
      const destPath = `transcoded/${userId}/${jobId}/thumbnails/thumbnails.vtt`;
      thumbnailUrls.vtt = await storageService.uploadToFirebase(thumbnailResult.vttPath, destPath);
      logger.info('WebVTT file uploaded successfully');
    }
    
    // Create combined thumbnails list (sorted chronologically)
    const combined = [];
    
    // Add interval thumbnails
    if (thumbnailUrls.individual && thumbnailUrls.individual.length > 0) {
      thumbnailUrls.individual.forEach((url, index) => {
        combined.push({
          timestamp: formatVTTTime(index * 10), // Assume 10 second intervals
          url,
          type: 'interval'
        });
      });
    }
    
    // Add custom thumbnails
    if (thumbnailUrls.custom && thumbnailUrls.custom.length > 0) {
      thumbnailUrls.custom.forEach(custom => {
        combined.push({
          timestamp: custom.timestamp,
          url: custom.url,
          type: 'custom'
        });
      });
    }
    
    // Sort combined by timestamp
    combined.sort((a, b) => {
      const timeA = parseTimestamp(a.timestamp) || 0;
      const timeB = parseTimestamp(b.timestamp) || 0;
      return timeA - timeB;
    });
    
    thumbnailUrls.combined = combined;
    
    logger.info(`Thumbnail upload completed: ${thumbnailUrls.individual.length} individual, ${thumbnailUrls.custom.length} custom, sprite: ${!!thumbnailUrls.sprite}, zip: ${!!thumbnailUrls.zip}, vtt: ${!!thumbnailUrls.vtt}`);
    return thumbnailUrls;
    
  } catch (error) {
    logger.error(`Error uploading thumbnails: ${error.message}`);
    throw error;
  }
};

/**
 * Clean up thumbnail files
 */
const cleanupThumbnails = async (thumbnailsDir) => {
  try {
    if (thumbnailsDir && fs.existsSync(thumbnailsDir)) {
      const cleanupDir = async (dirPath) => {
        const files = await readdir(dirPath);
        
        for (const file of files) {
          const fullPath = path.join(dirPath, file);
          const stats = await stat(fullPath);
          
          if (stats.isDirectory()) {
            await cleanupDir(fullPath);
            fs.rmdirSync(fullPath);
          } else {
            await unlink(fullPath);
          }
        }
      };
      
      await cleanupDir(thumbnailsDir);
      fs.rmdirSync(thumbnailsDir);
      logger.info(`Cleaned up thumbnails directory: ${thumbnailsDir}`);
    }
  } catch (error) {
    logger.warn(`Failed to clean up thumbnails directory: ${error.message}`);
  }
};

/**
 * Ensure directory exists
 */
const ensureDir = async (dirPath) => {
  try {
    await mkdir(dirPath, { recursive: true });
  } catch (error) {
    if (error.code !== 'EEXIST') {
      throw error;
    }
  }
};

module.exports = {
  generateThumbnails,
  uploadThumbnails,
  cleanupThumbnails,
  generateVTTContent,
  formatVTTTime
};