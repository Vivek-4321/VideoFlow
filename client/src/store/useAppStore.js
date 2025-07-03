import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { defaultTranscodingOptions, defaultSelectedResolutions } from '../utils/constants';

const useAppStore = create(
  devtools(
    (set) => ({
      // Auth state
      user: null,
      authLoading: true,
      showLanding: true,
      
      // Dashboard state
      activeSection: 'overview',
      expandedSection: 'basic',
      
      // Transcoding state
      selectedFile: null,
      uploadProgress: 0,
      uploadError: '',
      isUploading: false,
      transcodingOptions: defaultTranscodingOptions,
      selectedResolutions: defaultSelectedResolutions,
      cropSettings: {
        enabled: false,
        x: 0,
        y: 0,
        width: 0,
        height: 0
      },
      watermarkSettings: {
        enabled: false,
        imageFile: null,
        imageUrl: '',
        position: 'bottom-right',
        opacity: 0.7,
        size: 'medium'
      },
      thumbnailSettings: {
        enabled: false,
        timestamp: 10,
        count: 3,
        format: 'jpg'
      },
      
      // Jobs state
      jobs: [],
      jobsLoading: false,
      
      // Note: Pure dark theme only, no theme switching needed
      
      // Actions
      setUser: (user) => set({ user }),
      setAuthLoading: (loading) => set({ authLoading: loading }),
      setShowLanding: (show) => set({ showLanding: show }),
      setActiveSection: (section) => set({ activeSection: section }),
      setExpandedSection: (section) => set({ expandedSection: section }),
      setSelectedFile: (file) => set({ selectedFile: file }),
      setUploadProgress: (progress) => set({ uploadProgress: progress }),
      setUploadError: (error) => set({ uploadError: error }),
      setIsUploading: (uploading) => set({ isUploading: uploading }),
      setTranscodingOptions: (options) => set({ transcodingOptions: options }),
      setSelectedResolutions: (resolutions) => set({ selectedResolutions: resolutions }),
      setCropSettings: (settings) => set({ cropSettings: settings }),
      setWatermarkSettings: (settings) => set({ watermarkSettings: settings }),
      setThumbnailSettings: (settings) => set({ thumbnailSettings: settings }),
      setJobs: (jobs) => set({ jobs }),
      setJobsLoading: (loading) => set({ jobsLoading: loading }),
      
      // Reset functions
      resetUploadState: () => set({
        selectedFile: null,
        uploadProgress: 0,
        uploadError: '',
        isUploading: false
      }),
      
      resetTranscodingSettings: () => set({
        transcodingOptions: defaultTranscodingOptions,
        selectedResolutions: defaultSelectedResolutions,
        cropSettings: {
          enabled: false,
          x: 0,
          y: 0,
          width: 0,
          height: 0
        },
        watermarkSettings: {
          enabled: false,
          imageFile: null,
          imageUrl: '',
          position: 'bottom-right',
          opacity: 0.7,
          size: 'medium'
        },
        thumbnailSettings: {
          enabled: false,
          timestamp: 10,
          count: 3,
          format: 'jpg'
        }
      }),
      
      logout: () => set({
        user: null,
        showLanding: true,
        jobs: [],
        selectedFile: null,
        uploadProgress: 0,
        uploadError: '',
        isUploading: false
      })
    }),
    {
      name: 'transcoder-store'
    }
  )
);

export default useAppStore;