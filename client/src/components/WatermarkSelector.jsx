import { useState, useRef, useEffect } from 'react';
import { 
  RotateCcw, 
  Move, 
  Upload, 
  Monitor, 
  Info,
  Palette,
  Shield,
  CheckCircle
} from 'lucide-react';
import '../styles/WatermarkSelector.css';

const WatermarkSelector = ({ 
  videoFile, 
  watermarkSettings, 
  onWatermarkChange, 
  onToggleWatermark,
  preserveOriginal = false
}) => {
  const videoRef = useRef(null);
  const watermarkOverlayRef = useRef(null);
  const fileInputRef = useRef(null);
  
  const [videoMetadata, setVideoMetadata] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [previewScale, setPreviewScale] = useState(1);
  const [watermarkImageUrl, setWatermarkImageUrl] = useState(null);

  // Position presets
  const positionPresets = [
    { name: 'Top Left', position: 'top-left', x: 10, y: 10 },
    { name: 'Top Right', position: 'top-right', x: -10, y: 10 },
    { name: 'Bottom Left', position: 'bottom-left', x: 10, y: -10 },
    { name: 'Bottom Right', position: 'bottom-right', x: -10, y: -10 },
    { name: 'Center', position: 'center', x: 0, y: 0 }
  ];

  useEffect(() => {
    if (videoFile && videoRef.current) {
      const video = videoRef.current;
      
      const handleLoadedMetadata = () => {
        const metadata = {
          width: video.videoWidth,
          height: video.videoHeight,
          duration: video.duration
        };
        setVideoMetadata(metadata);
        
        // Initialize watermark settings if not set
        if (!watermarkSettings.enabled) {
          const initialWatermark = {
            enabled: false,
            x: 10,
            y: 10,
            scale: 0.2,
            opacity: 0.7,
            position: 'top-right'
          };
          onWatermarkChange(initialWatermark);
        }
        
        updatePreviewScale();
      };
      
      video.addEventListener('loadedmetadata', handleLoadedMetadata);
      video.src = URL.createObjectURL(videoFile);
      
      return () => {
        video.removeEventListener('loadedmetadata', handleLoadedMetadata);
        URL.revokeObjectURL(video.src);
      };
    }
  }, [videoFile]);

  useEffect(() => {
    // Create preview URL for watermark image
    if (watermarkSettings.imageFile) {
      const url = URL.createObjectURL(watermarkSettings.imageFile);
      setWatermarkImageUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setWatermarkImageUrl(null);
    }
  }, [watermarkSettings.imageFile]);

  const updatePreviewScale = () => {
    if (videoRef.current && videoMetadata) {
      const container = videoRef.current.parentElement;
      const containerWidth = container.clientWidth - 40;
      const containerHeight = 400;
      
      const scaleX = containerWidth / videoMetadata.width;
      const scaleY = containerHeight / videoMetadata.height;
      const scale = Math.min(scaleX, scaleY, 1);
      
      setPreviewScale(scale);
    }
  };

  useEffect(() => {
    updatePreviewScale();
    window.addEventListener('resize', updatePreviewScale);
    return () => window.removeEventListener('resize', updatePreviewScale);
  }, [videoMetadata]);

  const getScaledDimensions = () => {
    if (!videoMetadata) return { width: 0, height: 0 };
    return {
      width: videoMetadata.width * previewScale,
      height: videoMetadata.height * previewScale
    };
  };

  const getWatermarkPosition = () => {
    if (!watermarkSettings.enabled || !videoMetadata) return { x: 0, y: 0 };
    
    const scaledDimensions = getScaledDimensions();
    const watermarkSize = {
      width: scaledDimensions.width * watermarkSettings.scale,
      height: scaledDimensions.width * watermarkSettings.scale * 0.3 // Assume 3:1 aspect ratio for watermark
    };
    
    let x, y;
    
    // Convert relative position to absolute coordinates
    if (watermarkSettings.position === 'top-left') {
      x = Math.abs(watermarkSettings.x) * previewScale;
      y = Math.abs(watermarkSettings.y) * previewScale;
    } else if (watermarkSettings.position === 'top-right') {
      x = scaledDimensions.width - watermarkSize.width - Math.abs(watermarkSettings.x) * previewScale;
      y = Math.abs(watermarkSettings.y) * previewScale;
    } else if (watermarkSettings.position === 'bottom-left') {
      x = Math.abs(watermarkSettings.x) * previewScale;
      y = scaledDimensions.height - watermarkSize.height - Math.abs(watermarkSettings.y) * previewScale;
    } else if (watermarkSettings.position === 'bottom-right') {
      x = scaledDimensions.width - watermarkSize.width - Math.abs(watermarkSettings.x) * previewScale;
      y = scaledDimensions.height - watermarkSize.height - Math.abs(watermarkSettings.y) * previewScale;
    } else { // center
      x = (scaledDimensions.width - watermarkSize.width) / 2 + watermarkSettings.x * previewScale;
      y = (scaledDimensions.height - watermarkSize.height) / 2 + watermarkSettings.y * previewScale;
    }
    
    return { x, y, width: watermarkSize.width, height: watermarkSize.height };
  };

  const handleWatermarkImageUpload = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      onWatermarkChange({
        ...watermarkSettings,
        imageFile: file
      });
    }
  };

  const handleMouseDown = (e) => {
    if (!watermarkSettings.enabled || !watermarkImageUrl) return;
    
    e.preventDefault();
    setIsDragging(true);
    
    const rect = watermarkOverlayRef.current.getBoundingClientRect();
    setDragStart({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  const handleMouseMove = (e) => {
    if (!isDragging || !watermarkSettings.enabled || !videoMetadata) return;
    
    e.preventDefault();
    const rect = watermarkOverlayRef.current.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;
    const deltaX = currentX - dragStart.x;
    const deltaY = currentY - dragStart.y;
    
    // Convert deltas back to original video coordinates
    const actualDeltaX = deltaX / previewScale;
    const actualDeltaY = deltaY / previewScale;
    
    // Update position based on current position mode
    let newSettings = { ...watermarkSettings };
    
    if (watermarkSettings.position === 'center') {
      newSettings.x = Math.max(-videoMetadata.width/4, Math.min(
        watermarkSettings.x + actualDeltaX,
        videoMetadata.width/4
      ));
      newSettings.y = Math.max(-videoMetadata.height/4, Math.min(
        watermarkSettings.y + actualDeltaY,
        videoMetadata.height/4
      ));
    } else {
      // For corner positions, adjust the offset
      newSettings.x = Math.max(0, Math.min(
        Math.abs(watermarkSettings.x) + (watermarkSettings.x >= 0 ? actualDeltaX : -actualDeltaX),
        videoMetadata.width * 0.4
      ));
      newSettings.y = Math.max(0, Math.min(
        Math.abs(watermarkSettings.y) + (watermarkSettings.y >= 0 ? actualDeltaY : -actualDeltaY),
        videoMetadata.height * 0.4
      ));
      
      // Maintain sign based on position
      if (watermarkSettings.position.includes('right')) newSettings.x = -newSettings.x;
      if (watermarkSettings.position.includes('bottom')) newSettings.y = -newSettings.y;
    }
    
    onWatermarkChange(newSettings);
    setDragStart({ x: currentX, y: currentY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragStart, watermarkSettings, videoMetadata, previewScale]);

  const applyPositionPreset = (preset) => {
    onWatermarkChange({
      ...watermarkSettings,
      position: preset.position,
      x: preset.x,
      y: preset.y
    });
  };

  const resetWatermark = () => {
    onWatermarkChange({
      ...watermarkSettings,
      x: 10,
      y: 10,
      scale: 0.2,
      opacity: 0.7,
      position: 'top-right'
    });
  };

  const scaledDimensions = getScaledDimensions();
  const watermarkPos = getWatermarkPosition();

  if (!videoFile) {
    return (
      <div className="empty-state">
        <div className="empty-icon">
          <Palette size={48} />
        </div>
        <h3 className="empty-title">Upload a video first</h3>
        <p className="empty-description">
          Please upload a video file to access watermark settings
        </p>
      </div>
    );
  }

  return (
    <main className="watermark-selector-container" aria-label="Watermark Selector">
      {/* Preserve Original Notice */}
      {preserveOriginal && (
        <div className="flowing-card quality-preservation-notice">
          <div className="quality-notice-content">
            <div className="quality-notice-icon">
              <Shield size={16} />
            </div>
            <div>
              <h4 className="quality-notice-title">
                Quality Preservation Mode
              </h4>
              <p className="quality-notice-description">
                Watermark applied with minimal quality impact
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="watermark-selector-grid">
        {/* Watermark Settings */}
        <section className="flowing-card" style={{ padding: 'var(--spacing-lg)' }} aria-labelledby="watermark-settings-title">
          <header className="section-header">
            <div className="section-icon">
              <Palette size={16} />
            </div>
            <div>
              <h3 id="watermark-settings-title" className="section-title">
                Watermark Settings
              </h3>
            </div>
          </header>

          {/* Enable Watermark Toggle */}
          <fieldset className="watermark-settings-section">
            <legend className="visually-hidden">Enable Video Watermark</legend>
            <label className="checkbox-card">
              <input
                type="checkbox"
                checked={watermarkSettings.enabled}
                onChange={(e) => onToggleWatermark(e.target.checked)}
                className="checkbox-input"
                aria-label="Enable Video Watermark"
              />
              <div className="checkbox-content">
                <div className="checkbox-info">
                  <div>
                    <div className="checkbox-title">Enable Video Watermark</div>
                    <p className="checkbox-description">
                      Add custom branding to your video
                    </p>
                  </div>
                </div>
              </div>
            </label>
          </fieldset>

          {watermarkSettings.enabled && (
            <>
              {/* Watermark Image Upload */}
              <div className="watermark-settings-section">
                <label className="form-label" htmlFor="watermark-image-upload">Watermark Image</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleWatermarkImageUpload}
                  className="file-input"
                  id="watermark-image-upload"
                  aria-label="Upload watermark image"
                />
                <div 
                  className={`dropzone watermark-dropzone ${watermarkSettings.imageFile ? 'has-image' : ''}`}
                  onClick={() => fileInputRef.current?.click()}
                  role="button"
                  tabIndex={0}
                  aria-label="Drag and drop or click to upload watermark image"
                >
                  <div className="dropzone-content">
                    <div className={`dropzone-icon ${watermarkSettings.imageFile ? 'has-image' : ''}`}>
                      {watermarkSettings.imageFile ? <CheckCircle size={16} /> : <Upload size={16} />}
                    </div>
                    <div className="dropzone-text">
                      <div className="dropzone-title">
                        {watermarkSettings.imageFile ? 'Image Selected' : 'Upload Image'}
                      </div>
                      <div className="dropzone-subtitle">
                        {watermarkSettings.imageFile 
                          ? watermarkSettings.imageFile.name 
                          : 'PNG, JPG, GIF supported'
                        }
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Position & Properties in two columns */}
              <div className="position-properties-grid">
                {/* Position Presets */}
                <fieldset>
                  <legend className="form-label">Position</legend>
                  <div className="position-presets-grid">
                    {positionPresets.slice(0, 4).map((preset) => (
                      <button
                        key={preset.position}
                        onClick={() => applyPositionPreset(preset)}
                        className={`position-preset-button ${watermarkSettings.position === preset.position ? 'active' : ''}`}
                        aria-pressed={watermarkSettings.position === preset.position}
                        aria-label={`Set watermark position to ${preset.name}`}
                      >
                        {preset.name}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => applyPositionPreset(positionPresets[4])}
                    className={`position-center-button ${watermarkSettings.position === 'center' ? 'active' : ''}`}
                    aria-pressed={watermarkSettings.position === 'center'}
                    aria-label="Set watermark position to Center"
                  >
                    Center
                  </button>
                </fieldset>

                {/* Properties */}
                <fieldset>
                  <legend className="form-label">Properties</legend>
                  <div className="properties-controls">
                    <div>
                      <div className="property-control">
                        <span className="property-label">Scale</span>
                        <span className="property-value">
                          {Math.round(watermarkSettings.scale * 100)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0.05"
                        max="0.8"
                        step="0.05"
                        value={watermarkSettings.scale}
                        onChange={(e) => onWatermarkChange({
                          ...watermarkSettings,
                          scale: parseFloat(e.target.value)
                        })}
                        className="property-slider"
                        aria-label="Watermark scale slider"
                        aria-valuenow={Math.round(watermarkSettings.scale * 100)}
                        aria-valuemin="5"
                        aria-valuemax="80"
                      />
                    </div>
                    
                    <div>
                      <div className="property-control">
                        <span className="property-label">Opacity</span>
                        <span className="property-value">
                          {Math.round(watermarkSettings.opacity * 100)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0.1"
                        max="1.0"
                        step="0.1"
                        value={watermarkSettings.opacity}
                        onChange={(e) => onWatermarkChange({
                          ...watermarkSettings,
                          opacity: parseFloat(e.target.value)
                        })}
                        className="property-slider"
                        aria-label="Watermark opacity slider"
                        aria-valuenow={Math.round(watermarkSettings.opacity * 100)}
                        aria-valuemin="10"
                        aria-valuemax="100"
                      />
                    </div>
                  </div>
                </fieldset>
              </div>
              
              {/* Fine Position Control */}
              <fieldset className="watermark-settings-section">
                <legend className="form-label">Fine Position</legend>
                <div className="fine-position-grid">
                  <div>
                    <input
                      type="number"
                      value={Math.round(watermarkSettings.x)}
                      onChange={(e) => onWatermarkChange({
                        ...watermarkSettings,
                        x: parseInt(e.target.value) || 0
                      })}
                      placeholder="X Offset"
                      className="form-input fine-position-input"
                      aria-label="Watermark X offset"
                    />
                  </div>
                  <div>
                    <input
                      type="number"
                      value={Math.round(watermarkSettings.y)}
                      onChange={(e) => onWatermarkChange({
                        ...watermarkSettings,
                        y: parseInt(e.target.value) || 0
                      })}
                      placeholder="Y Offset"
                      className="form-input fine-position-input"
                      aria-label="Watermark Y offset"
                    />
                  </div>
                </div>
              </fieldset>

              {/* Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  onClick={resetWatermark}
                  disabled={!videoMetadata}
                  className="btn btn-sm btn-secondary"
                  aria-label="Reset watermark settings"
                >
                  <RotateCcw size={14} />
                  Reset
                </button>
              </div>
            </>
          )}
        </section>

        {/* Video Preview */}
        <section className="flowing-card" style={{ padding: 'var(--spacing-lg)' }} aria-labelledby="preview-title">
          <header className="section-header">
            <div className="section-icon">
              <Monitor size={16} />
            </div>
            <div>
              <h3 id="preview-title" className="section-title">
                Preview
              </h3>
            </div>
          </header>

          <div className="video-preview-container">
            <div 
              className="video-wrapper"
              style={{
                width: Math.min(scaledDimensions.width, 360) || '320px',
                height: Math.min(scaledDimensions.height, 200) || '180px'
              }}
            >
              <video
                ref={videoRef}
                className="video-element"
                controls
                muted
                aria-label="Video preview with watermark"
              />
              
              {/* Watermark Overlay */}
              {watermarkSettings.enabled && watermarkImageUrl && (
                <div
                  ref={watermarkOverlayRef}
                  className={`watermark-overlay ${isDragging ? 'dragging' : ''}`}
                  role="img"
                  aria-label="Watermark position preview"
                >
                  {/* Watermark Image */}
                  <div
                    className="watermark-image"
                    style={{
                      left: watermarkPos.x,
                      top: watermarkPos.y,
                      width: watermarkPos.width,
                      height: watermarkPos.height,
                      opacity: watermarkSettings.opacity,
                      backgroundImage: `url(${watermarkImageUrl})`
                    }}
                    onMouseDown={handleMouseDown}
                    role="button"
                    tabIndex={0}
                    aria-label="Drag watermark to reposition"
                  >
                    {/* Move Icon */}
                    <div
                      className={`watermark-move-icon ${isDragging ? 'dragging' : ''}`}
                    >
                      <Move size={12} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Quick Info */}
          {watermarkSettings.enabled && (
            <dl className="quick-info-panel" aria-label="Watermark Information Summary">
              <div className="quick-info-grid">
                <div>
                  <dt className="quick-info-label">
                    Position
                  </dt>
                  <dd className="quick-info-value">
                    {watermarkSettings.position}
                  </dd>
                </div>
                <div>
                  <dt className="quick-info-label">
                    Scale
                  </dt>
                  <dd className="quick-info-value">
                    {Math.round(watermarkSettings.scale * 100)}%
                  </dd>
                </div>
                <div>
                  <dt className="quick-info-label">
                    Opacity
                  </dt>
                  <dd className="quick-info-value">
                    {Math.round(watermarkSettings.opacity * 100)}%
                  </dd>
                </div>
              </div>
            </dl>
          )}
        </section>
      </div>

      {/* Information Panel */}
      <section className="flowing-card information-panel" aria-labelledby="watermark-guidelines-title">
        <header className="section-header">
          <div className="section-icon">
            <Info size={16} />
          </div>
          <div>
            <h3 id="watermark-guidelines-title" className="section-title">
              Watermark Guidelines
            </h3>
          </div>
        </header>
        
        <div className="guidelines-grid">
          <div className="guideline-section">
            <h4>
              Supported Formats
            </h4>
            <ul className="guideline-list">
              <li>PNG (recommended for transparency)</li>
              <li>JPG (solid backgrounds)</li>
              <li>GIF (animated watermarks)</li>
              <li>SVG (vector graphics)</li>
            </ul>
          </div>
          
          <div className="guideline-section">
            <h4>
              Best Practices
            </h4>
            <ul className="guideline-list">
              <li>Use PNG format with transparency</li>
              <li>Keep watermarks subtle (20-30% scale)</li>
              <li>Position in corners for best visibility</li>
              <li>Test different opacity levels</li>
            </ul>
          </div>

          <div className="guideline-section">
            <h4>
              Tips
            </h4>
            <ul className="guideline-list">
              <li>Drag watermark in preview to adjust</li>
              <li>Use fine position for pixel-perfect placement</li>
              <li>Lower opacity for subtle branding</li>
              <li>Center position allows free movement</li>
            </ul>
          </div>
        </div>
      </section>
    </main>
  );
};

export default WatermarkSelector;