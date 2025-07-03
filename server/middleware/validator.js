const Joi = require("joi");
const logger = require("../utils/logger");

/**
 * Validate job creation request with additional validation for incompatible options
 */
const validateJobCreation = (req, res, next) => {
  const schema = Joi.object({
    inputUrl: Joi.string().uri().required(),
    inputFileName: Joi.string().required(),
    outputFormat: Joi.string()
      .valid("mp4", "webm", "mov", "avi", "mkv", "hls", "dash")
      .required(),
    outputOptions: Joi.object({
      resolutions: Joi.array().items(
        Joi.object({
          width: Joi.number().integer().required(),
          height: Joi.number().integer().required(),
          label: Joi.string().required(),
        })
      ),
      videoBitrate: Joi.string(),
      audioBitrate: Joi.string(),
      videoCodec: Joi.string().valid(
        "h264",
        "h265",
        "vp8",
        "vp9",
        "av1",
        "copy"
      ),
      audioCodec: Joi.string().valid("aac", "mp3", "opus", "vorbis", "copy"),
      fps: Joi.number().integer(),
      extractAudio: Joi.boolean().default(false),
      audioFormat: Joi.string()
        .valid("mp3", "aac", "wav", "opus", "none")
        .default("none"),
      // New advanced encoding options
      crf: Joi.number().integer().min(0).max(51),
      preset: Joi.string().valid(
        "ultrafast",
        "superfast",
        "veryfast",
        "faster",
        "fast",
        "medium",
        "slow",
        "slower",
        "veryslow"
      ),
      profile: Joi.string().valid("baseline", "main", "high"),
      level: Joi.string().pattern(/^\d+\.\d+$/), // Format like "4.0", "4.1", etc.
      pixelFormat: Joi.string().valid(
        "yuv420p",
        "yuv422p",
        "yuv444p",
        "yuv420p10le",
        "yuv422p10le",
        "yuv444p10le"
      ),
      twoPass: Joi.boolean().default(false),
      tune: Joi.string().valid(
        "film",
        "animation",
        "grain",
        "stillimage",
        "fastdecode",
        "zerolatency"
      ),
    }).required(),
  });

  // First validate the basic schema
  const { error } = schema.validate(req.body);

  if (error) {
    logger.error(`Validation error: ${error.message}`);
    return res.status(400).json({
      success: false,
      error: `Validation error: ${error.message}`,
    });
  }

  // Additional validation for incompatible options
  const options = req.body.outputOptions;

  // Check for CRF and two-pass incompatibility
  if (options.crf !== undefined && options.twoPass === true) {
    logger.error(
      "Validation error: CRF and two-pass encoding are incompatible"
    );
    return res.status(400).json({
      success: false,
      error:
        "Validation error: CRF and two-pass encoding cannot be used together",
    });
  }

  // Check for incompatible codec with profile/level
  if (
    (options.videoCodec === "vp8" ||
      options.videoCodec === "vp9" ||
      options.videoCodec === "av1") &&
    (options.profile || options.level)
  ) {
    logger.error(
      `Validation error: Profile/level are only valid for H.264/H.265`
    );
    return res.status(400).json({
      success: false,
      error: `Validation error: Profile and level settings only apply to H.264/H.265 codecs`,
    });
  }

  // Check pixel format compatibility with codec
  if (options.pixelFormat) {
    const is10Bit = options.pixelFormat.includes("10le");
    if (is10Bit && options.videoCodec === "h264") {
      logger.error(
        "Validation error: 10-bit pixel formats are not compatible with h264"
      );
      return res.status(400).json({
        success: false,
        error:
          "Validation error: 10-bit pixel formats require H.265, VP9, or AV1 codec",
      });
    }
  }

  next();
};

/**
 * Validate settings update request
 */
const validateSettingsUpdate = (req, res, next) => {
  const schema = Joi.object({
    concurrentJobs: Joi.number().integer().min(1),
    maxRetries: Joi.number().integer().min(0),
    defaultResolutions: Joi.array().items(
      Joi.object({
        width: Joi.number().integer().required(),
        height: Joi.number().integer().required(),
        label: Joi.string().required()
      })
    ),
    defaultCodecs: Joi.object({
      video: Joi.string().valid('h264', 'h265', 'vp8', 'vp9', 'av1'),
      audio: Joi.string().valid('aac', 'mp3', 'opus', 'vorbis')
    }),
    ffmpegContainer: Joi.object({
      image: Joi.string(),
      resources: Joi.object({
        cpuLimit: Joi.string(),
        memoryLimit: Joi.string()
      })
    })
  });

  const { error } = schema.validate(req.body);

  if (error) {
    logger.error(`Validation error: ${error.message}`);
    return res.status(400).json({
      success: false,
      error: `Validation error: ${error.message}`
    });
  }

  next();
};

module.exports = {
  validateJobCreation,
  validateSettingsUpdate
};
