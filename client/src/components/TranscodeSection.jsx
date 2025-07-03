import '../styles/TranscodeSection.css';
import { 
  UploadCloud, 
  AlertCircle, 
  Zap, 
  Settings,
  Terminal,
  Package,
  Layers,
  Monitor,
  Tablet,
  Smartphone,
  Activity,
  Grid,
  Shield,
  AlertTriangle,
  Info,
  FileVideo,
  Image,
  Crop,
  Palette
} from 'lucide-react';
import VideoCropSelector from './VideoCropSelector';
import WatermarkSelector from './WatermarkSelector';
import ThumbnailSettings from './ThumbnailSettings';
import { 
  outputFormats, 
  videoCodecs, 
  audioCodecs, 
  resolutionMap 
} from '../utils/constants';

const FileUploadSection = ({ 
  selectedFile, 
  handleFileChange, 
  handleDrop, 
  handleDragOver, 
  uploadError, 
  isUploading, 
  uploadProgress 
}) => {
  return (
    <section className="file-upload-section" aria-label="File upload for video transcoding">
      {/* Retention Policy Warning */}
      <aside className="flowing-card retention-warning-card" role="alert" aria-label="File retention policy warning">
        <header className="retention-warning-header">
          <div className="retention-warning-icon">
            <AlertTriangle size={20} />
          </div>
          <h4 className="retention-warning-title">
            Important: File Retention Policy
          </h4>
        </header>
        <p className="retention-warning-text">
          All processed videos, thumbnails, and related files will be <strong>automatically deleted after 1 hour</strong> of completion. 
          Please download your files promptly after processing.
        </p>
      </aside>

      {/* Upload Area */}
      <article className="flowing-card upload-area">
        <div
          className={`upload-drop-zone ${selectedFile ? 'has-file' : 'no-file'}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onClick={() => document.getElementById("file-upload").click()}
          role="button"
          aria-label="Upload video file"
          tabIndex={0}
        >
          <input
            id="file-upload"
            type="file"
            accept="video/*"
            className="upload-input-hidden"
            onChange={handleFileChange}
            aria-label="Select video file to upload"
          />

          <div className="upload-content">
            <div className={`upload-icon ${selectedFile ? 'has-file' : 'no-file'}`}>
              {selectedFile ? <FileVideo size={32} /> : <UploadCloud size={32} />}
            </div>
            
            {selectedFile ? (
              <div className="upload-file-info">
                <h3 className="upload-file-name">
                  {selectedFile.name}
                </h3>
                <div className="upload-file-details">
                  <span>Size: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB</span>
                  <span>Type: {selectedFile.type}</span>
                </div>
              </div>
            ) : (
              <div className="upload-instructions">
                <h3 className="upload-title">
                  Upload your video
                </h3>
                <p className="upload-description">
                  Drag and drop your video file here, or click to browse
                </p>
                <p className="upload-formats">
                  Supports MP4, AVI, MOV, WMV up to 2GB
                </p>
              </div>
            )}
          </div>
        </div>

        {uploadError && (
          <div className="upload-error" role="alert" aria-live="assertive">
            <AlertCircle size={16} />
            {uploadError}
          </div>
        )}

        {isUploading && (
          <div className="upload-progress" role="progressbar" aria-valuenow={uploadProgress} aria-valuemin="0" aria-valuemax="100">
            <div className="upload-progress-header">
              <span className="upload-progress-label">
                Uploading...
              </span>
              <span className="upload-progress-percentage">
                {Math.round(uploadProgress)}%
              </span>
            </div>
            <div className="upload-progress-bar">
              <div 
                className="upload-progress-fill"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}
      </article>
    </section>
  );
};

const PreserveOriginalToggle = ({ transcodingOptions, setTranscodingOptions }) => {
  const handleToggle = (enabled) => {
    setTranscodingOptions({
      ...transcodingOptions,
      preserveOriginal: enabled,
    });
  };

  return (
    <section className={`flowing-card preserve-original-toggle ${transcodingOptions.preserveOriginal ? 'enabled' : ''}`} aria-label="Preserve original quality settings">
      <header className="preserve-original-header">
        <div className={`preserve-original-icon ${transcodingOptions.preserveOriginal ? 'enabled' : ''}`}>
          <Shield size={28} />
        </div>
        
        <div className="preserve-original-content">
          <h3 className="preserve-original-title">
            Preserve Original Quality
          </h3>
          <p className="preserve-original-description">
            {transcodingOptions.preserveOriginal 
              ? "✓ Maintaining original video settings - only applying requested effects"
              : "Apply selected transcoding settings and effects to video"
            }
          </p>
        </div>

        <label className="preserve-original-switch" aria-label="Toggle preserve original quality">
          <input
            type="checkbox"
            checked={transcodingOptions.preserveOriginal}
            onChange={(e) => handleToggle(e.target.checked)}
            className="preserve-original-switch-input"
          />
          <span className={`preserve-original-slider ${transcodingOptions.preserveOriginal ? 'enabled' : ''}`}>
            <span className={`preserve-original-slider-handle ${transcodingOptions.preserveOriginal ? 'enabled' : ''}`} />
          </span>
        </label>
      </header>
      
      {transcodingOptions.preserveOriginal && (
        <div className="preserve-original-info" role="note">
          <div className="preserve-original-info-header">
            <Info size={16} className="resolution-preserved-icon" />
            <span className="preserve-original-info-title">
              Quality Preservation Mode Active
            </span>
          </div>
          <ul className="preserve-original-info-list">
            <li>Video will maintain original resolution, codec, and bitrate</li>
            <li>Only essential processing for crop/watermark/thumbnails will be applied</li>
            <li>Faster processing with maximum quality preservation</li>
          </ul>
        </div>
      )}
    </section>
  );
};

const BasicSettings = ({ transcodingOptions, setTranscodingOptions, selectedResolutions, setSelectedResolutions }) => {
  return (
    <section className="basic-settings-container" aria-label="Basic transcoding settings">
      
      {/* Preserve Original Toggle */}
      <PreserveOriginalToggle 
        transcodingOptions={transcodingOptions}
        setTranscodingOptions={setTranscodingOptions}
      />

      <div className="basic-settings-grid" role="group" aria-label="Transcoding configuration options">
        
        {/* Basic Settings Card */}
        <article className={`flowing-card basic-settings-card ${transcodingOptions.preserveOriginal ? 'disabled' : ''}`} aria-label="Output format and quality settings">
          <header className="basic-settings-header">
            <div className="basic-settings-icon">
              <Settings size={20} />
            </div>
            <div className="basic-settings-content">
              <h3 className="basic-settings-title">
                Basic Settings
              </h3>
              {transcodingOptions.preserveOriginal && (
                <p className="basic-settings-subtitle">
                  Used only if format conversion needed
                </p>
              )}
            </div>
          </header>
          
          <div className="basic-settings-fields">
            <div className="basic-settings-field">
              <label className="basic-settings-label" htmlFor="output-format-select">
                Output Format
              </label>
              <select
                id="output-format-select"
                value={transcodingOptions.outputFormat}
                onChange={(e) =>
                  setTranscodingOptions({
                    ...transcodingOptions,
                    outputFormat: e.target.value,
                  })
                }
                className="form-select"
                disabled={transcodingOptions.preserveOriginal}
                aria-label="Select output video format"
              >
                {outputFormats.map((format) => (
                  <option key={format} value={format}>
                    {format.toUpperCase()}
                  </option>
                ))}
              </select>
              {transcodingOptions.preserveOriginal && (
                <p className="basic-settings-help">
                  Format will be preserved unless conversion is required
                </p>
              )}
            </div>

            <div className="basic-settings-field">
              <label className="basic-settings-label" htmlFor="quality-preset-select">
                Quality Preset
              </label>
              <select
                id="quality-preset-select"
                value={transcodingOptions.videoBitrate}
                onChange={(e) =>
                  setTranscodingOptions({
                    ...transcodingOptions,
                    videoBitrate: e.target.value,
                  })
                }
                className="form-select"
                disabled={transcodingOptions.preserveOriginal}
                aria-label="Select video quality preset"
              >
                <option value="8000k">High</option>
                <option value="5000k">Medium</option>
                <option value="2500k">Low</option>
              </select>
              {transcodingOptions.preserveOriginal && (
                <p className="basic-settings-help">
                  Original bitrate will be preserved
                </p>
              )}
            </div>
          </div>
        </article>

        {/* Video Codec Card */}
        <VideoCodecSettings 
          transcodingOptions={transcodingOptions}
          setTranscodingOptions={setTranscodingOptions}
          selectedResolutions={selectedResolutions}
          setSelectedResolutions={setSelectedResolutions}
        />

        {/* Audio Codec Card */}
        <AudioCodecSettings 
          transcodingOptions={transcodingOptions}
          setTranscodingOptions={setTranscodingOptions}
        />

        {/* Advanced Options Card */}
        <AdvancedOptions 
          transcodingOptions={transcodingOptions}
          setTranscodingOptions={setTranscodingOptions}
        />
      </div>
    </section>
  );
};

const VideoCodecSettings = ({ transcodingOptions, setTranscodingOptions, selectedResolutions, setSelectedResolutions }) => {
  const isDisabled = transcodingOptions.preserveOriginal;
  
  return (
    <article className={`flowing-card basic-settings-card ${isDisabled ? 'disabled' : ''}`} aria-label="Video codec settings">
      <header className="video-codec-header">
        <div className="video-codec-icon">
          <Terminal size={20} />
        </div>
        <div className="video-codec-content">
          <h3 className="video-codec-title">
            Video Codec
          </h3>
          {isDisabled && (
            <p className="video-codec-subtitle">
              Preserved - copy mode
            </p>
          )}
        </div>
      </header>
      
      <div className="video-codec-fields">
        <fieldset className="video-codec-grid">
          <legend className="visually-hidden">Video codec configuration</legend>
          <div>
            <label className="video-codec-label" htmlFor="video-codec-select">
              Codec
            </label>
            <select
              id="video-codec-select"
              value={transcodingOptions.videoCodec}
              onChange={(e) =>
                setTranscodingOptions({
                  ...transcodingOptions,
                  videoCodec: e.target.value,
                })
              }
              className="form-select"
              disabled={isDisabled}
              aria-label="Select video codec"
            >
              {(videoCodecs[transcodingOptions.outputFormat] || ["h264"]).map((codec) => (
                <option key={codec} value={codec}>
                  {codec.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="video-codec-label" htmlFor="video-bitrate-input">
              Bitrate (kbps)
            </label>
            <input
              id="video-bitrate-input"
              type="number"
              value={parseInt((transcodingOptions.videoBitrate || '5000k').replace('k', ''))}
              onChange={(e) =>
                setTranscodingOptions({
                  ...transcodingOptions,
                  videoBitrate: `${e.target.value}k`,
                })
              }
              className="form-input"
              min="100"
              max="50000"
              disabled={isDisabled}
              aria-label="Enter video bitrate in kbps"
            />
          </div>
        </fieldset>

        <div className="video-codec-grid">
          <div>
            <label className="video-codec-label" htmlFor="crf-input">
              CRF
            </label>
            <input
              id="crf-input"
              type="number"
              min="0"
              max="51"
              value={transcodingOptions.crf}
              onChange={(e) =>
                setTranscodingOptions({
                  ...transcodingOptions,
                  crf: e.target.value,
                  twoPass: false,
                })
              }
              className="form-input"
              disabled={isDisabled}
              aria-label="Constant Rate Factor (CRF)"
            />
          </div>

          <div>
            <label className="video-codec-label" htmlFor="resolution-select">
              Resolution
            </label>
            <select className="form-select" id="resolution-select" disabled={isDisabled} aria-label="Select resolution option">
              <option value="original">
                {isDisabled ? "Original (Preserved)" : "Original"}
              </option>
              <option value="custom">Custom</option>
            </select>
          </div>
        </div>

        {/* Resolution Selection */}
        <ResolutionSelector 
          selectedResolutions={selectedResolutions}
          setSelectedResolutions={setSelectedResolutions}
          disabled={isDisabled}
        />
      </div>
    </article>
  );
};

const ResolutionSelector = ({ selectedResolutions, setSelectedResolutions, disabled = false }) => {
  return (
    <fieldset className="resolution-selector" aria-label="Target Resolutions">
      {disabled ? (
        <div className="resolution-preserved">
          <Shield size={16} className="resolution-preserved-icon" />
          <span className="resolution-preserved-text">
            Original Resolution Preserved
          </span>
        </div>
      ) : (
        <>
          <legend className="resolution-field-label">
            Target Resolutions
          </legend>
          <div className="resolution-grid">
            {Object.keys(resolutionMap).map((res) => (
              <label key={res} className="resolution-option">
                <input
                  type="checkbox"
                  checked={selectedResolutions[res]}
                  onChange={(e) =>
                    setSelectedResolutions({
                      ...selectedResolutions,
                      [res]: e.target.checked,
                    })
                  }
                  aria-label={`${res} resolution (${resolutionMap[res].width} by ${resolutionMap[res].height})`}
                />
                <div className={`resolution-card ${selectedResolutions[res] ? 'selected' : 'unselected'}`}>
                  {res.includes("2160") && <Monitor size={14} />}
                  {res.includes("1440") && <Monitor size={14} />}
                  {res.includes("1080") && <Tablet size={14} />}
                  {res.includes("720") && <Tablet size={14} />}
                  {(res.includes("480") || res.includes("360") || res.includes("240")) && <Smartphone size={14} />}
                  <span className={`resolution-label ${selectedResolutions[res] ? 'selected' : 'unselected'}`}>
                    {res}
                  </span>
                  <span className="resolution-dimensions">
                    {resolutionMap[res].width}×{resolutionMap[res].height}
                  </span>
                </div>
              </label>
            ))}
          </div>
        </>
      )}
    </fieldset>
  );
};

const AudioCodecSettings = ({ transcodingOptions, setTranscodingOptions }) => {
  const isDisabled = transcodingOptions.preserveOriginal;
  
  return (
    <article className={`flowing-card audio-codec-card ${isDisabled ? 'disabled' : ''}`} aria-label="Audio codec settings">
      <header className="audio-codec-header">
        <div className="audio-codec-icon">
          <Package size={20} />
        </div>
        <div className="video-codec-content">
          <h3 className="audio-codec-title">
            Audio Codec
          </h3>
          {isDisabled && (
            <p className="audio-codec-subtitle">
              Preserved - copy mode
            </p>
          )}
        </div>
      </header>
      
      <fieldset className="audio-codec-grid">
        <legend className="visually-hidden">Audio codec configuration</legend>
        <div>
          <label className="audio-codec-label" htmlFor="audio-codec-select">
            Audio Codec
          </label>
          <select
            id="audio-codec-select"
            value={transcodingOptions.audioCodec}
            onChange={(e) =>
              setTranscodingOptions({
                ...transcodingOptions,
                audioCodec: e.target.value,
              })
            }
            className="form-select"
            disabled={isDisabled}
            aria-label="Select audio codec"
          >
            {(audioCodecs[transcodingOptions.outputFormat] || ["aac"]).map((codec) => (
              <option key={codec} value={codec}>
                {codec.toUpperCase()}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="audio-codec-label" htmlFor="audio-bitrate-input">
            Audio Bitrate (kbps)
          </label>
          <input
            type="number"
            id="audio-bitrate-input"
            value={parseInt((transcodingOptions.audioBitrate || '128k').replace('k', ''))}
            onChange={(e) =>
              setTranscodingOptions({
                ...transcodingOptions,
                audioBitrate: `${e.target.value}k`,
              })
            }
            className="form-input"
            min="32"
            max="320"
            disabled={isDisabled}
            aria-label="Enter audio bitrate in kbps"
          />
        </div>
      </fieldset>
      
      {isDisabled && (
        <p className="audio-codec-help">
          Using 'copy' to preserve original audio
        </p>
      )}
    </article>
  );
};

const AdvancedOptions = ({ transcodingOptions, setTranscodingOptions }) => {
  const isDisabled = transcodingOptions.preserveOriginal;
  
  return (
    <section className={`flowing-card advanced-options-card ${isDisabled ? 'disabled' : ''}`} aria-label="Advanced transcoding options">
      <header className="advanced-options-header">
        <div className="advanced-options-icon">
          <Layers size={20} />
        </div>
        <div className="video-codec-content">
          <h3 className="advanced-options-title">
            Advanced Options
          </h3>
          {isDisabled && (
            <p className="advanced-options-subtitle">
              Disabled in preserve mode
            </p>
          )}
        </div>
      </header>
      
      {/* Encoding Settings Grid */}
      <fieldset className="advanced-options-grid">
        <legend className="visually-hidden">Advanced Encoding Settings</legend>
        <div>
          <label className="advanced-options-label" htmlFor="preset-select">
            Preset
          </label>
          <select
            id="preset-select"
            value={transcodingOptions.preset}
            onChange={(e) =>
              setTranscodingOptions({
                ...transcodingOptions,
                preset: e.target.value,
              })
            }
            className="form-select"
            disabled={isDisabled}
            aria-label="Encoding preset"
          >
            <option value="ultrafast">Ultra Fast</option>
            <option value="superfast">Super Fast</option>
            <option value="veryfast">Very Fast</option>
            <option value="faster">Faster</option>
            <option value="fast">Fast</option>
            <option value="medium">Medium</option>
            <option value="slow">Slow</option>
            <option value="slower">Slower</option>
            <option value="veryslow">Very Slow</option>
          </select>
        </div>

        <div>
          <label className="advanced-options-form-label" htmlFor="profile-select">
            Profile
          </label>
          <select
            id="profile-select"
            value={transcodingOptions.profile}
            onChange={(e) =>
              setTranscodingOptions({
                ...transcodingOptions,
                profile: e.target.value,
              })
            }
            className="form-select"
            disabled={isDisabled}
            aria-label="Encoding profile"
          >
            <option value="baseline">Baseline</option>
            <option value="main">Main</option>
            <option value="high">High</option>
          </select>
        </div>

        <div>
          <label className="advanced-options-form-label" htmlFor="level-select">
            Level
          </label>
          <select
            id="level-select"
            value={transcodingOptions.level}
            onChange={(e) =>
              setTranscodingOptions({
                ...transcodingOptions,
                level: e.target.value,
              })
            }
            className="form-select"
            disabled={isDisabled}
            aria-label="Encoding level"
          >
            <option value="3.0">3.0</option>
            <option value="3.1">3.1</option>
            <option value="4.0">4.0</option>
            <option value="4.1">4.1</option>
            <option value="4.2">4.2</option>
            <option value="5.0">5.0</option>
            <option value="5.1">5.1</option>
            <option value="5.2">5.2</option>
          </select>
        </div>

        <div>
          <label className="advanced-options-form-label" htmlFor="pixel-format-select">
            Pixel Format
          </label>
          <select
            id="pixel-format-select"
            value={transcodingOptions.pixelFormat}
            onChange={(e) =>
              setTranscodingOptions({
                ...transcodingOptions,
                pixelFormat: e.target.value,
              })
            }
            className="form-select"
            disabled={isDisabled}
            aria-label="Pixel format"
          >
            <option value="yuv420p">YUV 4:2:0 8-bit</option>
            <option value="yuv422p">YUV 4:2:2 8-bit</option>
            <option value="yuv444p">YUV 4:4:4 8-bit</option>
            <option value="yuv420p10le">YUV 4:2:0 10-bit</option>
            <option value="yuv422p10le">YUV 4:2:2 10-bit</option>
            <option value="yuv444p10le">YUV 4:4:4 10-bit</option>
          </select>
        </div>

        <div>
          <label className="advanced-options-form-label" htmlFor="tune-select">
            Tune
          </label>
          <select
            id="tune-select"
            value={transcodingOptions.tune || ""}
            onChange={(e) =>
              setTranscodingOptions({
                ...transcodingOptions,
                tune: e.target.value || undefined,
              })
            }
            className="form-select"
            disabled={isDisabled}
            aria-label="Encoding tune"
          >
            <option value="">None</option>
            <option value="film">Film</option>
            <option value="animation">Animation</option>
            <option value="grain">Grain</option>
            <option value="stillimage">Still Image</option>
            <option value="fastdecode">Fast Decode</option>
            <option value="zerolatency">Zero Latency</option>
          </select>
        </div>
      </fieldset>

      {/* Advanced Options Toggles */}
      <div className="advanced-options-toggles" role="group" aria-label="Advanced encoding toggles">
        {[
          { 
            key: 'twoPass', 
            icon: <Layers size={16} />, 
            title: 'Two-Pass Encoding', 
            description: isDisabled ? "Disabled - using direct copy" : "Better quality but slower processing",
            disabled: transcodingOptions.crf || isDisabled,
            onChange: (checked) => setTranscodingOptions({
              ...transcodingOptions,
              twoPass: checked,
              crf: checked ? "" : transcodingOptions.crf,
            })
          },
          { 
            key: 'hls', 
            icon: <Activity size={16} />, 
            title: 'Generate HLS', 
            description: isDisabled ? "Disabled - preserving original format" : "HTTP Live Streaming format",
            disabled: isDisabled,
            checked: transcodingOptions.outputFormat === 'hls',
            onChange: (checked) => setTranscodingOptions({
              ...transcodingOptions,
              outputFormat: checked ? 'hls' : 'mp4',
            })
          },
          { 
            key: 'dash', 
            icon: <Grid size={16} />, 
            title: 'Generate MPEG-DASH', 
            description: isDisabled ? "Disabled - preserving original format" : "Dynamic Adaptive Streaming format",
            disabled: isDisabled,
            checked: transcodingOptions.outputFormat === 'dash',
            onChange: (checked) => setTranscodingOptions({
              ...transcodingOptions,
              outputFormat: checked ? 'dash' : 'mp4',
            })
          }
        ].map((option) => (
          <label key={option.key} className={`advanced-option-toggle ${option.disabled ? 'disabled' : ''}`}>
            <input
              type="checkbox"
              checked={option.checked !== undefined ? option.checked : transcodingOptions[option.key]}
              onChange={(e) => option.onChange(e.target.checked)}
              disabled={option.disabled}
              style={{ display: 'none' }}
              aria-label={option.title}
            />
            <div className={`advanced-option-icon ${(option.checked !== undefined ? option.checked : transcodingOptions[option.key]) && !option.disabled ? 'enabled' : ''}`}>
              {option.icon}
            </div>
            <div className="advanced-option-content">
              <div className="advanced-option-title">
                {option.title}
              </div>
              <div className="advanced-option-description">
                {option.description}
              </div>
            </div>
          </label>
        ))}
      </div>
    </section>
  );
};

const TabNavigation = ({ expandedSection, setExpandedSection, selectedFile }) => {
  const tabs = [
    { id: 'basic', label: 'Basic Settings', icon: Settings },
    { id: 'crop', label: 'Crop', icon: Crop, requiresFile: true },
    { id: 'watermark', label: 'Watermark', icon: Palette, requiresFile: true },
    { id: 'thumbnails', label: 'Thumbnails', icon: Image, requiresFile: true }
  ];

  return (
    <nav className="flowing-card tab-navigation" aria-label="Transcoding Options Tabs">
      <div className="tab-navigation-header">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = expandedSection === tab.id;
          const isDisabled = tab.requiresFile && !selectedFile;
          
          return (
            <button
              key={tab.id}
              onClick={() => !isDisabled && setExpandedSection(tab.id)}
              disabled={isDisabled}
              className={`tab-button ${isActive ? 'active' : isDisabled ? 'disabled' : 'inactive'}`}
              aria-selected={isActive}
              role="tab"
              aria-controls={`${tab.id}-panel`}
              id={`${tab.id}-tab`}
              aria-label={`${tab.label} ${isDisabled ? '(requires video file)' : ''}`}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

const TranscodeSection = ({ 
  selectedFile,
  handleFileChange,
  handleDrop,
  handleDragOver,
  uploadError,
  isUploading,
  uploadProgress,
  expandedSection,
  setExpandedSection,
  transcodingOptions,
  setTranscodingOptions,
  selectedResolutions,
  setSelectedResolutions,
  cropSettings,
  onCropChange,
  onToggleCrop,
  watermarkSettings,
  onWatermarkChange,
  onToggleWatermark,
  thumbnailSettings,
  onThumbnailChange,
  onToggleThumbnails,
  handleFileUpload
}) => {
  const canProceed = () => {
    if (!selectedFile) return false;
    
    if (transcodingOptions.preserveOriginal) {
      return true;
    } else {
      return transcodingOptions.resolutions?.length > 0;
    }
  };

  const getButtonText = () => {
    if (isUploading) return "Processing...";
    if (transcodingOptions.preserveOriginal) return "Process with Original Quality";
    return "Start Transcoding";
  };

  const getHelpText = () => {
    if (!selectedFile) return "Please upload a video file first";
    if (transcodingOptions.preserveOriginal) return "Ready to process with quality preservation";
    if (transcodingOptions.resolutions?.length === 0) return "Please select at least one resolution";
    return "Ready to start transcoding";
  };

  return (
    <section className="transcode-main-section">
      {/* Header Section */}
      <header className="section-header transcode-section-header">
        <h1 className="section-title">Video Transcoder</h1>
        <p className="section-description">
          Upload your video and configure processing settings
        </p>
      </header>

      {/* File Upload */}
      <FileUploadSection 
        selectedFile={selectedFile}
        handleFileChange={handleFileChange}
        handleDrop={handleDrop}
        handleDragOver={handleDragOver}
        uploadError={uploadError}
        isUploading={isUploading}
        uploadProgress={uploadProgress}
      />

      {/* Tab Navigation */}
      <TabNavigation 
        expandedSection={expandedSection}
        setExpandedSection={setExpandedSection}
        selectedFile={selectedFile}
      />

      {/* Tab Content */}
      <div className="tab-content-section">
        {expandedSection === "basic" && (
          <BasicSettings 
            transcodingOptions={transcodingOptions}
            setTranscodingOptions={setTranscodingOptions}
            selectedResolutions={selectedResolutions}
            setSelectedResolutions={setSelectedResolutions}
          />
        )}

        {expandedSection === "crop" && selectedFile && (
          <div className="flowing-card tab-content-card">
            <VideoCropSelector
              videoFile={selectedFile}
              cropSettings={cropSettings}
              onCropChange={onCropChange}
              onToggleCrop={onToggleCrop}
              preserveOriginal={transcodingOptions.preserveOriginal}
            />
          </div>
        )}

        {expandedSection === "watermark" && selectedFile && (
          <div className="flowing-card tab-content-card">
            <WatermarkSelector
              videoFile={selectedFile}
              watermarkSettings={watermarkSettings}
              onWatermarkChange={onWatermarkChange}
              onToggleWatermark={onToggleWatermark}
              preserveOriginal={transcodingOptions.preserveOriginal}
            />
          </div>
        )}

        {expandedSection === "thumbnails" && selectedFile && (
          <div className="flowing-card tab-content-card">
            <ThumbnailSettings
              videoFile={selectedFile}
              thumbnailSettings={thumbnailSettings}
              onThumbnailChange={onThumbnailChange}
              onToggleThumbnails={onToggleThumbnails}
              preserveOriginal={transcodingOptions.preserveOriginal}
            />
          </div>
        )}

        {(expandedSection === "crop" || expandedSection === "watermark" || expandedSection === "thumbnails") && !selectedFile && (
          <div className="empty-state">
            <div className="empty-icon">
              <UploadCloud size={48} />
            </div>
            <h3 className="empty-title">Upload a video first</h3>
            <p className="empty-description">
              Please upload a video file to access {expandedSection} settings
            </p>
          </div>
        )}
      </div>

      {/* Process Button */}
      <div className="process-button-section">
        <button
          onClick={handleFileUpload}
          disabled={!canProceed() || isUploading}
          className={`btn btn-large process-button ${
            transcodingOptions.preserveOriginal && !isUploading ? 'success' :
            canProceed() && !isUploading ? 'primary' : ''
          }`}
        >
          {isUploading ? (
            <>
              <div className="spinner"></div>
              <span>Processing...</span>
            </>
          ) : (
            <>
              {transcodingOptions.preserveOriginal ? <Shield size={20} /> : <Zap size={20} />}
              <span>{getButtonText()}</span>
            </>
          )}
        </button>
        
        <p className={`process-button-help ${canProceed() ? 'success' : 'error'}`}>
          {getHelpText()}
        </p>
      </div>

    </section>
  );
};

export default TranscodeSection;