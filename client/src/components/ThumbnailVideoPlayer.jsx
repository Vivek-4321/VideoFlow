import { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, RotateCcw } from 'lucide-react';
import '../styles/ThumbnailVideoPlayer.css';

const ThumbnailVideoPlayer = ({ 
  videoUrl, 
  thumbnailUrls, 
  className = '',
  autoPlay = false 
}) => {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoUrl) return;

    const handleLoadedData = () => {
      setIsLoading(false);
      setDuration(video.duration);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
    };

    const handlePlay = () => {
      setIsPlaying(true);
    };

    const handlePause = () => {
      setIsPlaying(false);
    };

    const handleError = () => {
      setError('Failed to load video');
      setIsLoading(false);
    };

    video.addEventListener('loadeddata', handleLoadedData);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('error', handleError);

    return () => {
      video.removeEventListener('loadeddata', handleLoadedData);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('error', handleError);
    };
  }, [videoUrl]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = !video.muted;
    setIsMuted(video.muted);
  };

  const handleSeek = (e) => {
    const video = videoRef.current;
    if (!video) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    video.currentTime = pos * duration;
  };

  const formatTime = (time) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const enterFullscreen = () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.requestFullscreen) {
      video.requestFullscreen();
    } else if (video.webkitRequestFullscreen) {
      video.webkitRequestFullscreen();
    } else if (video.msRequestFullscreen) {
      video.msRequestFullscreen();
    }
  };

  const resetVideo = () => {
    const video = videoRef.current;
    if (!video) return;

    video.currentTime = 0;
    video.pause();
  };

  if (!videoUrl) {
    return (
      <div className={`video-player-container ${className}`}>
        <div className="video-player-placeholder">
          <div className="placeholder-content">
            <Play size={48} className="placeholder-icon" />
            <p className="placeholder-text">No video available</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`video-player-container ${className}`}>
        <div className="video-player-error">
          <div className="error-content">
            <Play size={48} className="error-icon" />
            <p className="error-text">{error}</p>
            <button 
              onClick={() => {
                setError(null);
                setIsLoading(true);
                videoRef.current?.load();
              }}
              className="btn btn-secondary btn-sm"
            >
              <RotateCcw size={16} />
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <figure className={`video-player-container ${className}`}>
      <div className="video-player-wrapper">
        <video
          ref={videoRef}
          src={videoUrl}
          muted={isMuted}
          autoPlay={autoPlay}
          className="video-player"
          preload="metadata"
          playsInline
          aria-label="Video player"
        />

        {/* Loading Overlay */}
        {isLoading && (
          <div className="video-player-loading" role="status" aria-live="polite">
            <div className="loading-spinner"></div>
            <p>Loading video...</p>
          </div>
        )}

        {/* Video Controls */}
        <div className="video-controls" role="group" aria-label="Video player controls">
          <div className="controls-row">
            {/* Play/Pause Button */}
            <button
              onClick={togglePlay}
              className="control-btn play-btn"
              disabled={isLoading}
              aria-label={isPlaying ? 'Pause video' : 'Play video'}
            >
              {isPlaying ? <Pause size={20} /> : <Play size={20} />}
            </button>

            {/* Progress Bar */}
            <div className="progress-container">
              <div 
                className="progress-bar"
                onClick={handleSeek}
                role="slider"
                aria-label="Video progress bar"
                aria-valuenow={currentTime}
                aria-valuemin="0"
                aria-valuemax={duration}
              >
                <div 
                  className="progress-fill"
                  style={{ width: `${(currentTime / duration) * 100}%` }}
                />
                <div 
                  className="progress-handle"
                  style={{ left: `${(currentTime / duration) * 100}%` }}
                />
              </div>
            </div>

            {/* Time Display */}
            <div className="time-display">
              <time dateTime={`PT${Math.floor(currentTime)}S`}>{formatTime(currentTime)}</time>
              <span>/</span>
              <time dateTime={`PT${Math.floor(duration)}S`}>{formatTime(duration)}</time>
            </div>

            {/* Volume Button */}
            <button
              onClick={toggleMute}
              className="control-btn volume-btn"
              aria-label={isMuted ? 'Unmute video' : 'Mute video'}
            >
              {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>

            {/* Reset Button */}
            <button
              onClick={resetVideo}
              className="control-btn reset-btn"
              title="Reset to beginning"
              aria-label="Reset video to beginning"
            >
              <RotateCcw size={18} />
            </button>

            {/* Fullscreen Button */}
            <button
              onClick={enterFullscreen}
              className="control-btn fullscreen-btn"
              aria-label="Enter fullscreen"
            >
              <Maximize size={18} />
            </button>
          </div>
        </div>

        {/* Thumbnail Information */}
        {thumbnailUrls && (
          <figcaption className="thumbnail-info">
            <div className="thumbnail-stats">
              {thumbnailUrls.sprite && (
                <span className="thumbnail-stat">
                  ✓ Sprite Sheet
                </span>
              )}
              {thumbnailUrls.vtt && (
                <span className="thumbnail-stat">
                  ✓ WebVTT
                </span>
              )}
              {thumbnailUrls.individual && thumbnailUrls.individual.length > 0 && (
                <span className="thumbnail-stat">
                  ✓ {thumbnailUrls.individual.length} Thumbnails
                </span>
              )}
            </div>
          </figcaption>
        )}
      </div>

    </figure>
  );
};

export default ThumbnailVideoPlayer;