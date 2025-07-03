import '../styles/Dashboard.css';
import {
  Home,
  Upload,
  List,
  Settings,
  Film,
  User,
  LogOut,
  Key,
  BarChart3,
  BookOpen,
} from "lucide-react";

// Components
import OverviewSection from './OverviewSection';
import TranscodeSection from './TranscodeSection';
import JobsSection from './JobsSection';
import SettingsSection from './SettingsSection';
import ApiKeyManagement from './ApiKeyManagement';
import UsageMetrics from './UsageMetrics';
import ApiDocumentation from './ApiDocumentation';

// Hooks
import { useJobs } from '../hooks/useApi';
import useAppStore from '../store/useAppStore';
import { useToast } from '../store/useToastStore';

// Services
import { UploadService } from '../services/uploadService';

const Dashboard = ({ user, onLogout, API_URL, storage, theme, onThemeChange }) => {
  const {
    activeSection,
    expandedSection,
    selectedFile,
    uploadProgress,
    uploadError,
    isUploading,
    transcodingOptions,
    selectedResolutions,
    cropSettings,
    watermarkSettings,
    thumbnailSettings,
    setActiveSection,
    setExpandedSection,
    setSelectedFile,
    setUploadProgress,
    setUploadError,
    setIsUploading,
    setTranscodingOptions,
    setSelectedResolutions,
    setCropSettings,
    setWatermarkSettings,
    setThumbnailSettings,
    resetUploadState,
    resetTranscodingSettings
  } = useAppStore();

  const { toast } = useToast();
  const { data: jobs = [], isLoading: jobsLoading, refetch: refetchJobs } = useJobs();

  // Services
  const uploadService = new UploadService(storage, API_URL);

  // Theme effect
  // Pure dark theme - no theme switching needed

  const handleLogout = async () => {
    try {
      await onLogout();
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  // File handling
  const handleFileChange = (e) => {
    if (e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setUploadError("");
      resetTranscodingSettings();
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
      setUploadError("");
      resetTranscodingSettings();
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  // Crop handlers
  const handleCropChange = (newCropSettings) => {
    setCropSettings(newCropSettings);
  };

  const handleToggleCrop = (enabled) => {
    setCropSettings({
      ...cropSettings,
      enabled,
    });
  };

  // Watermark handlers
  const handleWatermarkChange = (newWatermarkSettings) => {
    setWatermarkSettings(newWatermarkSettings);
  };

  const handleToggleWatermark = (enabled) => {
    setWatermarkSettings({
      ...watermarkSettings,
      enabled,
    });
  };

  // Thumbnail handlers
  const handleThumbnailChange = (newThumbnailSettings) => {
    setThumbnailSettings(newThumbnailSettings);
  };

  const handleToggleThumbnails = (enabled) => {
    setThumbnailSettings({
      ...thumbnailSettings,
      enabled,
    });
  };

  // Upload handler
  const handleFileUpload = async () => {
    try {
      await uploadService.uploadVideoAndCreateJob({
        selectedFile,
        user,
        transcodingOptions,
        selectedResolutions,
        cropSettings,
        watermarkSettings,
        thumbnailSettings,
        setUploadProgress,
        setUploadError,
        setIsUploading,
      });

      // Reset form after successful upload
      resetUploadState();
      resetTranscodingSettings();
      await refetchJobs();
      setActiveSection("jobs");
      toast.success("Transcoding job created successfully!");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error(error.message || "Failed to upload file");
    }
  };

  return (
    <div className="app-container">
      {/* Header with Top Navigation */}
      <header className="app-header">
        <div className="header-content">
          <div className="header-brand">
            <div className="brand-icon">
              <Film size={24} />
            </div>
            <span>VideoFlow</span>
          </div>

          <nav className="header-nav" role="navigation" aria-label="Main navigation">
            <button
              onClick={() => setActiveSection("overview")}
              className={`nav-tab ${activeSection === "overview" ? "active" : ""}`}
              title="Overview"
              aria-label="Overview Section"
            >
              <Home size={18} />
              <span className="nav-text">Overview</span>
            </button>

            <button
              onClick={() => setActiveSection("transcode")}
              className={`nav-tab ${activeSection === "transcode" ? "active" : ""}`}
              title="Transcode"
              aria-label="Transcode Section"
            >
              <Upload size={18} />
              <span className="nav-text">Transcode</span>
            </button>

            <button
              onClick={() => {
                setActiveSection("jobs");
                refetchJobs();
              }}
              className={`nav-tab ${activeSection === "jobs" ? "active" : ""}`}
              title="Jobs"
              aria-label="Jobs Section"
            >
              <List size={18} />
              <span className="nav-text">Jobs</span>
              {jobs.length > 0 && (
                <span className="nav-badge">{jobs.length}</span>
              )}
            </button>

            <button
              onClick={() => setActiveSection("api-keys")}
              className={`nav-tab ${activeSection === "api-keys" ? "active" : ""}`}
              title="API Keys"
              aria-label="API Keys Section"
            >
              <Key size={18} />
              <span className="nav-text">API Keys</span>
            </button>

            <button
              onClick={() => setActiveSection("metrics")}
              className={`nav-tab ${activeSection === "metrics" ? "active" : ""}`}
              title="Metrics"
              aria-label="Metrics Section"
            >
              <BarChart3 size={18} />
              <span className="nav-text">Metrics</span>
            </button>

            <button
              onClick={() => setActiveSection("docs")}
              className={`nav-tab ${activeSection === "docs" ? "active" : ""}`}
              title="API Documentation"
              aria-label="API Documentation Section"
            >
              <BookOpen size={18} />
              <span className="nav-text">API Docs</span>
            </button>

            <button
              onClick={() => setActiveSection("settings")}
              className={`nav-tab ${activeSection === "settings" ? "active" : ""}`}
              title="Settings"
              aria-label="Settings Section"
            >
              <Settings size={18} />
              <span className="nav-text">Settings</span>
            </button>
          </nav>

          <div className="header-controls">
            <div className="user-info">
              <div className="user-avatar">
                <User size={16} />
              </div>
              <span className="user-email">{user?.email}</span>
            </div>

            <button onClick={handleLogout} className="logout-button" aria-label="Sign Out">
              <LogOut size={16} />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="app-main" role="main">
        {/* Overview Tab */}
        {activeSection === "overview" && (
          <section aria-label="Dashboard overview">
            <OverviewSection 
              jobs={jobs}
              jobsLoading={jobsLoading}
              setActiveSection={setActiveSection}
            />
          </section>
        )}

        {/* Transcode Tab */}
        {activeSection === "transcode" && (
          <section aria-label="Video transcoding">
            <TranscodeSection 
              selectedFile={selectedFile}
              handleFileChange={handleFileChange}
              handleDrop={handleDrop}
              handleDragOver={handleDragOver}
              uploadError={uploadError}
              isUploading={isUploading}
              uploadProgress={uploadProgress}
              expandedSection={expandedSection}
              setExpandedSection={setExpandedSection}
              transcodingOptions={transcodingOptions}
              setTranscodingOptions={setTranscodingOptions}
              selectedResolutions={selectedResolutions}
              setSelectedResolutions={setSelectedResolutions}
              cropSettings={cropSettings}
              onCropChange={handleCropChange}
              onToggleCrop={handleToggleCrop}
              watermarkSettings={watermarkSettings}
              onWatermarkChange={handleWatermarkChange}
              onToggleWatermark={handleToggleWatermark}
              thumbnailSettings={thumbnailSettings}
              onThumbnailChange={handleThumbnailChange}
              onToggleThumbnails={handleToggleThumbnails}
              handleFileUpload={handleFileUpload}
            />
          </section>
        )}

        {/* Jobs Tab */}
        {activeSection === "jobs" && (
          <section aria-label="Transcoding jobs">
            <JobsSection 
              jobs={jobs}
              jobsLoading={jobsLoading}
              refetchJobs={refetchJobs}
              setActiveSection={setActiveSection}
            />
          </section>
        )}

        {/* API Keys Tab */}
        {activeSection === "api-keys" && (
          <section className="section-container" aria-label="API key management">
            <ApiKeyManagement />
          </section>
        )}

        {/* Metrics Tab */}
        {activeSection === "metrics" && (
          <section className="section-container" aria-label="Usage metrics">
            <UsageMetrics />
          </section>
        )}

        {/* API Documentation Tab */}
        {activeSection === "docs" && (
          <section className="section-container" aria-label="API documentation">
            <ApiDocumentation />
          </section>
        )}

        {/* Settings Tab */}
        {activeSection === "settings" && (
          <section aria-label="Application settings">
            <SettingsSection 
              user={user}
              theme={theme}
              setTheme={onThemeChange}
              transcodingOptions={transcodingOptions}
              setTranscodingOptions={setTranscodingOptions}
              handleLogout={handleLogout}
            />
          </section>
        )}
      </main>
    </div>
  );
};

export default Dashboard;