export const formatDate = (dateString) => {
  return new Date(dateString).toLocaleString();
};

export const getStatusColor = (status) => {
  switch (status) {
    case "pending":
      return "status-pending";
    case "processing":
      return "status-processing";
    case "completed":
      return "status-completed";
    case "failed":
      return "status-failed";
    case "expired":
      return "status-expired"; // New status
    default:
      return "";
  }
};

export const formatTime = (time) => {
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const calculateAspectRatio = (width, height) => {
  return (width / height).toFixed(2);
};

export const validateTranscodingOptions = (options, selectedResolutions) => {
  const errors = [];
  
  if (!options.outputFormat) {
    errors.push("Please select an output format.");
  }
  
  // In preserve original mode, resolution validation is relaxed
  if (!options.preserveOriginal) {
    if (Object.values(selectedResolutions).every(val => !val)) {
      errors.push("Please select at least one resolution.");
    }
  }
  
  // Skip bitrate validation in preserve original mode
  if (!options.preserveOriginal) {
    if (options.videoBitrate && parseInt(options.videoBitrate) < 100) {
      errors.push("Video bitrate must be at least 100 kbps.");
    }
    
    if (options.audioBitrate && parseInt(options.audioBitrate) < 32) {
      errors.push("Audio bitrate must be at least 32 kbps.");
    }
  }
  
  return errors;
};

// FIXED: Helper function to filter out null/undefined values from an object
const filterNullUndefined = (obj) => {
  const filtered = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== null && value !== undefined) {
      filtered[key] = value;
    }
  }
  return filtered;
};

export const buildJobData = (user, downloadURL, selectedFile, transcodingOptions, cropSettings, watermarkSettings, thumbnailSettings, watermarkUrl) => {
  // Helper function to get effective codec settings based on preserve original mode
  const getEffectiveCodecs = () => {
    if (transcodingOptions.preserveOriginal) {
      // Check if transcoding is absolutely necessary
      const needsFilters = cropSettings.enabled || watermarkSettings.enabled;
      const needsFormatChange = selectedFile.type !== `video/${transcodingOptions.outputFormat}`;
      const needsResolutionChange = transcodingOptions.resolutions.some(res => res.label !== "original");
      
      // If no transcoding needed, use copy
      if (!needsFilters && !needsFormatChange && !needsResolutionChange) {
        return {
          videoCodec: 'copy',
          audioCodec: 'copy'
        };
      }
      
      // If minimal transcoding needed, use copy where possible
      return {
        videoCodec: needsFilters || needsResolutionChange ? transcodingOptions.videoCodec : 'copy',
        audioCodec: 'copy' // Audio can usually remain copy unless format requires specific codec
      };
    }
    
    // Normal mode - use selected codecs
    return {
      videoCodec: transcodingOptions.videoCodec,
      audioCodec: transcodingOptions.audioCodec
    };
  };

  // Helper function to get effective resolutions
  const getEffectiveResolutions = () => {
    if (transcodingOptions.preserveOriginal) {
      // Return original resolution marker
      return [{ width: null, height: null, label: "original" }];
    }
    return transcodingOptions.resolutions;
  };

  // Helper function to get effective bitrates
  const getEffectiveBitrates = () => {
    if (transcodingOptions.preserveOriginal) {
      // Use original bitrates - these will be ignored if using copy codecs
      return {
        videoBitrate: "copy",
        audioBitrate: "copy"
      };
    }
    return {
      videoBitrate: transcodingOptions.videoBitrate,
      audioBitrate: transcodingOptions.audioBitrate
    };
  };

  // FIXED: Properly build thumbnail settings object with ALL fields
  const buildThumbnailSettings = () => {
    if (!thumbnailSettings.enabled) {
      return undefined;
    }

    const thumbnailConfig = {
      enabled: true,
      mode: thumbnailSettings.mode || 'interval', // FIXED: Include mode
      
      // Interval settings
      interval: thumbnailSettings.interval || 10,
      
      // FIXED: Include custom timestamps
      customTimestamps: thumbnailSettings.customTimestamps || [],
      
      // Thumbnail dimensions
      width: thumbnailSettings.width || 160,
      height: thumbnailSettings.height || 90,
      spriteColumns: thumbnailSettings.spriteColumns || 10,
      quality: thumbnailSettings.quality || 85,
      
      // Output options
      generateSprite: thumbnailSettings.generateSprite !== false,
      generateVTT: thumbnailSettings.generateVTT !== false,
      
      // FIXED: Include thumbnail-only mode
      thumbnailOnly: thumbnailSettings.thumbnailOnly || false,
    };

    console.log('🔧 Building thumbnail config:', thumbnailConfig);
    return thumbnailConfig;
  };

  const effectiveCodecs = getEffectiveCodecs();
  const effectiveResolutions = getEffectiveResolutions();
  const effectiveBitrates = getEffectiveBitrates();

  // FIXED: Build advanced options object and filter out null/undefined values
  const buildAdvancedOptions = () => {
    if (transcodingOptions.preserveOriginal) {
      // In preserve original mode, return empty object (no advanced options)
      return {};
    }

    // Build advanced options object
    const advancedOptions = {
      crf: transcodingOptions.crf ? parseInt(transcodingOptions.crf) : undefined,
      preset: transcodingOptions.preset || undefined,
      profile: transcodingOptions.profile || undefined,
      level: transcodingOptions.level || undefined,
      pixelFormat: transcodingOptions.pixelFormat || undefined,
      twoPass: transcodingOptions.twoPass || false,
      tune: transcodingOptions.tune || undefined, // FIXED: Don't pass null values
    };

    // FIXED: Filter out null/undefined values to prevent schema validation errors
    return filterNullUndefined(advancedOptions);
  };

  const advancedOptions = buildAdvancedOptions();

  const jobData = {
    userId: user.uid,
    inputUrl: downloadURL,
    inputFileName: selectedFile.name,
    outputFormat: transcodingOptions.outputFormat,
    outputOptions: {
      // Include preserve original setting
      preserveOriginal: transcodingOptions.preserveOriginal,
      
      resolutions: effectiveResolutions,
      videoBitrate: effectiveBitrates.videoBitrate,
      audioBitrate: effectiveBitrates.audioBitrate,
      videoCodec: effectiveCodecs.videoCodec,
      audioCodec: effectiveCodecs.audioCodec,
      fps: parseInt(transcodingOptions.fps),
      extractAudio: transcodingOptions.extractAudio,
      audioFormat: transcodingOptions.extractAudio
        ? transcodingOptions.audioFormat
        : "none",
      
      // FIXED: Spread the filtered advanced options instead of individual fields
      ...advancedOptions,
      
      // Always include crop/watermark/thumbnail settings regardless of preserve original mode
      crop: cropSettings.enabled
        ? {
            x: Math.round(cropSettings.x),
            y: Math.round(cropSettings.y),
            width: Math.round(cropSettings.width),
            height: Math.round(cropSettings.height),
          }
        : undefined,
      watermark: watermarkSettings.enabled
        ? {
            imageUrl: watermarkUrl,
            x: Math.round(watermarkSettings.x),
            y: Math.round(watermarkSettings.y),
            scale: watermarkSettings.scale,
            opacity: watermarkSettings.opacity,
            position: watermarkSettings.position,
          }
        : undefined,
      
      // FIXED: Use the proper thumbnail settings builder
      thumbnails: buildThumbnailSettings(),
    },
  };

  // FIXED: Filter the entire outputOptions object to remove any remaining null/undefined values
  jobData.outputOptions = filterNullUndefined(jobData.outputOptions);

  console.log('🚀 Final job data being sent:', JSON.stringify(jobData, null, 2));
  return jobData;
};