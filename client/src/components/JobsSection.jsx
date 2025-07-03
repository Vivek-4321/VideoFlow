import { useState, useEffect } from 'react';
import {
  RefreshCw,
  X,
  FileVideo,
  Clock,
  CheckCircle,
  AlertCircle,
  Play,
  Download,
  Eye,
  Archive,
  Grid,
  Image,
  Info,
  Activity,
  AlertTriangle,
  Film,
  Upload,
} from 'lucide-react';
import { useDeleteJob, useRetryJob, useJob } from '../hooks/useApi';
import { useToast } from '../store/useToastStore';
import { formatDate } from '../utils/helpers';
import ThumbnailVideoPlayer from './ThumbnailVideoPlayer';
import '../styles/Loading.css';
import '../styles/JobsSection.css';
import { JobsListSkeleton, JobDetailsSkeleton } from './skeletons';

// Expiration Countdown Component
const ExpirationCountdown = ({ expiresAt }) => {
  const [timeLeft, setTimeLeft] = useState(0);
  
  useEffect(() => {
    if (!expiresAt) return;
    
    const updateTimeLeft = () => {
      const now = new Date().getTime();
      const expiration = new Date(expiresAt).getTime();
      const remaining = Math.max(0, expiration - now);
      setTimeLeft(remaining);
    };
    
    updateTimeLeft();
    const interval = setInterval(updateTimeLeft, 1000);
    
    return () => clearInterval(interval);
  }, [expiresAt]);
  
  if (timeLeft <= 0) {
    return (
      <time className="expiration-countdown expired" dateTime={expiresAt}>
        🗑️ EXPIRED
      </time>
    );
  }
  
  const minutes = Math.floor(timeLeft / (1000 * 60));
  const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
  
  return (
    <time className={`expiration-countdown ${minutes < 10 ? 'warning' : 'normal'}`} dateTime={expiresAt}>
      ⏰ {minutes}m {seconds}s
    </time>
  );
};

// Retention Warning Component
const RetentionWarning = () => {
  return (
    <aside className="flowing-card jobs-retention-warning-card" aria-label="File Retention Policy Information">
      <div className="jobs-retention-warning-content">
        <div className="jobs-retention-icon">
          <AlertTriangle size={18} />
        </div>
        <div className="jobs-retention-text">
          <h4 className="jobs-retention-title">
            📁 File Retention Policy
          </h4>
          <p className="jobs-retention-description">
            All processed videos and thumbnails are automatically deleted 1 hour after completion.
          </p>
        </div>
      </div>
    </aside>
  );
};



const JobCard = ({ job, isSelected, onSelect, onDelete, onRetry, isDeleting, isRetrying }) => {
  const isExpired = job.status === 'expired';
  const hasExpiration = job.status === 'completed' && job.completedAt;

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return <Clock size={14} />;
      case 'processing': return <Activity size={14} />;
      case 'completed': return <CheckCircle size={14} />;
      case 'failed': return <AlertCircle size={14} />;
      case 'expired': return <span>🗑️</span>;
      default: return <Clock size={14} />;
    }
  };


  return (
    <article 
      className={`flowing-card job-card ${isSelected ? 'selected' : ''} ${isExpired ? 'expired' : ''}`}
      onClick={() => !isExpired && onSelect(job.jobId)}
      aria-label={`Job: ${job.inputFileName}, Status: ${job.status}`}
    >
      <header className="job-card-header">
        <div className="job-card-icon">
          <FileVideo size={20} />
        </div>
        
        <div className="job-card-info">
          <h4 className={`job-card-title ${isExpired ? 'expired' : ''}`}>
            {job.inputFileName}
            {isExpired && (
              <span className="job-card-expired-label">
                [EXPIRED]
              </span>
            )}
          </h4>
          
          <div className="job-card-format-row">
            <span className="job-card-format">
              {job.outputFormat?.toUpperCase()}
            </span>
            {job.thumbnailUrls && !isExpired && (
              <span className="job-card-thumbnails">
                +Thumbnails
              </span>
            )}
          </div>
        </div>

        <div className="job-card-actions">
          {job.status === 'failed' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRetry(job.jobId, e);
              }}
              className="btn btn-sm job-card-retry-btn"
              disabled={isRetrying}
              title="Retry job"
              aria-label={`Retry job ${job.inputFileName}`}
            >
              <RefreshCw size={12} />
            </button>
          )}
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(job.jobId, e);
            }}
            className="btn btn-sm job-card-delete-btn"
            disabled={isDeleting}
            title="Delete job"
            aria-label={`Delete job ${job.inputFileName}`}
          >
            <X size={12} />
          </button>
        </div>
      </header>

      <footer className="job-card-footer">
        <div className="job-card-status-row">
          <span className={`job-card-status-badge status-badge ${job.status}`}>
            {getStatusIcon(job.status)}
            <span className="text-transform-capitalize">{job.status}</span>
          </span>

          {hasExpiration && !isExpired && (
            <ExpirationCountdown 
              expiresAt={new Date(new Date(job.completedAt).getTime() + (60 * 60 * 1000))} 
            />
          )}
        </div>

        <time className="job-card-date" dateTime={job.createdAt}>
          {formatDate(job.createdAt)}
        </time>
      </footer>
    </article>
  );
};

const JobsList = ({ jobs, jobsLoading, selectedJob, handleJobSelect, setActiveSection }) => {
  const { toast } = useToast();
  const deleteJobMutation = useDeleteJob();
  const retryJobMutation = useRetryJob();

  const handleDeleteJob = async (jobId, e) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this job?')) {
      try {
        await deleteJobMutation.mutateAsync(jobId);
      } catch {
        toast.error('Failed to delete job');
      }
    }
  };

  const handleRetryJob = async (jobId, e) => {
    e.stopPropagation();
    try {
      await retryJobMutation.mutateAsync(jobId);
    } catch {
      toast.error('Failed to retry job');
    }
  };

  if (jobsLoading) {
    return <JobsListSkeleton />;
  }

  if (jobs.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">
          <Film size={48} />
        </div>
        <h3 className="empty-title">No jobs found</h3>
        <p className="empty-description">
          Start by uploading a video for transcoding
        </p>
        <button
          className="btn btn-primary"
          onClick={() => setActiveSection("transcode")}
          aria-label="Upload Video to start transcoding"
        >
          <Upload size={16} />
          Upload Video
        </button>
      </div>
    );
  }

  return (
    <section aria-label="List of Transcoding Jobs">
      <RetentionWarning />
      
      <div className="jobs-list-container">
        {jobs.map((job) => (
          <JobCard
            key={job.jobId}
            job={job}
            isSelected={selectedJob === job.jobId}
            onSelect={handleJobSelect}
            onDelete={handleDeleteJob}
            onRetry={handleRetryJob}
            isDeleting={deleteJobMutation.isPending}
            isRetrying={retryJobMutation.isPending}
          />
        ))}
      </div>
    </section>
  );
};

const JobDetails = ({ selectedJobId }) => {
  const { data: selectedJobDetails, isLoading: jobDetailLoading, refetch } = useJob(selectedJobId);
  
  if (jobDetailLoading) {
    return <JobDetailsSkeleton />;
  }

  if (!selectedJobDetails) {
    return (
      <div className="empty-state">
        <div className="empty-icon">
          <Eye size={48} />
        </div>
        <h3 className="empty-title">Select a job</h3>
        <p className="empty-description">
          Choose a job from the list to view details
        </p>
      </div>
    );
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return <Clock size={18} />;
      case 'processing': return <Activity size={18} />;
      case 'completed': return <CheckCircle size={18} />;
      case 'failed': return <AlertCircle size={18} />;
      default: return <Clock size={18} />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'var(--warning-color)';
      case 'processing': return 'var(--primary-color)';
      case 'completed': return 'var(--success-color)';
      case 'failed': return 'var(--danger-color)';
      default: return 'var(--text-muted)';
    }
  };

  return (
    <article className="job-details-main-container" aria-labelledby="job-details-main-title">
      
      {/* Job Header */}
      <header className="flowing-card job-details-main-card">
        <div className="job-details-header-flex">
          <div className="job-details-icon-container">
            <FileVideo size={32} />
          </div>
          
          <div className="job-details-info-container">
            <h2 id="job-details-main-title" className="job-details-main-title">
              {selectedJobDetails.inputFileName}
            </h2>
            <p className="job-details-id-text">
              ID: {selectedJobDetails.jobId}
            </p>
          </div>

          <div className="job-details-status-container job-status-container-dynamic" style={{
            background: `rgba(${getStatusColor(selectedJobDetails.status).replace('var(--', '').replace('-color)', '')}, 0.1)`,
            color: getStatusColor(selectedJobDetails.status),
            border: `1px solid ${getStatusColor(selectedJobDetails.status)}33`
          }}>
            {getStatusIcon(selectedJobDetails.status)}
            <span className="text-transform-capitalize">{selectedJobDetails.status}</span>
          </div>
        </div>

        {/* Job Progress */}
        {selectedJobDetails.status === "processing" && (
          <div className="job-progress-container" role="progressbar" aria-valuenow={selectedJobDetails.progress || 0} aria-valuemin="0" aria-valuemax="100">
            <div className="job-progress-header-flex">
              <span className="job-progress-label-text">
                Progress
              </span>
              <span className="job-progress-percentage-text">
                {selectedJobDetails.progress || 0}%
              </span>
            </div>
            <div className="job-progress-bar-container">
              <div className="job-progress-bar-fill job-progress-fill-dynamic" style={{ 
                width: `${selectedJobDetails.progress || 0}%`
              }} />
            </div>
          </div>
        )}

        {/* Job Metadata */}
        <div className="job-metadata-container">
          <div className="job-metadata-center">
            <div className="job-metadata-label-style">
              Format
            </div>
            <div className="job-metadata-value-style">
              {selectedJobDetails.outputFormat?.toUpperCase()}
            </div>
          </div>
          <div className="job-metadata-center">
            <div className="job-metadata-label-style">
              Created
            </div>
            <time className="job-metadata-value-style" dateTime={selectedJobDetails.createdAt}>
              {formatDate(selectedJobDetails.createdAt)}
            </time>
          </div>
          {selectedJobDetails.completedAt && (
            <div className="job-metadata-center">
              <div className="job-metadata-label-style">
                Completed
              </div>
              <time className="job-metadata-value-style" dateTime={selectedJobDetails.completedAt}>
                {formatDate(selectedJobDetails.completedAt)}
              </time>
            </div>
          )}
        </div>
      </header>

      {/* Video Player */}
      {selectedJobDetails.status === "completed" &&
        selectedJobDetails.outputUrls &&
        selectedJobDetails.outputUrls.length > 0 && (
          <section className="flowing-card job-video-card" aria-labelledby="video-preview-title">
            <h3 id="video-preview-title" className="job-video-title">
              Video Preview
            </h3>
            <ThumbnailVideoPlayer
              videoUrl={selectedJobDetails.outputUrls[0].url}
              thumbnailUrls={selectedJobDetails.thumbnailUrls}
              className="job-video-player"
              aria-label="Video preview player"
            />
          </section>
        )}

      {/* Error Details */}
      {selectedJobDetails.status === "failed" && selectedJobDetails.error && (
        <section className="flowing-card job-error-main-card" aria-labelledby="error-details-title">
          <div className="job-error-header-flex">
            <AlertCircle size={20} className="job-error-icon-style" />
            <h3 id="error-details-title" className="job-error-title-text">
              Error Details
            </h3>
          </div>
          <p className="job-error-message-text">
            {selectedJobDetails.error.message}
          </p>
          {selectedJobDetails.error.code && (
            <p className="job-error-code-text">
              Code: {selectedJobDetails.error.code}
            </p>
          )}
        </section>
      )}

      {/* Output Files */}
      <OutputFilesSection selectedJobDetails={selectedJobDetails} />

      {/* Actions */}
      <div className="job-refresh-container">
        <button
          onClick={() => refetch()}
          className="btn btn-secondary"
          aria-label="Refresh Job Details"
        >
          <RefreshCw size={16} />
          Refresh Details
        </button>
      </div>
    </article>
  );
};

const OutputFilesSection = ({ selectedJobDetails }) => {
  if (!selectedJobDetails.outputUrls || selectedJobDetails.outputUrls.length === 0) {
    return null;
  }

  const OutputItem = ({ icon, title, description, actions, type = 'normal' }) => (
    <li className={`output-item-flex-layout ${type === 'summary' ? 'output-item-summary' : 'output-item-normal'}`}>
      <div className="output-item-content-flex">
        <div className="output-item-icon-container">
          {icon}
        </div>
        <div>
          <div className="output-item-title-text">
            {title}
          </div>
          {description && (
            <div className="output-item-description-text">
              {description}
            </div>
          )}
        </div>
      </div>
      {actions && (
        <div className="output-item-actions-flex">
          {actions}
        </div>
      )}
    </li>
  );

  return (
    <section className="flowing-card output-files-main-card" aria-labelledby="output-files-title">
      <h3 id="output-files-title" className="output-files-main-title">
        Output Files
      </h3>
      
      <ul className="output-files-list">
        {/* Video Output Files */}
        {selectedJobDetails.outputUrls.map((output, index) => (
          <OutputItem
            key={index}
            icon={output.resolution === "audio" ? <Activity size={16} /> : <FileVideo size={16} />}
            title={output.resolution === "audio" ? "Audio Track" : 
                   output.resolution === "master" ? "Master Playlist" : 
                   `${output.resolution} Resolution`}
            actions={
              <>
                {output.resolution !== "master" && (
                  <a
                    href={output.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-sm output-action-btn-preview"
                    title="Preview"
                    aria-label={`Preview ${output.resolution} video`}
                  >
                    <Play size={12} />
                  </a>
                )}
                <a
                  href={output.url}
                  download
                  className="btn btn-sm output-action-btn-download"
                  title="Download"
                  aria-label={`Download ${output.resolution} video`}
                >
                  <Download size={12} />
                </a>
              </>
            }
          />
        ))}

        {/* Thumbnail Files */}
        <ThumbnailOutputsSection selectedJobDetails={selectedJobDetails} OutputItem={OutputItem} />
      </ul>
    </section>
  );
};

const ThumbnailOutputsSection = ({ selectedJobDetails, OutputItem }) => {
  if (!selectedJobDetails.thumbnailUrls) {
    return null;
  }

  return (
    <section aria-label="Thumbnail Output Files">
      {/* Sprite Sheet */}
      {selectedJobDetails.thumbnailUrls.sprite && (
        <OutputItem
          icon={<Grid size={16} />}
          title="Thumbnail Sprite Sheet"
          description="Combined thumbnail image"
          actions={
            <>
              <a
                href={selectedJobDetails.thumbnailUrls.sprite}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-sm thumbnail-sprite-preview-btn"
                title="Preview sprite sheet"
                aria-label="Preview thumbnail sprite sheet"
              >
                <Eye size={12} />
              </a>
              <a
                href={selectedJobDetails.thumbnailUrls.sprite}
                download="thumbnail-sprite.jpg"
                className="btn btn-sm thumbnail-sprite-download-btn"
                title="Download sprite sheet"
                aria-label="Download thumbnail sprite sheet"
              >
                <Download size={12} />
              </a>
            </>
          }
        />
      )}

      {/* ZIP Archive */}
      {selectedJobDetails.thumbnailUrls.zip && !selectedJobDetails.thumbnailUrls.sprite && (
        <OutputItem
          icon={<Archive size={16} />}
          title="Thumbnails Archive"
          description="ZIP file with all thumbnails"
          actions={
            <a
              href={selectedJobDetails.thumbnailUrls.zip}
              download="thumbnails.zip"
              className="btn btn-sm thumbnail-zip-download-btn"
              title="Download thumbnails ZIP"
              aria-label="Download thumbnails ZIP archive"
            >
              <Download size={12} />
            </a>
          }
        />
      )}

      {/* Individual Thumbnails */}
      {selectedJobDetails.thumbnailUrls.individual &&
        selectedJobDetails.thumbnailUrls.individual.length > 0 &&
        !selectedJobDetails.thumbnailUrls.sprite &&
        !selectedJobDetails.thumbnailUrls.zip && (
          <OutputItem
            icon={<Image size={16} />}
            title="Individual Thumbnails"
            description={`${selectedJobDetails.thumbnailUrls.individual.length} images`}
            actions={
              <button
                onClick={() => {
                  selectedJobDetails.thumbnailUrls.individual.forEach((url, index) => {
                    const link = document.createElement("a");
                    link.href = url;
                    link.download = `thumbnail_${(index + 1).toString().padStart(4, "0")}.jpg`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  });
                }}
                className="btn btn-sm thumbnail-individual-download-btn"
                title="Download all thumbnails"
                aria-label="Download all individual thumbnails"
              >
                <Download size={12} />
              </button>
            }
          />
        )}

      {/* WebVTT File */}
      {selectedJobDetails.thumbnailUrls.vtt && (
        <OutputItem
          icon={<FileVideo size={16} />}
          title="WebVTT Thumbnail Track"
          description="For video player previews"
          actions={
            <a
              href={selectedJobDetails.thumbnailUrls.vtt}
              download="thumbnails.vtt"
              className="btn btn-sm thumbnail-vtt-download-btn"
              title="Download WebVTT file"
              aria-label="Download WebVTT thumbnail track"
            >
              <Download size={12} />
            </a>
          }
        />
      )}

      {/* Thumbnail Summary */}
      <OutputItem
        type="summary"
        icon={<Info size={16} />}
        title="Thumbnail Summary"
        description={
          <div className="thumbnail-summary-margin">
            {selectedJobDetails.thumbnailUrls.sprite && (
              <div className="thumbnail-summary-item-text">
                ✓ Sprite sheet generated
              </div>
            )}
            {selectedJobDetails.thumbnailUrls.zip && (
              <div className="thumbnail-summary-item-text">
                ✓ ZIP archive created
              </div>
            )}
            {selectedJobDetails.thumbnailUrls.individual &&
              selectedJobDetails.thumbnailUrls.individual.length > 0 && (
                <div className="thumbnail-summary-item-text">
                  ✓ {selectedJobDetails.thumbnailUrls.individual.length} individual thumbnails
                </div>
              )}
            {selectedJobDetails.thumbnailUrls.vtt && (
              <div className="thumbnail-summary-item-text">
                ✓ WebVTT track for video players
              </div>
            )}
          </div>
        }
      />
    </section>
  );
};

const JobsSection = ({ 
  jobs,
  jobsLoading,
  refetchJobs,
  setActiveSection
}) => {
  const [selectedJobId, setSelectedJobId] = useState(null);

  const handleJobSelect = (jobId) => {
    setSelectedJobId(jobId);
  };

  return (
    <section className="jobs-main-container">
      {/* Header Section */}
      <header className="section-header jobs-header-section">
        <h1 className="section-title">Transcoding Jobs</h1>
        <p className="section-description">
          Monitor your video transcoding progress and manage completed jobs
        </p>
        <div className="jobs-header-actions">
          <button 
            onClick={refetchJobs} 
            className={`btn btn-secondary ${jobsLoading ? 'btn-loading' : ''}`}
            disabled={jobsLoading}
          >
            <RefreshCw size={16} />
            Refresh Jobs
          </button>
        </div>
      </header>

      <div className={`jobs-layout-grid ${selectedJobId ? 'jobs-layout-split' : 'jobs-layout-single'}`}>
        
        {/* Jobs List */}
        <section aria-labelledby="jobs-list-heading">
          <header className="jobs-list-header-row">
            <h2 id="jobs-list-heading" className="jobs-list-title">
              Your Jobs ({jobs?.length || 0})
            </h2>
          </header>
          
          <JobsList 
            jobs={jobs || []}
            jobsLoading={jobsLoading}
            selectedJob={selectedJobId}
            handleJobSelect={handleJobSelect}
            setActiveSection={setActiveSection}
          />
        </section>

        {/* Job Details */}
        {selectedJobId && (
          <section aria-labelledby="job-details-heading">
            <header className="job-details-header-row">
              <h2 id="job-details-heading" className="job-details-header-title">
                Job Details
              </h2>
              <button
                onClick={() => setSelectedJobId(null)}
                className="btn btn-sm job-details-close-btn"
              >
                <X size={16} />
              </button>
            </header>

            <JobDetails selectedJobId={selectedJobId} />
          </section>
        )}
      </div>

    </section>
  );
};

export default JobsSection;