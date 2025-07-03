import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { buildJobData, validateTranscodingOptions } from '../utils/helpers';

export class UploadService {
  constructor(storage, API_URL) {
    this.storage = storage;
    this.API_URL = API_URL;
  }

  async uploadWatermarkImage(file, user) {
    if (!file) return null;

    try {
      const storageRef = ref(
        this.storage,
        `watermarks/${user.uid}/${Date.now()}_${file.name}`
      );
      const uploadTask = uploadBytesResumable(storageRef, file);

      return new Promise((resolve, reject) => {
        uploadTask.on("state_changed", null, reject, async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(downloadURL);
        });
      });
    } catch (error) {
      console.error("Watermark upload error:", error);
      throw new Error(`Failed to upload watermark: ${error.message}`);
    }
  }

  async uploadVideoAndCreateJob({
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
  }) {
    // Validation
    const validationErrors = validateTranscodingOptions(transcodingOptions, selectedResolutions);
    if (validationErrors.length > 0) {
      throw new Error(validationErrors.join(' '));
    }

    if (!selectedFile) {
      throw new Error("Please select a file first.");
    }

    if (watermarkSettings.enabled && !watermarkSettings.imageFile) {
      throw new Error("Please upload a watermark image or disable watermarking.");
    }

    // Check file size (10GB limit)
    const maxSize = 10 * 1024 * 1024 * 1024; // 10GB in bytes
    if (selectedFile.size > maxSize) {
      throw new Error("File size exceeds 10GB limit. Please choose a smaller file.");
    }

    // Check file type
    const allowedTypes = [
      'video/mp4', 'video/avi', 'video/mov', 'video/wmv', 'video/flv',
      'video/webm', 'video/mkv', 'video/m4v', 'video/3gp', 'video/quicktime'
    ];
    
    if (!allowedTypes.includes(selectedFile.type) && !selectedFile.name.match(/\.(mp4|avi|mov|wmv|flv|webm|mkv|m4v|3gp|qt)$/i)) {
      throw new Error("Unsupported file format. Please upload a valid video file.");
    }

    setIsUploading(true);
    setUploadProgress(0);
    setUploadError("");

    try {
      // Upload video file
      const storageRef = ref(
        this.storage,
        `uploads/${user.uid}/${Date.now()}_${selectedFile.name}`
      );
      const uploadTask = uploadBytesResumable(storageRef, selectedFile);

      let watermarkUrl = null;

      // Upload watermark image if enabled
      if (watermarkSettings.enabled && watermarkSettings.imageFile) {
        try {
          watermarkUrl = await this.uploadWatermarkImage(watermarkSettings.imageFile, user);
        } catch (error) {
          throw new Error(`Watermark upload failed: ${error.message}`);
        }
      }

      return new Promise((resolve, reject) => {
        uploadTask.on(
          "state_changed",
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            setUploadProgress(Math.round(progress));
          },
          (error) => {
            console.error("Upload error:", error);
            let errorMessage = "Upload failed";
            
            switch (error.code) {
              case 'storage/unauthorized':
                errorMessage = "Upload unauthorized. Please check your permissions.";
                break;
              case 'storage/canceled':
                errorMessage = "Upload was canceled.";
                break;
              case 'storage/quota-exceeded':
                errorMessage = "Storage quota exceeded. Please try again later.";
                break;
              case 'storage/unknown':
                errorMessage = "An unknown error occurred during upload.";
                break;
              default:
                errorMessage = `Upload failed: ${error.message}`;
            }
            
            setUploadError(errorMessage);
            setIsUploading(false);
            reject(new Error(errorMessage));
          },
          async () => {
            try {
              const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);

              const jobData = buildJobData(
                user,
                downloadURL,
                selectedFile,
                transcodingOptions,
                cropSettings,
                watermarkSettings,
                thumbnailSettings,
                watermarkUrl
              );

              // Get access token from Aethercure auth service
              const cookieUtils = {
                getCookie: (name) => {
                  const nameEQ = name + "=";
                  const ca = document.cookie.split(';');
                  for(let i = 0; i < ca.length; i++) {
                    let c = ca[i];
                    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
                    if (c.indexOf(nameEQ) === 0) {
                      return decodeURIComponent(c.substring(nameEQ.length, c.length));
                    }
                  }
                  return null;
                }
              };

              const accessToken = cookieUtils.getCookie('aethercure_access_token') || localStorage.getItem('authToken');
              
              if (!accessToken) {
                throw new Error('No authentication token available. Please sign in again.');
              }

              const response = await fetch(`${this.API_URL}/jobs`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${accessToken}`,
                },
                body: JSON.stringify(jobData),
              });

              if (!response.ok) {
                let errorMessage = "Failed to create transcoding job";
                
                try {
                  const errorData = await response.json();
                  errorMessage = errorData.error || errorMessage;
                } catch {
                  // If we can't parse the error response, use the status text
                  errorMessage = `${response.status}: ${response.statusText}`;
                }
                
                throw new Error(errorMessage);
              }

              const result = await response.json();
              setIsUploading(false);
              resolve(result);
            } catch (error) {
              console.error("Job creation error:", error);
              const errorMessage = error.message || "Failed to create transcoding job";
              setUploadError(errorMessage);
              setIsUploading(false);
              reject(new Error(errorMessage));
            }
          }
        );
      });
    } catch (error) {
      console.error("Upload service error:", error);
      const errorMessage = error.message || "An unexpected error occurred";
      setUploadError(errorMessage);
      setIsUploading(false);
      throw new Error(errorMessage);
    }
  }
}