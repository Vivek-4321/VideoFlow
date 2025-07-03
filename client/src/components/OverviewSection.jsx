import { 
  Film, 
  Upload, 
  Archive, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  FileVideo, 
  Activity 
} from 'lucide-react';
import { useStats } from '../hooks/useApi';
import { formatDate, getStatusColor } from '../utils/helpers';
import '../styles/Loading.css';
import '../styles/OverviewSection.css';
import { StatsGridSkeleton, RecentJobsSectionSkeleton } from './skeletons';

const StatsGrid = ({ jobs, statsLoading }) => {
  if (statsLoading) {
    return <StatsGridSkeleton />;
  }

  return (
    <section className="stats-grid" aria-label="Job statistics overview">
      <article className="stat-card" aria-label="Total Jobs">
        <div className="stat-icon">
          <Archive size={20} />
        </div>
        <div className="stat-content">
          <h3 className="stat-value">{jobs?.length || 0}</h3>
          <p className="stat-label">Total Jobs</p>
        </div>
      </article>

      <article className="stat-card" aria-label="Completed Jobs">
        <div className="stat-icon success">
          <CheckCircle size={20} />
        </div>
        <div className="stat-content">
          <h3 className="stat-value">
            {jobs?.filter((job) => job.status === "completed").length || 0}
          </h3>
          <p className="stat-label">Completed</p>
        </div>
      </article>

      <article className="stat-card" aria-label="Jobs In Progress">
        <div className="stat-icon warning">
          <Clock size={20} />
        </div>
        <div className="stat-content">
          <h3 className="stat-value">
            {
              jobs?.filter(
                (job) =>
                  job.status === "pending" ||
                  job.status === "processing"
              ).length || 0
            }
          </h3>
          <p className="stat-label">In Progress</p>
        </div>
      </article>

      <article className="stat-card" aria-label="Failed Jobs">
        <div className="stat-icon error">
          <AlertCircle size={20} />
        </div>
        <div className="stat-content">
          <h3 className="stat-value">
            {jobs?.filter((job) => job.status === "failed").length || 0}
          </h3>
          <p className="stat-label">Failed</p>
        </div>
      </article>
    </section>
  );
};

const RecentJobsSection = ({ jobs, jobsLoading, setActiveSection }) => {
  if (jobsLoading) {
    return <RecentJobsSectionSkeleton />;
  }

  if (!jobs || jobs.length === 0) {
    return (
      <div className="empty-state">
        <Film className="empty-icon" size={48} />
        <h3 className="empty-title">No jobs yet</h3>
        <p className="empty-description">
          Get started by uploading your first video for transcoding
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
    <ul className="settings-grid" aria-label="Recent Transcoding Jobs">
      {jobs.slice(0, 6).map((job) => (
        <li key={job.jobId} className="settings-card">
          <header className="card-header">
            <h3 className="card-title">
              <FileVideo size={18} />
              {job.inputFileName}
            </h3>
            <span className={`status-badge ${getStatusColor(job.status)}`}>
              {job.status === "pending" && <Clock size={12} />}
              {job.status === "processing" && <Activity size={12} />}
              {job.status === "completed" && <CheckCircle size={12} />}
              {job.status === "failed" && <AlertCircle size={12} />}
              <span>{job.status}</span>
            </span>
          </header>
          <div className="card-content">
            <div className="form-grid">
              <div>
                <span className="meta-label">Format</span>
                <div className="meta-value">{job.outputFormat?.toUpperCase()}</div>
              </div>
              <div>
                <span className="meta-label">Created</span>
                <time className="meta-value meta-date" dateTime={job.createdAt}>{formatDate(job.createdAt)}</time>
              </div>
            </div>
            {job.thumbnailUrls && (
              <span className="thumbnails-indicator">
                + Thumbnails Generated
              </span>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
};

const OverviewSection = ({ jobs, jobsLoading, setActiveSection }) => {
  const { isLoading: statsLoading } = useStats();

  return (
    <section className="overview-section">
      <header className="section-header">
        <h1 className="section-title">Dashboard Overview</h1>
        <p className="section-description">
          Welcome back! Here's what's happening with your video processing.
        </p>
      </header>

      <StatsGrid jobs={jobs} statsLoading={statsLoading} />

      <section className="recent-jobs-section" aria-labelledby="recent-activity-heading">
        <header className="section-header">
          <h2 id="recent-activity-heading" className="section-subtitle">Recent Activity</h2>
          <div className="section-actions">
            <button
              className="btn btn-secondary"
              onClick={() => setActiveSection("jobs")}
            >
              View All Jobs →
            </button>
          </div>
        </header>

        <RecentJobsSection 
          jobs={jobs} 
          jobsLoading={jobsLoading}
          setActiveSection={setActiveSection} 
        />
      </section>
    </section>
  );
};

export default OverviewSection;