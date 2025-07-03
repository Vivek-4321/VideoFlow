const mongoose = require("mongoose");

const JobSchema = new mongoose.Schema(
  {
    // Input information
    userId: {
      type: String,
      required: true,
      index: true,
    },
    inputUrl: {
      type: String,
      required: true,
    },
    inputFileName: {
      type: String,
      required: true,
    },
    cleanupStatus: {
    type: String,
    enum: ['pending', 'in_progress', 'completed', 'failed'],
    default: 'pending'
  },
  cleanupAttempts: {
    type: Number,
    default: 0
  },
  cleanupCompletedAt: Date,
  lastCleanupAttempt: Date,
  lastCleanupError: String,
  
  // Auto-calculated expiration time (1 hour after completion)
  expiresAt: {
    type: Date,
    index: true // Index for efficient queries
  },
    // Output configuration
    outputFormat: {
      type: String,
      required: true,
      enum: ["mp4", "webm", "mov", "avi", "mkv", "hls", "dash"],
    },
    outputOptions: {
      // NEW: Preserve original quality setting
      preserveOriginal: {
        type: Boolean,
        default: false,
      },
      
      resolutions: [
        {
          width: Number,
          height: Number,
          label: String, // e.g., "720p", "1080p", "original"
        },
      ],
      videoBitrate: String,
      audioBitrate: String,
      videoCodec: {
        type: String,
        enum: ["h264", "h265", "vp8", "vp9", "av1", "copy"],
        default: "h264",
      },
      audioCodec: {
        type: String,
        enum: ["aac", "mp3", "opus", "vorbis", "copy"],
        default: "aac",
      },
      fps: Number,
      extractAudio: Boolean,
      audioFormat: {
        type: String,
        enum: ["mp3", "aac", "wav", "opus", "none"],
        default: "none",
      },
      // Advanced encoding options
      crf: {
        type: Number,
        min: 0,
        max: 51, // Valid range for x264/x265
      },
      preset: {
        type: String,
        enum: [
          "ultrafast",
          "superfast",
          "veryfast",
          "faster",
          "fast",
          "medium",
          "slow",
          "slower",
          "veryslow",
        ],
      },
      profile: {
        type: String,
        enum: ["baseline", "main", "high"],
      },
      level: String, // Like "4.0", "4.1", etc.
      pixelFormat: {
        type: String,
        enum: [
          "yuv420p",
          "yuv422p",
          "yuv444p",
          "yuv420p10le",
          "yuv422p10le",
          "yuv444p10le",
        ],
      },
      twoPass: Boolean,
      tune: {
        type: String,
        enum: [
          "film",
          "animation",
          "grain",
          "stillimage",
          "fastdecode",
          "zerolatency",
        ],
      },
      // Crop settings
      crop: {
        x: {
          type: Number,
          min: 0,
          default: 0,
        },
        y: {
          type: Number,
          min: 0,
          default: 0,
        },
        width: {
          type: Number,
          min: 100,
          required: function () {
            return (
              this.crop &&
              (this.crop.x !== undefined || this.crop.y !== undefined)
            );
          },
        },
        height: {
          type: Number,
          min: 100,
          required: function () {
            return (
              this.crop &&
              (this.crop.x !== undefined || this.crop.y !== undefined)
            );
          },
        },
      },
      // Watermark settings
      watermark: {
        imageUrl: {
          type: String,
          required: function () {
            return (
              this.watermark &&
              (this.watermark.x !== undefined || this.watermark.y !== undefined)
            );
          },
        },
        x: {
          type: Number,
          default: 10,
        },
        y: {
          type: Number,
          default: 10,
        },
        scale: {
          type: Number,
          min: 0.05,
          max: 1.0,
          default: 0.2,
        },
        opacity: {
          type: Number,
          min: 0.1,
          max: 1.0,
          default: 0.7,
        },
        position: {
          type: String,
          enum: [
            "top-left",
            "top-right",
            "bottom-left",
            "bottom-right",
            "center",
          ],
          default: "top-right",
        },
      },
      // Enhanced thumbnail generation settings
      thumbnails: {
        enabled: {
          type: Boolean,
          default: false,
        },
        
        // NEW: Generation mode
        mode: {
          type: String,
          enum: ['interval', 'custom', 'both'],
          default: 'interval',
        },
        
        // Interval settings
        interval: {
          type: Number,
          default: 10, // Generate thumbnail every 10 seconds
          min: 1,
          max: 300,
        },
        
        // NEW: Custom timestamps (HH:MM:SS format)
        customTimestamps: [{
          type: String,
          validate: {
            validator: function(v) {
              // Validate HH:MM:SS format
              return /^([0-1]?[0-9]|2[0-3]):([0-5]?[0-9]):([0-5]?[0-9])$/.test(v);
            },
            message: 'Custom timestamp must be in HH:MM:SS format'
          }
        }],
        
        // Thumbnail dimensions
        width: {
          type: Number,
          default: 160,
          min: 80,
          max: 320,
        },
        height: {
          type: Number,
          default: 90,
          min: 45,
          max: 180,
        },
        spriteColumns: {
          type: Number,
          default: 10, // Number of thumbnails per row in sprite sheet
          min: 5,
          max: 20,
        },
        quality: {
          type: Number,
          default: 85, // JPEG quality for thumbnails
          min: 50,
          max: 100,
        },
        generateSprite: {
          type: Boolean,
          default: true, // Whether to generate sprite sheet
        },
        generateVTT: {
          type: Boolean,
          default: true, // Whether to generate WebVTT file
        },
        
        // NEW: Thumbnail-only mode
        thumbnailOnly: {
          type: Boolean,
          default: false, // If true, skip video transcoding
        },
      },
    },

    // Status tracking
    status: {
      type: String,
      required: true,
      enum: ["pending", "processing", "completed", "failed"],
      default: "pending",
    },
    progress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    error: {
      message: String,
      details: String,
      code: String,
    },

    // Output information
    outputUrls: [
      {
        resolution: String,
        url: String,
      },
    ],
    masterPlaylistUrl: String,
    zipUrl: String,

    // Enhanced thumbnail URLs
    thumbnailUrls: {
      // Interval thumbnails
      individual: [String], // URLs of individual thumbnail images from intervals
      sprite: String, // URL of sprite sheet image (intervals only)
      vtt: String, // URL of WebVTT file (intervals only)
      zip: String, // URL of thumbnails ZIP file (when no sprite sheet)
      
      // NEW: Custom timestamp thumbnails
      custom: [{
        timestamp: String, // HH:MM:SS format
        url: String, // URL of the thumbnail
      }],
      
      // NEW: Combined thumbnails (intervals + custom, sorted chronologically)
      combined: [{
        timestamp: String, // HH:MM:SS format
        url: String, // URL of the thumbnail
        type: {
          type: String,
          enum: ['interval', 'custom'],
          default: 'interval'
        }
      }],
    },

    // Queue information
    queueId: String,
    attempts: {
      type: Number,
      default: 0,
    },

    // Timestamps
    createdAt: {
      type: Date,
      default: Date.now,
    },
    startedAt: Date,
    completedAt: Date,
  },
  {
    timestamps: true,
  },
  
);

// Index for faster status-based queries
JobSchema.index({ status: 1, createdAt: -1 });

JobSchema.pre('save', function(next) {
  // Set expiration time when job is completed
  if (this.status === 'completed' && this.completedAt && !this.expiresAt) {
    this.expiresAt = new Date(this.completedAt.getTime() + (60 * 60 * 1000)); // +1 hour
  }
  next();
});

// Add virtual to check if job is expired
JobSchema.virtual('isExpired').get(function() {
  if (!this.expiresAt) return false;
  return new Date() > this.expiresAt;
});

// Add virtual to get time until expiration
JobSchema.virtual('timeUntilExpiration').get(function() {
  if (!this.expiresAt || this.isExpired) return 0;
  return this.expiresAt.getTime() - new Date().getTime();
});

// NEW: Virtual to check if preserve original mode is enabled
JobSchema.virtual("isPreserveOriginalMode").get(function () {
  return this.outputOptions && this.outputOptions.preserveOriginal === true;
});

// Virtual to check if cropping is enabled
JobSchema.virtual("isCropEnabled").get(function () {
  return (
    this.outputOptions &&
    this.outputOptions.crop &&
    (this.outputOptions.crop.x > 0 ||
      this.outputOptions.crop.y > 0 ||
      this.outputOptions.crop.width < 4096 ||
      this.outputOptions.crop.height < 4096)
  );
});

// Virtual to check if watermarking is enabled
JobSchema.virtual("isWatermarkEnabled").get(function () {
  return (
    this.outputOptions &&
    this.outputOptions.watermark &&
    this.outputOptions.watermark.imageUrl
  );
});

// Virtual to check if thumbnails are enabled
JobSchema.virtual("isThumbnailsEnabled").get(function () {
  return (
    this.outputOptions &&
    this.outputOptions.thumbnails &&
    this.outputOptions.thumbnails.enabled
  );
});

// NEW: Virtual to check if job is thumbnail-only
JobSchema.virtual("isThumbnailOnly").get(function () {
  return (
    this.outputOptions &&
    this.outputOptions.thumbnails &&
    this.outputOptions.thumbnails.thumbnailOnly
  );
});

// NEW: Virtual to check if transcoding is required
JobSchema.virtual("requiresTranscoding").get(function () {
  if (!this.outputOptions) return true;
  
  // If thumbnail-only mode, no video transcoding needed
  if (this.isThumbnailOnly) return false;
  
  // If preserve original is disabled, transcoding is required
  if (!this.outputOptions.preserveOriginal) return true;
  
  // If preserve original is enabled, check if any operations require transcoding
  const needsCrop = this.isCropEnabled;
  const needsWatermark = this.isWatermarkEnabled;
  const needsResolutionChange = this.outputOptions.resolutions && 
    this.outputOptions.resolutions.some(res => res.label !== "original");
  const needsFormatConversion = this.outputFormat && 
    !["mp4", "mov", "avi"].includes(this.outputFormat); // Assume input is commonly mp4/mov/avi
  
  return needsCrop || needsWatermark || needsResolutionChange || needsFormatConversion;
});

// NEW: Method to get appropriate codec based on preserve original setting
JobSchema.methods.getEffectiveVideoCodec = function(originalFormat = 'mp4') {
  if (!this.outputOptions) return 'h264';
  
  if (this.outputOptions.preserveOriginal && !this.requiresTranscoding) {
    return 'copy';
  }
  
  return this.outputOptions.videoCodec || 'h264';
};

// NEW: Method to get appropriate audio codec based on preserve original setting
JobSchema.methods.getEffectiveAudioCodec = function(originalFormat = 'mp4') {
  if (!this.outputOptions) return 'aac';
  
  if (this.outputOptions.preserveOriginal && !this.requiresTranscoding) {
    return 'copy';
  }
  
  return this.outputOptions.audioCodec || 'aac';
};

// Method to get crop filter string for FFmpeg
JobSchema.methods.getCropFilter = function () {
  if (!this.outputOptions || !this.outputOptions.crop) {
    return null;
  }

  const crop = this.outputOptions.crop;
  if (!crop.width || !crop.height) {
    return null;
  }

  // FFmpeg crop filter format: crop=width:height:x:y
  return `crop=${crop.width}:${crop.height}:${crop.x || 0}:${crop.y || 0}`;
};

// Method to get watermark overlay filter for FFmpeg
JobSchema.methods.getWatermarkFilter = function (videoMetadata) {
  if (
    !this.outputOptions ||
    !this.outputOptions.watermark ||
    !this.outputOptions.watermark.imageUrl
  ) {
    return null;
  }

  const watermark = this.outputOptions.watermark;
  const videoWidth = videoMetadata ? videoMetadata.width : 1920;
  const videoHeight = videoMetadata ? videoMetadata.height : 1080;

  // Calculate watermark size based on scale
  const watermarkWidth = Math.round(videoWidth * watermark.scale);
  const watermarkHeight = Math.round(watermarkWidth * 0.3); // Assume 3:1 aspect ratio for scaling

  // Calculate position based on position setting
  let x, y;

  switch (watermark.position) {
    case "top-left":
      x = Math.abs(watermark.x);
      y = Math.abs(watermark.y);
      break;
    case "top-right":
      x = videoWidth - watermarkWidth - Math.abs(watermark.x);
      y = Math.abs(watermark.y);
      break;
    case "bottom-left":
      x = Math.abs(watermark.x);
      y = videoHeight - watermarkHeight - Math.abs(watermark.y);
      break;
    case "bottom-right":
      x = videoWidth - watermarkWidth - Math.abs(watermark.x);
      y = videoHeight - watermarkHeight - Math.abs(watermark.y);
      break;
    case "center":
      x = (videoWidth - watermarkWidth) / 2 + watermark.x;
      y = (videoHeight - watermarkHeight) / 2 + watermark.y;
      break;
    default:
      x = Math.abs(watermark.x);
      y = Math.abs(watermark.y);
  }

  // Ensure positions are within bounds
  x = Math.max(0, Math.min(x, videoWidth - watermarkWidth));
  y = Math.max(0, Math.min(y, videoHeight - watermarkHeight));

  // Return the overlay filter components
  return {
    scale: `scale=${watermarkWidth}:${watermarkHeight}`,
    overlay: `overlay=${Math.round(x)}:${Math.round(y)}:format=auto:alpha=${
      watermark.opacity
    }`,
  };
};

// NEW: Parse timestamp string (HH:MM:SS) to seconds
JobSchema.methods.parseTimestamp = function(timestamp) {
  const parts = timestamp.split(':');
  if (parts.length !== 3) return null;
  
  const hours = parseInt(parts[0]) || 0;
  const minutes = parseInt(parts[1]) || 0;
  const seconds = parseInt(parts[2]) || 0;
  
  return hours * 3600 + minutes * 60 + seconds;
};

// NEW: Format seconds to HH:MM:SS
JobSchema.methods.formatSeconds = function(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

// NEW: Get all thumbnail timestamps (intervals + custom) sorted chronologically
JobSchema.methods.getAllThumbnailTimestamps = function(videoDuration) {
  if (!this.outputOptions || !this.outputOptions.thumbnails || !this.outputOptions.thumbnails.enabled) {
    return [];
  }

  const thumbnails = this.outputOptions.thumbnails;
  const mode = thumbnails.mode || 'interval';
  const timestamps = [];
  
  // Add interval timestamps
  if (mode === 'interval' || mode === 'both') {
    const interval = thumbnails.interval || 10;
    const duration = videoDuration && videoDuration > 0 ? videoDuration : 60;
    
    for (let i = 0; i < duration; i += interval) {
      timestamps.push({
        seconds: i,
        timestamp: this.formatSeconds(i),
        type: 'interval'
      });
    }
  }
  
  // Add custom timestamps
  if (mode === 'custom' || mode === 'both') {
    const customTimestamps = thumbnails.customTimestamps || [];
    
    for (const customTimestamp of customTimestamps) {
      const seconds = this.parseTimestamp(customTimestamp);
      if (seconds !== null) {
        // Check for duplicates
        const isDuplicate = timestamps.some(t => t.seconds === seconds);
        if (!isDuplicate) {
          timestamps.push({
            seconds,
            timestamp: customTimestamp,
            type: 'custom'
          });
        }
      }
    }
  }
  
  // Sort by seconds
  timestamps.sort((a, b) => a.seconds - b.seconds);
  
  return timestamps;
};

// Enhanced method to calculate thumbnail generation parameters
JobSchema.methods.getThumbnailParameters = function (videoDuration) {
  if (
    !this.outputOptions ||
    !this.outputOptions.thumbnails ||
    !this.outputOptions.thumbnails.enabled
  ) {
    console.log('Thumbnails not enabled in job options');
    return null;
  }

  const thumbnails = this.outputOptions.thumbnails;
  const mode = thumbnails.mode || 'interval';
  
  // Get all timestamps
  const allTimestamps = this.getAllThumbnailTimestamps(videoDuration);
  
  // Separate interval and custom timestamps
  const intervalTimestamps = allTimestamps.filter(t => t.type === 'interval');
  const customTimestamps = allTimestamps.filter(t => t.type === 'custom');
  
  // Calculate sprite sheet dimensions (only for interval thumbnails)
  const intervalCount = intervalTimestamps.length;
  const columns = Math.min(thumbnails.spriteColumns || 10, intervalCount);
  const rows = Math.ceil(intervalCount / columns);
  
  const spriteWidth = (thumbnails.width || 160) * columns;
  const spriteHeight = (thumbnails.height || 90) * rows;

  const params = {
    mode,
    
    // All timestamps
    allTimestamps,
    totalThumbnails: allTimestamps.length,
    
    // Interval specific
    intervalTimestamps,
    intervalCount,
    interval: thumbnails.interval || 10,
    
    // Custom specific
    customTimestamps,
    customCount: customTimestamps.length,
    
    // Dimensions
    thumbnailWidth: thumbnails.width || 160,
    thumbnailHeight: thumbnails.height || 90,
    
    // Sprite sheet (intervals only)
    spriteColumns: columns,
    spriteRows: rows,
    spriteWidth,
    spriteHeight,
    
    // Settings
    quality: thumbnails.quality || 85,
    generateSprite: thumbnails.generateSprite !== false && intervalCount > 0,
    generateVTT: thumbnails.generateVTT !== false && intervalCount > 0,
    
    // NEW: Thumbnail-only mode
    thumbnailOnly: thumbnails.thumbnailOnly || false,
  };
  
  console.log('Enhanced thumbnail parameters:', params);
  return params;
};

// Method to get scaled crop for resolution
JobSchema.methods.getScaledCropFilter = function (targetResolution) {
  if (!this.outputOptions || !this.outputOptions.crop) {
    return null;
  }

  const crop = this.outputOptions.crop;
  if (!crop.width || !crop.height || !targetResolution) {
    return null;
  }

  // If preserve original and target is "original", don't scale
  if (this.outputOptions.preserveOriginal && targetResolution.label === "original") {
    return this.getCropFilter();
  }

  // Calculate scale factors
  const scaleX = targetResolution.width / crop.width;
  const scaleY = targetResolution.height / crop.height;

  // Use the smaller scale to maintain aspect ratio
  const scale = Math.min(scaleX, scaleY);

  const scaledWidth = Math.round(crop.width * scale);
  const scaledHeight = Math.round(crop.height * scale);
  const scaledX = Math.round((crop.x || 0) * scale);
  const scaledY = Math.round((crop.y || 0) * scale);

  return `crop=${scaledWidth}:${scaledHeight}:${scaledX}:${scaledY}`;
};

// Method to get scaled watermark filter for resolution
JobSchema.methods.getScaledWatermarkFilter = function (
  targetResolution,
  originalVideoMetadata
) {
  if (
    !this.outputOptions ||
    !this.outputOptions.watermark ||
    !this.outputOptions.watermark.imageUrl
  ) {
    return null;
  }

  if (!targetResolution || !originalVideoMetadata) {
    return this.getWatermarkFilter(originalVideoMetadata);
  }

  // If preserve original and target is "original", don't scale
  if (this.outputOptions.preserveOriginal && targetResolution.label === "original") {
    return this.getWatermarkFilter(originalVideoMetadata);
  }

  const watermark = this.outputOptions.watermark;
  const scaleRatio = targetResolution.width / originalVideoMetadata.width;

  // Scale watermark proportionally
  const scaledWatermarkWidth = Math.round(
    originalVideoMetadata.width * watermark.scale * scaleRatio
  );
  const scaledWatermarkHeight = Math.round(scaledWatermarkWidth * 0.3);

  // Calculate scaled position
  let x, y;

  switch (watermark.position) {
    case "top-left":
      x = Math.abs(watermark.x) * scaleRatio;
      y = Math.abs(watermark.y) * scaleRatio;
      break;
    case "top-right":
      x =
        targetResolution.width -
        scaledWatermarkWidth -
        Math.abs(watermark.x) * scaleRatio;
      y = Math.abs(watermark.y) * scaleRatio;
      break;
    case "bottom-left":
      x = Math.abs(watermark.x) * scaleRatio;
      y =
        targetResolution.height -
        scaledWatermarkHeight -
        Math.abs(watermark.y) * scaleRatio;
      break;
    case "bottom-right":
      x =
        targetResolution.width -
        scaledWatermarkWidth -
        Math.abs(watermark.x) * scaleRatio;
      y =
        targetResolution.height -
        scaledWatermarkHeight -
        Math.abs(watermark.y) * scaleRatio;
      break;
    case "center":
      x =
        (targetResolution.width - scaledWatermarkWidth) / 2 +
        watermark.x * scaleRatio;
      y =
        (targetResolution.height - scaledWatermarkHeight) / 2 +
        watermark.y * scaleRatio;
      break;
    default:
      x = Math.abs(watermark.x) * scaleRatio;
      y = Math.abs(watermark.y) * scaleRatio;
  }

  // Ensure positions are within bounds
  x = Math.max(0, Math.min(x, targetResolution.width - scaledWatermarkWidth));
  y = Math.max(0, Math.min(y, targetResolution.height - scaledWatermarkHeight));

  return {
    scale: `scale=${scaledWatermarkWidth}:${scaledWatermarkHeight}`,
    overlay: `overlay=${Math.round(x)}:${Math.round(y)}:format=auto:alpha=${
      watermark.opacity
    }`,
  };
};

module.exports = mongoose.model("Job", JobSchema);