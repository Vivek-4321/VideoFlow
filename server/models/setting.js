const mongoose = require('mongoose');

const SettingSchema = new mongoose.Schema({
  // System settings
  concurrentJobs: {
    type: Number,
    default: 1,
    min: 1
  },
  maxRetries: {
    type: Number,
    default: 3,
    min: 0
  },
  defaultResolutions: [{
    width: Number,
    height: Number,
    label: String
  }],
  defaultCodecs: {
    video: {
      type: String,
      enum: ['h264', 'h265', 'vp8', 'vp9', 'av1'],
      default: 'h264'
    },
    audio: {
      type: String,
      enum: ['aac', 'mp3', 'opus', 'vorbis'],
      default: 'aac'
    }
  },
  // Paths for temporary storage
  tempPath: {
    type: String,
    default: '/tmp/transcoder'
  },
  // FFmpeg container settings
  ffmpegContainer: {
    image: {
      type: String,
      default: 'jrottenberg/ffmpeg:latest'
    },
    resources: {
      cpuLimit: {
        type: String,
        default: '2'
      },
      memoryLimit: {
        type: String,
        default: '2g'
      }
    }
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Create a singleton pattern for settings
SettingSchema.statics.getSettings = async function() {
  let settings = await this.findOne({ isActive: true });
  
  if (!settings) {
    // Create default settings if none exist
    settings = await this.create({
      concurrentJobs: 1,
      maxRetries: 3,
      defaultResolutions: [
        { width: 1920, height: 1080, label: '1080p' },
        { width: 1280, height: 720, label: '720p' },
        { width: 854, height: 480, label: '480p' },
        { width: 640, height: 360, label: '360p' }
      ]
    });
  }
  
  return settings;
};

module.exports = mongoose.model('Setting', SettingSchema);