export const outputFormats = ["mp4", "webm", "mov", "avi", "mkv", "hls", "dash"];

export const videoCodecs = {
  mp4: ["h264", "h265", "copy"],
  webm: ["vp8", "vp9", "av1", "copy"],
  mov: ["h264", "h265", "copy"],
  avi: ["h264", "copy"],
  mkv: ["h264", "h265", "vp8", "vp9", "av1", "copy"],
  hls: ["h264", "h265", "copy"],
  dash: ["h264", "h265", "vp9", "copy"],
};

export const audioCodecs = {
  mp4: ["aac", "mp3", "copy"],
  webm: ["opus", "vorbis", "copy"],
  mov: ["aac", "mp3", "copy"],
  avi: ["mp3", "copy"],
  mkv: ["aac", "mp3", "opus", "vorbis", "copy"],
  hls: ["aac", "mp3", "copy"],
  dash: ["aac", "mp3", "copy"],
};

export const audioFormats = ["mp3", "aac", "wav", "opus", "none"];

export const presets = [
  "ultrafast",
  "superfast", 
  "veryfast",
  "faster",
  "fast",
  "medium",
  "slow",
  "slower",
  "veryslow",
];

export const profiles = ["baseline", "main", "high"];
export const levels = ["3.0", "3.1", "4.0", "4.1", "4.2", "5.0", "5.1", "5.2"];
export const pixelFormats = [
  "yuv420p",
  "yuv422p", 
  "yuv444p",
  "yuv420p10le",
  "yuv422p10le",
  "yuv444p10le",
];

export const tunes = [
  "film",
  "animation",
  "grain", 
  "stillimage",
  "fastdecode",
  "zerolatency",
];

export const resolutionMap = {
  "2160p": { width: 3840, height: 2160, label: "2160p" },
  "1440p": { width: 2560, height: 1440, label: "1440p" },
  "1080p": { width: 1920, height: 1080, label: "1080p" },
  "720p": { width: 1280, height: 720, label: "720p" },
  "480p": { width: 854, height: 480, label: "480p" },
  "360p": { width: 640, height: 360, label: "360p" },
  "240p": { width: 426, height: 240, label: "240p" },
};

export const defaultTranscodingOptions = {
  // NEW: Preserve original quality toggle
  preserveOriginal: false,
  outputFormat: "mp4",
  resolutions: [
    { width: 1920, height: 1080, label: "1080p" },
    { width: 1280, height: 720, label: "720p" },
  ],
  videoCodec: "h264",
  audioCodec: "aac",
  videoBitrate: "5000k",
  audioBitrate: "128k",
  fps: 30,
  extractAudio: false,
  audioFormat: "none",
  crf: 23,
  preset: "medium",
  profile: "main",
  level: "4.0",
  pixelFormat: "yuv420p",
  twoPass: false,
  tune: undefined, // FIXED: Changed from null to undefined to avoid enum validation errors
};

export const defaultSelectedResolutions = {
  "2160p": false,
  "1440p": false,
  "1080p": true,
  "720p": false,
  "480p": false,
  "360p": false,
  "240p": false,
};