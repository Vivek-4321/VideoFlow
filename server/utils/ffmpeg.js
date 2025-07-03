const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const logger = require('./logger');

// Promisify fs functions
const writeFile = promisify(fs.writeFile);

/**
 * Download watermark image to local filesystem for FFmpeg processing
 */
const downloadWatermarkImage = async (watermarkUrl, outputPath) => {
  try {
    const response = await fetch(watermarkUrl);
    if (!response.ok) {
      throw new Error(`Failed to download watermark: ${response.statusText}`);
    }
    
    const buffer = await response.arrayBuffer();
    await writeFile(outputPath, Buffer.from(buffer));
    
    logger.info(`Watermark image downloaded: ${outputPath}`);
    return outputPath;
  } catch (error) {
    logger.error(`Error downloading watermark image: ${error.message}`);
    throw error;
  }
};

/**
 * Build complex video filter string including crop, scale, and watermark with proper opacity
 * Enhanced to handle preserve original mode
 */
const buildVideoFilter = (job, resolution, videoMetadata, watermarkPath = null) => {
  const filters = [];
  const options = job.outputOptions;
  
  // Input video stream
  let currentStream = '[0:v]';
  
  // Add crop filter if enabled
  if (options.crop && options.crop.width && options.crop.height) {
    const cropFilter = `crop=${options.crop.width}:${options.crop.height}:${options.crop.x || 0}:${options.crop.y || 0}`;
    filters.push(`${currentStream}${cropFilter}[cropped]`);
    currentStream = '[cropped]';
    logger.info(`Adding crop filter: ${cropFilter}`);
  }
  
  // Add scale filter if resolution is specified and NOT in preserve original mode with "original" resolution
  if (resolution && resolution.width && resolution.height && resolution.label !== "original") {
    const scaleFilter = `scale=${resolution.width}:${resolution.height}`;
    filters.push(`${currentStream}${scaleFilter}[scaled]`);
    currentStream = '[scaled]';
    logger.info(`Adding scale filter: ${scaleFilter}`);
  }
  
  // Add watermark overlay if enabled
  if (options.watermark && options.watermark.imageUrl && watermarkPath) {
    const watermarkFilter = buildWatermarkFilter(options.watermark, videoMetadata, resolution);
    if (watermarkFilter) {
      // Scale watermark image while maintaining aspect ratio
      filters.push(`[1:v]${watermarkFilter.scale}[watermark_scaled]`);
      
      // Apply opacity to watermark using colorchannelmixer
      // This preserves the image while adjusting the alpha channel
      const opacityFilter = `format=rgba,colorchannelmixer=aa=${watermarkFilter.opacity}`;
      filters.push(`[watermark_scaled]${opacityFilter}[watermark_opacity]`);
      
      // Overlay watermark on video
      filters.push(`${currentStream}[watermark_opacity]${watermarkFilter.overlay}[output]`);
      currentStream = '[output]';
      
      logger.info(`Adding watermark filters: scale=${watermarkFilter.scale}, opacity=${watermarkFilter.opacity}, overlay=${watermarkFilter.overlay}`);
    }
  }
  
  return filters.length > 0 ? filters.join(';') : null;
};

/**
 * Build watermark overlay filter with proper opacity handling
 * Enhanced to handle preserve original mode
 */
const buildWatermarkFilter = (watermarkSettings, videoMetadata, targetResolution = null) => {
  if (!watermarkSettings || !watermarkSettings.imageUrl) {
    return null;
  }
  
  // Use target resolution if provided and not "original", otherwise use original video metadata
  const videoWidth = (targetResolution && targetResolution.label !== "original") 
    ? targetResolution.width 
    : (videoMetadata ? videoMetadata.width : 1920);
  const videoHeight = (targetResolution && targetResolution.label !== "original") 
    ? targetResolution.height 
    : (videoMetadata ? videoMetadata.height : 1080);
  
  // Calculate watermark size based on scale and video dimensions
  const watermarkWidth = Math.round(videoWidth * watermarkSettings.scale);
  
  // Calculate position based on position setting
  let x, y;
  
  switch (watermarkSettings.position) {
    case 'top-left':
      x = Math.abs(watermarkSettings.x);
      y = Math.abs(watermarkSettings.y);
      break;
    case 'top-right':
      x = videoWidth - watermarkWidth - Math.abs(watermarkSettings.x);
      y = Math.abs(watermarkSettings.y);
      break;
    case 'bottom-left':
      x = Math.abs(watermarkSettings.x);
      y = videoHeight - watermarkWidth - Math.abs(watermarkSettings.y); // Use watermarkWidth for square positioning
      break;
    case 'bottom-right':
      x = videoWidth - watermarkWidth - Math.abs(watermarkSettings.x);
      y = videoHeight - watermarkWidth - Math.abs(watermarkSettings.y); // Use watermarkWidth for square positioning
      break;
    case 'center':
      x = (videoWidth - watermarkWidth) / 2 + watermarkSettings.x;
      y = (videoHeight - watermarkWidth) / 2 + watermarkSettings.y; // Use watermarkWidth for center positioning
      break;
    default:
      x = Math.abs(watermarkSettings.x);
      y = Math.abs(watermarkSettings.y);
  }
  
  // Ensure positions are within bounds
  x = Math.max(0, Math.min(x, videoWidth - watermarkWidth));
  y = Math.max(0, Math.min(y, videoHeight - watermarkWidth)); // Use watermarkWidth for bounds checking
  
  return {
    // Scale maintaining aspect ratio with width constraint
    scale: `scale=${watermarkWidth}:-1:force_original_aspect_ratio=decrease`,
    // Opacity value for colorchannelmixer
    opacity: watermarkSettings.opacity,
    // Overlay without alpha parameter (alpha is handled by colorchannelmixer)
    overlay: `overlay=${Math.round(x)}:${Math.round(y)}:format=auto`
  };
};

/**
 * Enhanced build FFmpeg command for direct format conversion with preserve original support
 * Handles videos without audio streams and proper watermark opacity
 */
const buildDirectConversionCommand = (sanitizedInputFileName, outputFileName, job, watermarkPath = null) => {
  const options = job.outputOptions;
  const outputFormat = job.outputFormat;
  const preserveOriginal = options.preserveOriginal;
  
  // Create command array
  const cmdArray = [];
  
  // Input files
  cmdArray.push('-i');
  cmdArray.push(`/input/${sanitizedInputFileName}`);
  
  if (watermarkPath && options.watermark && options.watermark.imageUrl) {
    cmdArray.push('-i');
    cmdArray.push(`/input/${path.basename(watermarkPath)}`);
  }
  
  // Determine effective codecs based on preserve original mode
  let videoCodec = options.videoCodec;
  let audioCodec = options.audioCodec;
  
  if (preserveOriginal) {
    // Check if transcoding is absolutely necessary
    const needsFilters = options.crop || options.watermark;
    const needsFormatChange = outputFormat !== 'mp4'; // Assume input is usually mp4
    
    // Use copy codecs unless transcoding is required
    if (!needsFilters && !needsFormatChange) {
      videoCodec = 'copy';
      audioCodec = 'copy';
      logger.info('Preserve original mode: Using copy codecs for maximum quality preservation');
    } else if (needsFilters) {
      // Filters require video transcoding but audio can still be copied
      audioCodec = 'copy';
      logger.info('Preserve original mode: Video transcoding required for filters, preserving audio');
    }
  }
  
  // Override codecs for WebM format if incompatible ones are specified
  if (outputFormat === 'webm') {
    if (videoCodec !== 'vp8' && videoCodec !== 'vp9' && videoCodec !== 'av1' && videoCodec !== 'copy') {
      videoCodec = 'vp9';
    }
    if (audioCodec !== 'vorbis' && audioCodec !== 'opus' && audioCodec !== 'copy') {
      audioCodec = 'opus';
    }
  }
  
  // Add video codec
  if (videoCodec === 'copy' && (options.crop || options.watermark)) {
    logger.warn('Cannot apply filters when using video codec copy. Switching to appropriate codec.');
    videoCodec = outputFormat === 'webm' ? 'vp9' : 'h264';
    cmdArray.push('-c:v', mapVideoCodec(videoCodec));
  } else if (videoCodec === 'copy') {
    cmdArray.push('-c:v', 'copy');
  } else {
    cmdArray.push('-c:v', mapVideoCodec(videoCodec));
  }
  
  // Initialize videoFilter variable in proper scope
  let videoFilter = null;
  
  // Add video filters and encoding settings (only if not copying)
  if (videoCodec !== 'copy' || options.crop || options.watermark) {
    // Determine target resolution - in preserve original mode, use "original"
    const targetResolution = preserveOriginal 
      ? { width: null, height: null, label: "original" }
      : (options.resolutions && options.resolutions.length > 0 ? options.resolutions[0] : null);
    
    videoFilter = buildVideoFilter(job, targetResolution, null, watermarkPath);
    if (videoFilter) {
      cmdArray.push('-filter_complex', videoFilter);
      // Map the final output stream
      if (options.watermark && watermarkPath) {
        cmdArray.push('-map', '[output]');
      } else if (targetResolution && targetResolution.label !== "original") {
        cmdArray.push('-map', '[scaled]');
      } else if (options.crop) {
        cmdArray.push('-map', '[cropped]');
      } else {
        cmdArray.push('-map', '0:v');
      }
    }
    
    // Video encoding settings (skip in preserve original mode unless transcoding is required)
    if (!preserveOriginal || videoCodec !== 'copy') {
      if (options.crf !== undefined) {
        cmdArray.push('-crf', options.crf.toString());
      } else if (options.videoBitrate && options.videoBitrate !== 'copy') {
        cmdArray.push('-b:v', options.videoBitrate);
      }
      
      if (options.preset) {
        cmdArray.push('-preset', options.preset);
      }
      
      if (options.profile) {
        cmdArray.push('-profile:v', options.profile);
      }
      
      if (options.level) {
        cmdArray.push('-level', options.level);
      }
      
      if (options.pixelFormat) {
        cmdArray.push('-pix_fmt', options.pixelFormat);
      }
      
      if (options.tune) {
        cmdArray.push('-tune', options.tune);
      }
      
      if (options.fps) {
        cmdArray.push('-r', options.fps.toString());
      }
    } else {
      logger.info('Preserve original mode: Skipping video encoding parameters for copy codec');
    }
  }
  
  // Add audio codec - but make audio mapping optional with '?'
  if (audioCodec === 'copy') {
    cmdArray.push('-c:a', 'copy');
  } else {
    cmdArray.push('-c:a', mapAudioCodec(audioCodec || (outputFormat === 'webm' ? 'opus' : 'aac')));
    
    if (options.audioBitrate && options.audioBitrate !== 'copy') {
      cmdArray.push('-b:a', options.audioBitrate);
    }
  }
  
  // Map audio stream with '?' to make it optional (handle videos without audio)
  cmdArray.push('-map', '0:a?');
  
  // Add output path
  cmdArray.push(`/output/${outputFileName}`);
  
  return cmdArray;
};

/**
 * Enhanced build FFmpeg command for streaming resolution with preserve original support
 */
const buildStreamingCommandForResolution = (inputFilePath, outputDir, job, resolution, watermarkPath = null) => {
  const outputFormat = job.outputFormat;
  const isHls = outputFormat === 'hls';
  const isWebm = job.outputFormat === 'webm';
  const options = job.outputOptions;
  const preserveOriginal = options.preserveOriginal;
  
  // Base command
  const cmdArray = [];
  
  // Input files
  cmdArray.push('-i');
  cmdArray.push(`/input/${path.basename(inputFilePath)}`);
  
  if (watermarkPath && options.watermark && options.watermark.imageUrl) {
    cmdArray.push('-i');
    cmdArray.push(`/input/${path.basename(watermarkPath)}`);
  }
  
  // Determine effective video codec
  let effectiveVideoCodec = options.videoCodec;
  
  if (preserveOriginal && resolution.label === "original") {
    // Check if we need transcoding for streaming format
    const needsFilters = options.crop || options.watermark;
    const needsStreamingFormat = isHls || outputFormat === 'dash';
    
    if (!needsFilters && !needsStreamingFormat) {
      effectiveVideoCodec = 'copy';
    }
  }
  
  // Add video codec
  if (effectiveVideoCodec === 'copy' && (options.crop || options.watermark)) {
    logger.warn('Cannot apply filters when using video codec copy. Switching to appropriate codec.');
    const codecName = isWebm ? 
      (options.videoCodec === 'vp9' ? 'libvpx-vp9' : 'libvpx') : 
      (options.videoCodec === 'h265' ? 'libx265' : 'libx264');
    cmdArray.push('-c:v', codecName);
    effectiveVideoCodec = options.videoCodec;
  } else if (effectiveVideoCodec === 'copy') {
    cmdArray.push('-c:v', 'copy');
  } else {
    const codecName = isWebm ? 
      (effectiveVideoCodec === 'vp9' ? 'libvpx-vp9' : 'libvpx') : 
      (effectiveVideoCodec === 'h265' ? 'libx265' : 'libx264');
    
    cmdArray.push('-c:v', codecName);
  }
  
  // Initialize videoFilter variable in proper scope
  let videoFilter = null;
  
  // Add video filters and encoding settings (only if not copying)
  if (effectiveVideoCodec !== 'copy' || options.crop || options.watermark) {
    videoFilter = buildVideoFilter(job, resolution, null, watermarkPath);
    if (videoFilter) {
      cmdArray.push('-filter_complex', videoFilter);
      // Map the final output stream
      if (options.watermark && watermarkPath) {
        cmdArray.push('-map', '[output]');
      } else if (resolution.label !== "original") {
        cmdArray.push('-map', '[scaled]');
      } else {
        cmdArray.push('-map', '[cropped]');
      }
    }
    
    // Video encoding settings (skip if preserving original and using copy)
    if (effectiveVideoCodec !== 'copy') {
      if (options.crf !== undefined) {
        cmdArray.push('-crf', options.crf.toString());
      } else {
        const videoBitrate = (preserveOriginal && options.videoBitrate === 'copy') 
          ? getBitrateForResolution(resolution)
          : (options.videoBitrate || getBitrateForResolution(resolution));
        cmdArray.push('-b:v', videoBitrate);
      }
      
      if (options.preset) {
        cmdArray.push('-preset', options.preset);
      }
      
      if (options.profile) {
        cmdArray.push('-profile:v', options.profile);
      }
      
      if (options.level) {
        cmdArray.push('-level', options.level);
      }
      
      if (options.pixelFormat) {
        cmdArray.push('-pix_fmt', options.pixelFormat);
      }
      
      if (options.tune) {
        cmdArray.push('-tune', options.tune);
      }
      
      if (options.fps) {
        cmdArray.push('-r', options.fps.toString());
      }
    }
  }
  
  // Add audio codec (prefer copy in preserve original mode)
  const effectiveAudioCodec = (preserveOriginal && !isWebm) ? 'copy' : options.audioCodec;
  
  if (effectiveAudioCodec === 'copy') {
    cmdArray.push('-c:a', 'copy');
  } else {
    cmdArray.push('-c:a', isWebm ? 'libopus' : 'aac');
    
    // Add audio bitrate
    if (options.audioBitrate && options.audioBitrate !== 'copy') {
      cmdArray.push('-b:a', options.audioBitrate);
    } else {
      cmdArray.push('-b:a', '128k');
    }
  }
  
  // Map audio stream with '?' to make it optional (handle videos without audio)
  cmdArray.push('-map', '0:a?');
  
  // Add format-specific parameters
  if (isHls) {
    cmdArray.push('-f', 'hls');
    cmdArray.push('-hls_time', '10');
    cmdArray.push('-hls_playlist_type', 'vod');
    cmdArray.push('-hls_segment_filename', `/output/${resolution.label}_%03d.ts`);
    cmdArray.push('-hls_flags', 'independent_segments');
    cmdArray.push(`/output/${resolution.label}.m3u8`);
  } else {
    // DASH
    cmdArray.push('-f', 'dash');
    cmdArray.push('-seg_duration', '4');
    cmdArray.push('-use_template', '1');
    cmdArray.push('-use_timeline', '1');
    cmdArray.push('-init_seg_name', `init-$RepresentationID$.m4s`);
    cmdArray.push('-media_seg_name', `chunk-$RepresentationID$-$Number%05d$.m4s`);
    cmdArray.push(`/output/${resolution.label}.mpd`);
  }
  
  return cmdArray;
};

/**
 * Enhanced build FFmpeg command for HLS with preserve original support
 */
const buildHlsCommand = (sanitizedInputFileName, outputDir, job, resolution, watermarkPath = null) => {
  const options = job.outputOptions;
  const preserveOriginal = options.preserveOriginal;
  
  // Create command array
  const cmdArray = [];
  
  // Input files: video first, then watermark if present
  cmdArray.push('-i');
  cmdArray.push(`/input/${sanitizedInputFileName}`);
  
  if (watermarkPath && options.watermark && options.watermark.imageUrl) {
    cmdArray.push('-i');
    cmdArray.push(`/input/${path.basename(watermarkPath)}`);
  }
  
  // Determine effective video codec
  let effectiveVideoCodec = options.videoCodec;
  
  if (preserveOriginal && resolution.label === "original") {
    const needsFilters = options.crop || options.watermark;
    if (!needsFilters) {
      effectiveVideoCodec = 'copy';
    }
  }
  
  // Video codec
  if (effectiveVideoCodec === 'copy' && (options.crop || options.watermark)) {
    logger.warn('Cannot apply filters when using video codec copy. Switching to libx264.');
    cmdArray.push('-c:v', 'libx264');
    effectiveVideoCodec = 'h264';
  } else if (effectiveVideoCodec === 'copy') {
    cmdArray.push('-c:v', 'copy');
  } else {
    cmdArray.push('-c:v', mapVideoCodec(effectiveVideoCodec || 'h264'));
  }
  
  // Initialize videoFilter variable in proper scope
  let videoFilter = null;
  
  // Add video filters (crop + scale + watermark)
  if (effectiveVideoCodec !== 'copy' || options.crop || options.watermark) {
    videoFilter = buildVideoFilter(job, resolution, null, watermarkPath);
    if (videoFilter) {
      cmdArray.push('-filter_complex', videoFilter);
      // Map the final output stream
      if (options.watermark && watermarkPath) {
        cmdArray.push('-map', '[output]');
      } else if (resolution.label !== "original") {
        cmdArray.push('-map', '[scaled]');
      } else {
        cmdArray.push('-map', '[cropped]');
      }
    }
    
    // Video encoding settings (skip if using copy codec)
    if (effectiveVideoCodec !== 'copy') {
      const videoBitrate = (preserveOriginal && options.videoBitrate === 'copy') 
        ? getBitrateForResolution(resolution)
        : (options.videoBitrate || getBitrateForResolution(resolution));
      
      cmdArray.push('-b:v', videoBitrate);
      cmdArray.push('-maxrate', getMaxBitrateForResolution(resolution));
      cmdArray.push('-bufsize', getBufferSizeForResolution(resolution));
      
      // Add advanced encoding options
      if (options.crf !== undefined) {
        cmdArray.push('-crf', options.crf.toString());
      }
      
      if (options.preset) {
        cmdArray.push('-preset', options.preset);
      }
      
      if (options.profile) {
        cmdArray.push('-profile:v', options.profile);
      }
      
      if (options.level) {
        cmdArray.push('-level', options.level);
      }
      
      if (options.pixelFormat) {
        cmdArray.push('-pix_fmt', options.pixelFormat);
      }
      
      if (options.tune) {
        cmdArray.push('-tune', options.tune);
      }
      
      if (options.fps) {
        cmdArray.push('-r', options.fps.toString());
      }
    }
  }
  
  // Audio codec and mapping (prefer copy in preserve original mode)
  const effectiveAudioCodec = preserveOriginal ? 'copy' : options.audioCodec;
  
  if (effectiveAudioCodec === 'copy') {
    cmdArray.push('-c:a', 'copy');
  } else {
    cmdArray.push('-c:a', mapAudioCodec(effectiveAudioCodec || 'aac'));
    cmdArray.push('-b:a', options.audioBitrate || '128k');
  }
  
  // Map audio stream with '?' to make it optional (handle videos without audio)
  cmdArray.push('-map', '0:a?');
  
  // HLS specific parameters
  cmdArray.push('-hls_time', '10');
  cmdArray.push('-hls_playlist_type', 'vod');
  cmdArray.push('-hls_segment_filename', `/output/${resolution.label}_%03d.ts`);
  cmdArray.push('-hls_flags', 'independent_segments');
  cmdArray.push('-master_pl_name', 'master.m3u8');
  cmdArray.push(`/output/playlist_${resolution.label}.m3u8`);
  
  return cmdArray;
};

/**
 * Enhanced build FFmpeg command for DASH with preserve original support
 */
const buildDashCommand = (sanitizedInputFileName, outputDir, job, resolution, watermarkPath = null) => {
  const options = job.outputOptions;
  const preserveOriginal = options.preserveOriginal;
  const outputPath = `/output/${resolution.label}`;
  
  // Create command array
  const cmdArray = [];
  
  // Input files
  cmdArray.push('-i');
  cmdArray.push(`/input/${sanitizedInputFileName}`);
  
  if (watermarkPath && options.watermark && options.watermark.imageUrl) {
    cmdArray.push('-i');
    cmdArray.push(`/input/${path.basename(watermarkPath)}`);
  }
  
  // Determine effective video codec
  let effectiveVideoCodec = options.videoCodec;
  
  if (preserveOriginal && resolution.label === "original") {
    const needsFilters = options.crop || options.watermark;
    if (!needsFilters) {
      effectiveVideoCodec = 'copy';
    }
  }
  
  // Video codec
  if (effectiveVideoCodec === 'copy' && (options.crop || options.watermark)) {
    logger.warn('Cannot apply filters when using video codec copy. Switching to libx264.');
    cmdArray.push('-c:v', 'libx264');
    effectiveVideoCodec = 'h264';
  } else if (effectiveVideoCodec === 'copy') {
    cmdArray.push('-c:v', 'copy');
  } else {
    cmdArray.push('-c:v', mapVideoCodec(effectiveVideoCodec || 'h264'));
  }
  
  // Initialize videoFilter variable in proper scope
  let videoFilter = null;
  
  // Add video filters
  if (effectiveVideoCodec !== 'copy' || options.crop || options.watermark) {
    videoFilter = buildVideoFilter(job, resolution, null, watermarkPath);
    if (videoFilter) {
      cmdArray.push('-filter_complex', videoFilter);
      // Map the final output stream
      if (options.watermark && watermarkPath) {
        cmdArray.push('-map', '[output]');
      } else if (resolution.label !== "original") {
        cmdArray.push('-map', '[scaled]');
      } else {
        cmdArray.push('-map', '[cropped]');
      }
    }
    
    // Video encoding settings (skip if using copy codec)
    if (effectiveVideoCodec !== 'copy') {
      const videoBitrate = (preserveOriginal && options.videoBitrate === 'copy') 
        ? getBitrateForResolution(resolution)
        : (options.videoBitrate || getBitrateForResolution(resolution));
      
      cmdArray.push('-b:v', videoBitrate);
      cmdArray.push('-maxrate', getMaxBitrateForResolution(resolution));
      cmdArray.push('-bufsize', getBufferSizeForResolution(resolution));
      
      // Add advanced encoding options
      if (options.crf !== undefined) {
        cmdArray.push('-crf', options.crf.toString());
      }
      
      if (options.preset) {
        cmdArray.push('-preset', options.preset);
      }
      
      if (options.profile) {
        cmdArray.push('-profile:v', options.profile);
      }
      
      if (options.level) {
        cmdArray.push('-level', options.level);
      }
      
      if (options.pixelFormat) {
        cmdArray.push('-pix_fmt', options.pixelFormat);
      }
      
      if (options.tune) {
        cmdArray.push('-tune', options.tune);
      }
      
      if (options.fps) {
        cmdArray.push('-r', options.fps.toString());
      }
    }
  }
  
  // Audio codec (prefer copy in preserve original mode)
  const effectiveAudioCodec = preserveOriginal ? 'copy' : options.audioCodec;
  
  if (effectiveAudioCodec === 'copy') {
    cmdArray.push('-c:a', 'copy');
  } else {
    cmdArray.push('-c:a', mapAudioCodec(effectiveAudioCodec || 'aac'));
    cmdArray.push('-b:a', options.audioBitrate || '128k');
  }
  
  // Map audio stream with '?' to make it optional (handle videos without audio)
  cmdArray.push('-map', '0:a?');
  
  // DASH specific parameters
  cmdArray.push('-f', 'dash');
  cmdArray.push('-use_timeline', '1');
  cmdArray.push('-use_template', '1');
  cmdArray.push('-seg_duration', '4');
  cmdArray.push('-adaptation_sets', 'id=0,streams=v id=1,streams=a');
  cmdArray.push('-init_seg_name', `${resolution.label}-init-$RepresentationID$.m4s`);
  cmdArray.push('-media_seg_name', `${resolution.label}-chunk-$RepresentationID$-$Number%05d$.m4s`);
  cmdArray.push(`${outputPath}/manifest.mpd`);
  
  return cmdArray;
};

/**
 * Build FFmpeg command for audio extraction (handle videos without audio)
 */
const buildAudioExtractionCommand = (sanitizedInputFileName, outputFileName, job) => {
  const options = job.outputOptions;
  
  // Create command array
  const cmdArray = [];
  
  // Input file
  cmdArray.push('-i');
  cmdArray.push(`/input/${sanitizedInputFileName}`);
  
  // Audio extraction parameters
  cmdArray.push('-vn'); // No video
  
  // Use copy if preserve original is enabled and format allows
  const effectiveAudioCodec = (options.preserveOriginal && options.audioFormat === 'mp3') 
    ? 'copy' 
    : mapAudioCodec(options.audioCodec || 'aac');
  
  cmdArray.push('-c:a', effectiveAudioCodec);
  
  if (effectiveAudioCodec !== 'copy' && options.audioBitrate) {
    cmdArray.push('-b:a', options.audioBitrate);
  }
  
  // Make audio mapping optional - if no audio stream exists, this will create silence
  // Or we could check if audio exists first, but making it optional is simpler
  cmdArray.push('-f', options.audioFormat || 'mp3');
  
  // Add output path
  cmdArray.push(`/output/${outputFileName}`);
  
  return cmdArray;
};

/**
 * Create a master playlist for HLS from individual playlists
 */
const createHlsMasterPlaylist = async (masterPath, resolutions) => {
  try {
    let masterContent = '#EXTM3U\n#EXT-X-VERSION:3\n';
    
    // Sort resolutions from highest to lowest
    const sortedResolutions = [...resolutions].sort((a, b) => 
      (b.width * b.height) - (a.width * a.height)
    );
    
    for (const resolution of sortedResolutions) {
      const bandwidth = parseInt(getBitrateForResolution(resolution).replace('k', '000'));
      
      masterContent += `#EXT-X-STREAM-INF:BANDWIDTH=${bandwidth},RESOLUTION=${resolution.width}x${resolution.height}\n`;
      masterContent += `playlist_${resolution.label}.m3u8\n`;
    }
    
    await writeFile(masterPath, masterContent);
    logger.info(`Created HLS master playlist at: ${masterPath}`);
    
    return masterPath;
  } catch (error) {
    logger.error(`Error creating HLS master playlist:`, error);
    throw new Error(`Failed to create HLS master playlist: ${error.message}`);
  }
};

/**
 * Create a DASH manifest file
 */
const createDashManifest = async (manifestPath, resolutions) => {
  try {
    let manifestContent = `<?xml version="1.0" encoding="utf-8"?>
<MPD xmlns="urn:mpeg:dash:schema:mpd:2011" minBufferTime="PT1.5S" type="static" mediaPresentationDuration="PT0H3M30.5S" profiles="urn:mpeg:dash:profile:isoff-on-demand:2011">
  <Period duration="PT0H3M30.5S">
    <AdaptationSet segmentAlignment="true" maxWidth="${Math.max(...resolutions.map(r => r.width))}" maxHeight="${Math.max(...resolutions.map(r => r.height))}" maxFrameRate="25" par="16:9">\n`;
    
    // Sort resolutions from highest to lowest
    const sortedResolutions = [...resolutions].sort((a, b) => 
      (b.width * b.height) - (a.width * a.height)
    );
    
    for (const resolution of sortedResolutions) {
      const bandwidth = parseInt(getBitrateForResolution(resolution).replace('k', '000'));
      
      manifestContent += `      <Representation id="${resolution.label}" mimeType="video/mp4" codecs="avc1.4D401F" width="${resolution.width}" height="${resolution.height}" frameRate="25" sar="1:1" startWithSAP="1" bandwidth="${bandwidth}">
        <BaseURL>${resolution.label}/</BaseURL>
        <SegmentBase indexRangeExact="true" indexRange="917-984">
          <Initialization range="0-916"/>
        </SegmentBase>
      </Representation>\n`;
    }
    
    manifestContent += `    </AdaptationSet>
    <AdaptationSet segmentAlignment="true">
      <Representation id="audio" mimeType="audio/mp4" codecs="mp4a.40.2" samplingRate="44100" numChannels="2" bandwidth="128000">
        <AudioChannelConfiguration schemeIdUri="urn:mpeg:dash:23003:3:audio_channel_configuration:2011" value="2"/>
        <BaseURL>audio/</BaseURL>
        <SegmentBase indexRangeExact="true" indexRange="820-887">
          <Initialization range="0-819"/>
        </SegmentBase>
      </Representation>
    </AdaptationSet>
  </Period>
</MPD>`;
    
    await writeFile(manifestPath, manifestContent);
    logger.info(`Created DASH manifest at: ${manifestPath}`);
    
    return manifestPath;
  } catch (error) {
    logger.error(`Error creating DASH manifest:`, error);
    throw new Error(`Failed to create DASH manifest: ${error.message}`);
  }
};

/**
 * Map video codec to FFmpeg codec name
 */
const mapVideoCodec = (codec) => {
  const codecMap = {
    'h264': 'libx264',
    'h265': 'libx265',
    'vp8': 'libvpx',
    'vp9': 'libvpx-vp9',
    'av1': 'libaom-av1',
    'copy': 'copy'
  };
  
  return codecMap[codec] || 'libx264';
};

/**
 * Map audio codec to FFmpeg codec name
 */
const mapAudioCodec = (codec) => {
  const codecMap = {
    'aac': 'aac',
    'mp3': 'libmp3lame',
    'opus': 'libopus',
    'vorbis': 'libvorbis',
    'copy': 'copy'
  };
  
  return codecMap[codec] || 'aac';
};

/**
 * Get appropriate bitrate for resolution (enhanced for preserve original mode)
 */
const getBitrateForResolution = (resolution) => {
  // If resolution is "original", return a reasonable default
  if (resolution.label === "original") {
    return '5000k'; // Default bitrate for original quality
  }
  
  const bitrateMap = {
    '3840x2160': '20000k', // 4K
    '2560x1440': '12000k', // 2K
    '1920x1080': '8000k',  // 1080p
    '1280x720': '5000k',   // 720p
    '854x480': '2500k',    // 480p
    '640x360': '1200k',    // 360p
    '426x240': '700k'      // 240p
  };
  
  const key = `${resolution.width}x${resolution.height}`;
  return bitrateMap[key] || '5000k';
};

/**
 * Get appropriate max bitrate for resolution
 */
const getMaxBitrateForResolution = (resolution) => {
  const bitrate = parseInt(getBitrateForResolution(resolution).replace('k', ''));
  return `${Math.round(bitrate * 1.5)}k`;
};

/**
 * Get appropriate buffer size for resolution
 */
const getBufferSizeForResolution = (resolution) => {
  const bitrate = parseInt(getBitrateForResolution(resolution).replace('k', ''));
  return `${Math.round(bitrate * 2)}k`;
};

module.exports = {
  buildHlsCommand,
  buildDashCommand,
  buildDirectConversionCommand,
  buildAudioExtractionCommand,
  buildStreamingCommandForResolution,
  createHlsMasterPlaylist,
  createDashManifest,
  buildVideoFilter,
  buildWatermarkFilter,
  downloadWatermarkImage
};