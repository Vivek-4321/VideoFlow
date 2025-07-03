  import { useState, useRef, useEffect } from 'react';
import { 
  Crop, 
  Shield, 
  RotateCcw, 
  Eye, 
  Move, 
  Info, 
  RectangleHorizontal, 
  RectangleVertical, 
  Square, 
  Monitor, 
  Film 
} from 'lucide-react';
import '../styles/VideoCropSelector.css';

const VideoCropSelector = ({ 
  videoFile, 
  cropSettings, 
  onCropChange, 
  onToggleCrop,
  preserveOriginal = false
}) => {
  const videoRef = useRef(null);
  const cropOverlayRef = useRef(null);
  
  const [videoMetadata, setVideoMetadata] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragMode, setDragMode] = useState('move'); // 'move' or 'resize'
  const [previewScale, setPreviewScale] = useState(1);

  const cropPresets = [
    { name: '16:9', ratio: 16/9, description: 'Widescreen', icon: RectangleHorizontal },
    { name: '4:3', ratio: 4/3, description: 'Standard', icon: Monitor },
    { name: '1:1', ratio: 1, description: 'Square', icon: Square },
    { name: '9:16', ratio: 9/16, description: 'Vertical', icon: RectangleVertical },
    { name: '21:9', ratio: 21/9, description: 'Cinematic', icon: Film },
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
        
        if (!cropSettings.enabled) {
          onCropChange({
            enabled: false,
            x: 0,
            y: 0,
            width: video.videoWidth,
            height: video.videoHeight,
            aspectRatio: video.videoWidth / video.videoHeight
          });
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

  const updatePreviewScale = () => {
    if (videoRef.current && videoMetadata) {
      const container = videoRef.current.parentElement;
      const containerWidth = container.clientWidth - 40; // Padding
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

  const getScaledCrop = () => {
    if (!cropSettings.enabled || !videoMetadata) return null;
    return {
      x: cropSettings.x * previewScale,
      y: cropSettings.y * previewScale,
      width: cropSettings.width * previewScale,
      height: cropSettings.height * previewScale
    };
  };

  const handleMouseDown = (e, mode) => {
    if (!cropSettings.enabled) return;
    
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    setDragMode(mode);
    
    const rect = cropOverlayRef.current.getBoundingClientRect();
    setDragStart({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      cropX: cropSettings.x,
      cropY: cropSettings.y,
      cropWidth: cropSettings.width,
      cropHeight: cropSettings.height
    });
  };

  const handleMouseMove = (e) => {
    if (!isDragging || !cropSettings.enabled || !videoMetadata) return;
    
    e.preventDefault();
    const rect = cropOverlayRef.current.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;
    const deltaX = (currentX - dragStart.x) / previewScale;
    const deltaY = (currentY - dragStart.y) / previewScale;
    
    let newSettings = { ...cropSettings };

    if (dragMode === 'move') {
      newSettings.x = Math.max(0, Math.min(
        dragStart.cropX + deltaX,
        videoMetadata.width - cropSettings.width
      ));
      newSettings.y = Math.max(0, Math.min(
        dragStart.cropY + deltaY,
        videoMetadata.height - cropSettings.height
      ));
    } else { // Resizing
      if (dragMode.includes('l')) { // Left handles
        const newX = dragStart.cropX + deltaX;
        const newWidth = dragStart.cropWidth - deltaX;
        if (newX >= 0 && newWidth > 50) {
          newSettings.x = newX;
          newSettings.width = newWidth;
        }
      } 
      if (dragMode.includes('r')) { // Right handles
        const newWidth = dragStart.cropWidth + deltaX;
        if (newWidth > 50 && dragStart.cropX + newWidth <= videoMetadata.width) {
          newSettings.width = newWidth;
        }
      }
      if (dragMode.includes('t')) { // Top handles
        const newY = dragStart.cropY + deltaY;
        const newHeight = dragStart.cropHeight - deltaY;
        if (newY >= 0 && newHeight > 50) {
          newSettings.y = newY;
          newSettings.height = newHeight;
        }
      }
      if (dragMode.includes('b')) { // Bottom handles
        const newHeight = dragStart.cropHeight + deltaY;
        if (newHeight > 50 && dragStart.cropY + newHeight <= videoMetadata.height) {
          newSettings.height = newHeight;
        }
      }
    }
    
    onCropChange(newSettings);
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
  }, [isDragging, dragStart, cropSettings, videoMetadata, previewScale]);

  const applyCropPreset = (preset) => {
    if (!videoMetadata) return;
    
    const videoRatio = videoMetadata.width / videoMetadata.height;
    let newWidth, newHeight;

    if (preset.ratio > videoRatio) {
      newWidth = videoMetadata.width;
      newHeight = videoMetadata.width / preset.ratio;
    } else {
      newHeight = videoMetadata.height;
      newWidth = videoMetadata.height * preset.ratio;
    }

    onCropChange({
      ...cropSettings,
      width: newWidth,
      height: newHeight,
      x: (videoMetadata.width - newWidth) / 2,
      y: (videoMetadata.height - newHeight) / 2,
      aspectRatio: preset.ratio
    });
  };

  const resetCrop = () => {
    if (videoMetadata) {
      onCropChange({
        ...cropSettings,
        x: 0,
        y: 0,
        width: videoMetadata.width,
        height: videoMetadata.height,
        aspectRatio: videoMetadata.width / videoMetadata.height
      });
    }
  };

  const scaledDimensions = getScaledDimensions();
  const scaledCrop = getScaledCrop();

  if (!videoFile) {
    return (
      <div className="empty-state">
        <div className="empty-icon">
          <Crop size={48} />
        </div>
        <h3 className="empty-title">Upload a video first</h3>
        <p className="empty-description">
          Please upload a video file to access crop settings
        </p>
      </div>
    );
  }
  return (
    <main className="video-crop-selector" aria-label="Video Crop Selector">
      {/* Preserve Original Notice */}
      {preserveOriginal && (
        <aside className="flowing-card preserve-original-notice" role="note" aria-label="Quality Preservation Mode">
          <div className="preserve-original-content">
            <div className="preserve-original-icon">
              <Shield size={16} />
            </div>
            <div>
              <h4 className="preserve-original-title">
                Quality Preservation Mode
              </h4>
              <p className="preserve-original-description">
                Crop applied with minimal quality impact
              </p>
            </div>
          </div>
        </aside>
      )}

      <div className="crop-main-grid">
        {/* Crop Settings */}
        <section className="flowing-card crop-settings-card" aria-labelledby="crop-settings-title">
          <header className="section-header">
            <div className="section-icon">
              <Crop size={16} />
            </div>
            <div>
              <h3 id="crop-settings-title" className="section-title">
                Crop Settings
              </h3>
            </div>
          </header>

          {/* Enable Crop Toggle */}
          <fieldset className="crop-enable-section">
            <legend className="visually-hidden">Enable Video Cropping</legend>
            <label className="checkbox-card">
              <input
                type="checkbox"
                checked={cropSettings.enabled}
                onChange={(e) => onToggleCrop(e.target.checked)}
                className="checkbox-input"
                aria-label="Enable Video Cropping"
              />
              <div className="checkbox-content">
                <div className="checkbox-info">
                  <div>
                    <div className="checkbox-title">Enable Video Cropping</div>
                    <p className="checkbox-description">
                      Crop video to custom dimensions and aspect ratios
                    </p>
                  </div>
                </div>
              </div>
            </label>
          </fieldset>

          {cropSettings.enabled && (
            <>
              {/* Aspect Ratio Presets */}
              <fieldset className="aspect-ratio-section">
                <legend className="form-label">Aspect Ratio Presets</legend>
                <div className="aspect-ratio-grid">
                  {cropPresets.map((preset) => {
                    const IconComponent = preset.icon;
                    return (
                      <button
                        key={preset.name}
                        onClick={() => applyCropPreset(preset)}
                        disabled={!videoMetadata}
                        className="aspect-ratio-button"
                        aria-label={`Apply ${preset.name} aspect ratio preset (${preset.description})`}
                      >
                        <IconComponent size={16} />
                        <span>{preset.name}</span>
                        <span className="aspect-ratio-description">
                          {preset.description}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              {/* Position & Size Controls */}
              <fieldset className="position-size-section">
                <legend className="form-label">Position & Size</legend>
                <div className="position-size-grid">
                  <div>
                    <input
                      type="number"
                      min="0"
                      max={videoMetadata ? videoMetadata.width - cropSettings.width : 0}
                      value={Math.round(cropSettings.x)}
                      onChange={(e) => onCropChange({
                        ...cropSettings,
                        x: parseInt(e.target.value) || 0
                      })}
                      placeholder="X Position"
                      className="form-input position-size-input"
                      aria-label="Crop X position"
                    />
                  </div>
                  <div>
                    <input
                      type="number"
                      min="0"
                      max={videoMetadata ? videoMetadata.height - cropSettings.height : 0}
                      value={Math.round(cropSettings.y)}
                      onChange={(e) => onCropChange({
                        ...cropSettings,
                        y: parseInt(e.target.value) || 0
                      })}
                      placeholder="Y Position"
                      className="form-input position-size-input"
                      aria-label="Crop Y position"
                    />
                  </div>
                  <div>
                    <input
                      type="number"
                      min="100"
                      max={videoMetadata ? videoMetadata.width - cropSettings.x : 0}
                      value={Math.round(cropSettings.width)}
                      onChange={(e) => onCropChange({
                        ...cropSettings,
                        width: parseInt(e.target.value) || 100
                      })}
                      placeholder="Width"
                      className="form-input position-size-input"
                      aria-label="Crop width"
                    />
                  </div>
                  <div>
                    <input
                      type="number"
                      min="100"
                      max={videoMetadata ? videoMetadata.height - cropSettings.y : 0}
                      value={Math.round(cropSettings.height)}
                      onChange={(e) => onCropChange({
                        ...cropSettings,
                        height: parseInt(e.target.value) || 100
                      })}
                      placeholder="Height"
                      className="form-input position-size-input"
                      aria-label="Crop height"
                    />
                  </div>
                </div>
              </fieldset>

              {/* Actions */}
              <div className="actions-section">
                <button
                  onClick={resetCrop}
                  disabled={!videoMetadata}
                  className="btn btn-sm btn-secondary"
                  aria-label="Reset crop to original video dimensions"
                >
                  <RotateCcw size={14} />
                  Reset
                </button>
              </div>
            </>
          )}
        </section>

        {/* Video Preview */}
        <section className="flowing-card preview-card" aria-labelledby="preview-title">
          <header className="section-header">
            <div className="section-icon">
              <Eye size={16} />
            </div>
            <div>
              <h3 id="preview-title" className="section-title">
                Preview
              </h3>
            </div>
          </header>

          <div className="preview-container">
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
                aria-label="Video preview"
              />
              
              {/* Crop Overlay */}
              {cropSettings.enabled && scaledCrop && (
                <div
                  ref={cropOverlayRef}
                  className={`crop-overlay ${isDragging ? 'dragging' : ''}`}
                  role="img"
                  aria-label="Crop selection area"
                >
                  {/* Overlay outside crop area */}
                  <div className="crop-overlay-background">
                    {/* Top */}
                    <div 
                      className="crop-overlay-section"
                      style={{
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: scaledCrop.y
                      }} 
                    />
                    {/* Bottom */}
                    <div 
                      className="crop-overlay-section"
                      style={{
                        top: scaledCrop.y + scaledCrop.height,
                        left: 0,
                        width: '100%',
                        height: scaledDimensions.height - (scaledCrop.y + scaledCrop.height)
                      }} 
                    />
                    {/* Left */}
                    <div 
                      className="crop-overlay-section"
                      style={{
                        top: scaledCrop.y,
                        left: 0,
                        width: scaledCrop.x,
                        height: scaledCrop.height
                      }} 
                    />
                    {/* Right */}
                    <div 
                      className="crop-overlay-section"
                      style={{
                        top: scaledCrop.y,
                        left: scaledCrop.x + scaledCrop.width,
                        width: scaledDimensions.width - (scaledCrop.x + scaledCrop.width),
                        height: scaledCrop.height
                      }} 
                    />
                  </div>

                  {/* Crop Selection Box */}
                  <div
                    className={`crop-selection-box ${isDragging ? 'dragging' : ''}`}
                    style={{
                      left: scaledCrop.x,
                      top: scaledCrop.y,
                      width: scaledCrop.width,
                      height: scaledCrop.height
                    }}
                    onMouseDown={(e) => handleMouseDown(e, 'move')}
                    role="region"
                    aria-label="Adjustable crop box"
                    tabIndex={0}
                  >
                    {/* Corner Handles */}
                    {[
                      { position: 'top-left', cursor: 'nw-resize', mode: 'resize-tl', label: 'Resize top-left' },
                      { position: 'top-right', cursor: 'ne-resize', mode: 'resize-tr', label: 'Resize top-right' },
                      { position: 'bottom-left', cursor: 'sw-resize', mode: 'resize-bl', label: 'Resize bottom-left' },
                      { position: 'bottom-right', cursor: 'se-resize', mode: 'resize-br', label: 'Resize bottom-right' }
                    ].map((handle, index) => (
                      <div
                        key={index}
                        className={`crop-handle ${handle.position}`}
                        onMouseDown={(e) => handleMouseDown(e, handle.mode)}
                        role="slider"
                        aria-label={handle.label}
                        tabIndex={0}
                      />
                    ))}

                    {/* Move Icon */}
                    <div className="crop-move-icon">
                      <Move size={20} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Quick Info */}
          {cropSettings.enabled && (
            <dl className="crop-info-panel" aria-label="Crop Information">
              <div className="crop-info-grid">
                <div>
                  <dt className="crop-info-label">
                    Original
                  </dt>
                  <dd className="crop-info-value">
                    {videoMetadata ? `${videoMetadata.width}×${videoMetadata.height}` : 'Loading...'}
                  </dd>
                </div>
                <div>
                  <dt className="crop-info-label">
                    Cropped
                  </dt>
                  <dd className="crop-info-value">
                    {Math.round(cropSettings.width)}×{Math.round(cropSettings.height)}
                  </dd>
                </div>
                <div>
                  <dt className="crop-info-label">
                    Ratio
                  </dt>
                  <dd className="crop-info-value">
                    {(cropSettings.width / cropSettings.height).toFixed(2)}:1
                  </dd>
                </div>
              </div>
            </dl>
          )}
        </section>
      </div>

      {/* Information Panel */}
      <section className="flowing-card info-panel-wrapper" aria-labelledby="crop-guidelines-title">
        <header className="info-panel-header">
          <div className="info-panel-icon">
            <Info size={16} />
          </div>
          <div>
            <h3 id="crop-guidelines-title" className="info-panel-title">
              Crop Guidelines
            </h3>
          </div>
        </header>
        
        <div className="info-panel-grid">
          <div>
            <h4 className="info-section-title">
              Aspect Ratios
            </h4>
            <ul className="info-section-list">
              <li>16:9 - Standard widescreen format</li>
              <li>4:3 - Traditional TV format</li>
              <li>1:1 - Square format for social media</li>
              <li>9:16 - Vertical format for mobile</li>
              <li>21:9 - Ultrawide cinematic format</li>
            </ul>
          </div>
          
          <div>
            <h4 className="info-section-title">
              Best Practices
            </h4>
            <ul className="info-section-list">
              <li>Maintain important visual elements</li>
              <li>Consider your target platform requirements</li>
              <li>Test different aspect ratios for optimal viewing</li>
              <li>Avoid cropping too aggressively</li>
            </ul>
          </div>

          <div>
            <h4 className="info-section-title">
              Tips
            </h4>
            <ul className="info-section-list">
              <li>Drag the crop area to reposition</li>
              <li>Use corner handles to resize</li>
              <li>Enter precise values for exact dimensions</li>
              <li>Preview shows your final result</li>
            </ul>
          </div>
        </div>
      </section>

    </main>
  );
};

export default VideoCropSelector;