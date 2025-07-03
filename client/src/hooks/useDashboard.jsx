import { useState, useEffect } from 'react';
import { resolutionMap, defaultTranscodingOptions, defaultSelectedResolutions } from '../utils/constants';

// Hook for managing transcoding options with preserve original
export const useTranscodingOptions = () => {
  const [transcodingOptions, setTranscodingOptions] = useState(defaultTranscodingOptions);
  const [selectedResolutions, setSelectedResolutions] = useState(defaultSelectedResolutions);

  // Update resolutions when selectedResolutions changes
  useEffect(() => {
    if (transcodingOptions.preserveOriginal) {
      // When preserve original is enabled, we use a special "original" resolution
      setTranscodingOptions((prev) => ({
        ...prev,
        resolutions: [{ width: null, height: null, label: "original" }],
      }));
    } else {
      // Normal behavior - use selected resolutions
      const newResolutions = Object.entries(selectedResolutions)
        .filter(([_, isSelected]) => isSelected)
        .map(([label]) => resolutionMap[label]);

      setTranscodingOptions((prev) => ({
        ...prev,
        resolutions: newResolutions,
      }));
    }
  }, [selectedResolutions, transcodingOptions.preserveOriginal]);

  // Enhanced setTranscodingOptions that handles preserve original changes
  const updateTranscodingOptions = (newOptions) => {
    setTranscodingOptions((prev) => {
      const updated = { ...prev, ...newOptions };
      
      // If preserve original was toggled on
      if (newOptions.preserveOriginal && !prev.preserveOriginal) {
        return {
          ...updated,
          videoCodec: "copy", // Use copy codec to preserve quality
          audioCodec: "copy", // Use copy codec to preserve quality
          resolutions: [{ width: null, height: null, label: "original" }],
          // Keep other settings but they won't be used unless transcoding is needed
        };
      }
      
      // If preserve original was toggled off
      if (newOptions.preserveOriginal === false && prev.preserveOriginal) {
        return {
          ...updated,
          videoCodec: "h264", // Reset to default codec
          audioCodec: "aac", // Reset to default codec
          // Resolutions will be set by the useEffect above
        };
      }
      
      return updated;
    });
  };

  return {
    transcodingOptions,
    setTranscodingOptions: updateTranscodingOptions,
    selectedResolutions,
    setSelectedResolutions,
  };
};

// Hook for managing file upload state
export const useFileUpload = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const resetUploadState = () => {
    setSelectedFile(null);
    setUploadProgress(0);
    setUploadError("");
    setIsUploading(false);
  };

  return {
    selectedFile,
    setSelectedFile,
    uploadProgress,
    setUploadProgress,
    uploadError,
    setUploadError,
    isUploading,
    setIsUploading,
    resetUploadState,
  };
};

// Hook for managing jobs
export const useJobs = (API_URL) => {
  const [jobs, setJobs] = useState([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [selectedJobDetails, setSelectedJobDetails] = useState(null);
  const [jobDetailLoading, setJobDetailLoading] = useState(false);

  const fetchJobs = async (user) => {
    if (!user) return;

    setJobsLoading(true);
    try {
      const accessToken = await user.getIdToken();

      const response = await fetch(`${API_URL}/jobs/user/${user.uid}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch jobs");
      }

      const data = await response.json();
      setJobs(data.data.jobs);
    } catch (error) {
      console.error("Error fetching jobs:", error);
    } finally {
      setJobsLoading(false);
    }
  };

  const fetchJobDetails = async (jobId, user) => {
    setJobDetailLoading(true);
    try {
      const accessToken = await user.getIdToken();

      const response = await fetch(`${API_URL}/jobs/${jobId}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch job details");
      }

      const data = await response.json();
      setSelectedJobDetails(data.data);
    } catch (error) {
      console.error("Error fetching job details:", error);
    } finally {
      setJobDetailLoading(false);
    }
  };

  const cancelJob = async (jobId, user) => {
    try {
      const accessToken = await user.getIdToken();

      const response = await fetch(`${API_URL}/jobs/${jobId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to cancel job");
      }

      await fetchJobs(user);
      if (selectedJob === jobId) {
        setSelectedJob(null);
        setSelectedJobDetails(null);
      }
    } catch (error) {
      console.error("Error cancelling job:", error);
    }
  };

  const handleJobSelect = (jobId, user) => {
    setSelectedJob(jobId);
    fetchJobDetails(jobId, user);
  };

  return {
    jobs,
    jobsLoading,
    selectedJob,
    selectedJobDetails,
    jobDetailLoading,
    fetchJobs,
    fetchJobDetails,
    cancelJob,
    handleJobSelect,
  };
};

// Enhanced hook for managing special settings (crop, watermark, thumbnails)
export const useSpecialSettings = () => {
  const [cropSettings, setCropSettings] = useState({
    enabled: false,
    x: 0,
    y: 0,
    width: 1920,
    height: 1080,
  });

  const [watermarkSettings, setWatermarkSettings] = useState({
    enabled: false,
    imageFile: null,
    x: 10,
    y: 10,
    scale: 0.2,
    opacity: 0.7,
    position: "top-right",
  });

  // Enhanced thumbnail settings with new features
  const [thumbnailSettings, setThumbnailSettings] = useState({
    enabled: false,
    mode: 'interval', // 'interval', 'custom', 'both'
    
    // Interval settings
    interval: 10,
    
    // Custom timestamp settings
    customTimestamps: [], // Array of HH:MM:SS strings
    
    // Thumbnail dimensions
    width: 160,
    height: 90,
    spriteColumns: 10,
    quality: 85,
    
    // Output options
    generateSprite: false,
    generateVTT: false,
    
    // NEW: Thumbnail-only mode
    thumbnailOnly: false, // If true, skip video transcoding and only generate thumbnails
  });

  const resetSpecialSettings = () => {
    setCropSettings({
      enabled: false,
      x: 0,
      y: 0,
      width: 1920,
      height: 1080,
    });
    setWatermarkSettings({
      enabled: false,
      imageFile: null,
      x: 10,
      y: 10,
      scale: 0.2,
      opacity: 0.7,
      position: "top-right",
    });
    setThumbnailSettings({
      enabled: false,
      mode: 'interval',
      interval: 10,
      customTimestamps: [],
      width: 160,
      height: 90,
      spriteColumns: 10,
      quality: 85,
      generateSprite: false,
      generateVTT: false,
      thumbnailOnly: false,
    });
  };

  return {
    cropSettings,
    setCropSettings,
    watermarkSettings,
    setWatermarkSettings,
    thumbnailSettings,
    setThumbnailSettings,
    resetSpecialSettings,
  };
};