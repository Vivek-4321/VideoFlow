const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const axios = require('axios');
const { storage } = require('../config/firebase');
const { ref, uploadBytesResumable, getDownloadURL, deleteObject } = require('firebase/storage');
const logger = require('../utils/logger');

// Promisify fs functions
const mkdir = promisify(fs.mkdir);
const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);
const unlink = promisify(fs.unlink);
const readdir = promisify(fs.readdir);

// Create temp directory if it doesn't exist
const ensureTempDir = async (dirPath) => {
  try {
    await mkdir(dirPath, { recursive: true });
    logger.info(`Created directory: ${dirPath}`);
    return dirPath;
  } catch (error) {
    if (error.code !== 'EEXIST') {
      logger.error(`Error creating directory ${dirPath}: ${error.message}`);
      throw error;
    }
    logger.info(`Directory already exists: ${dirPath}`);
    return dirPath;
  }
};

/**
 * Download a file from URL to local filesystem (original function)
 */
const downloadFile = async (url, destPath) => {
  try {
    logger.info(`Starting download from: ${url}`);
    logger.info(`Destination path: ${destPath}`);
    
    const response = await axios({
      method: 'GET',
      url: url,
      responseType: 'stream',
      timeout: 30000  // 30 second timeout
    });

    // Ensure the directory exists
    const dir = path.dirname(destPath);
    await ensureTempDir(dir);

    // Log files in directory before download
    try {
      const files = await readdir(dir);
      logger.info(`Directory contents before download (${dir}): ${files.join(', ')}`);
    } catch (err) {
      logger.warn(`Could not list directory ${dir}: ${err.message}`);
    }

    // Save the file using a stream
    logger.info(`Writing download to file: ${destPath}`);
    const writer = fs.createWriteStream(destPath);
    
    // Log progress for large files
    let bytesReceived = 0;
    const totalBytes = parseInt(response.headers['content-length'] || '0');
    
    response.data.on('data', (chunk) => {
      bytesReceived += chunk.length;
      if (totalBytes > 0 && bytesReceived % 1024000 === 0) { // Log every ~1MB
        const percentage = Math.round((bytesReceived / totalBytes) * 100);
        logger.info(`Download progress: ${percentage}%, ${bytesReceived}/${totalBytes} bytes`);
      }
    });
    
    response.data.pipe(writer);

    // Return a promise that resolves when the file is fully downloaded
    return new Promise((resolve, reject) => {
      writer.on('finish', async () => {
        logger.info(`Download complete: ${destPath}`);
        
        // Verify file was written
        try {
          const stats = await promisify(fs.stat)(destPath);
          logger.info(`File size: ${stats.size} bytes`);
          
          if (stats.size === 0) {
            reject(new Error('Downloaded file is empty (0 bytes)'));
            return;
          }
        } catch (err) {
          logger.error(`Error checking file stats: ${err.message}`);
          reject(err);
          return;
        }
        
        // Log files in directory after download
        try {
          const files = await readdir(dir);
          logger.info(`Directory contents after download (${dir}): ${files.join(', ')}`);
        } catch (err) {
          logger.warn(`Could not list directory ${dir}: ${err.message}`);
        }
        
        resolve(destPath);
      });
      
      writer.on('error', (err) => {
        logger.error(`Error writing file: ${err.message}`);
        reject(err);
      });
    });
  } catch (error) {
    logger.error(`Error downloading file from ${url}:`, error);
    throw new Error(`Failed to download file: ${error.message}`);
  }
};

/**
 * Download a file from URL to local filesystem with progress tracking
 */
const downloadFileWithProgress = async (url, destPath, progressCallback = null) => {
  try {
    logger.info(`Starting download with progress tracking from: ${url}`);
    logger.info(`Destination path: ${destPath}`);
    
    const response = await axios({
      method: 'GET',
      url: url,
      responseType: 'stream',
      timeout: 60000  // 60 second timeout for larger files
    });

    // Ensure the directory exists
    const dir = path.dirname(destPath);
    await ensureTempDir(dir);

    // Save the file using a stream
    const writer = fs.createWriteStream(destPath);
    
    // Track download progress
    let bytesReceived = 0;
    const totalBytes = parseInt(response.headers['content-length'] || '0');
    let lastReportedProgress = 0;
    
    logger.info(`Download size: ${totalBytes} bytes (${(totalBytes / 1024 / 1024).toFixed(2)} MB)`);
    
    response.data.on('data', (chunk) => {
      bytesReceived += chunk.length;
      
      if (totalBytes > 0 && progressCallback) {
        const currentProgress = Math.round((bytesReceived / totalBytes) * 100);
        
        // Report progress every 5% or every 2MB, whichever comes first
        if (currentProgress > lastReportedProgress + 5 || bytesReceived - (lastReportedProgress / 100 * totalBytes) > 2097152) {
          lastReportedProgress = currentProgress;
          progressCallback(currentProgress);
          logger.debug(`Download progress: ${currentProgress}% (${(bytesReceived / 1024 / 1024).toFixed(2)}MB / ${(totalBytes / 1024 / 1024).toFixed(2)}MB)`);
        }
      } else if (totalBytes === 0 && progressCallback) {
        // For unknown size files, report progress based on bytes received
        const estimatedProgress = Math.min(Math.floor(bytesReceived / 1048576) * 10, 90); // 10% per MB, cap at 90%
        if (estimatedProgress > lastReportedProgress) {
          lastReportedProgress = estimatedProgress;
          progressCallback(estimatedProgress);
        }
      }
    });
    
    response.data.pipe(writer);

    // Return a promise that resolves when the file is fully downloaded
    return new Promise((resolve, reject) => {
      writer.on('finish', async () => {
        logger.info(`Download complete: ${destPath}`);
        
        // Final progress update
        if (progressCallback) {
          progressCallback(100);
        }
        
        // Verify file was written
        try {
          const stats = await promisify(fs.stat)(destPath);
          logger.info(`Final file size: ${stats.size} bytes`);
          
          if (stats.size === 0) {
            reject(new Error('Downloaded file is empty (0 bytes)'));
            return;
          }
          
          // Verify size matches expected (if known)
          if (totalBytes > 0 && Math.abs(stats.size - totalBytes) > 1024) {
            logger.warn(`File size mismatch: expected ${totalBytes}, got ${stats.size}`);
          }
        } catch (err) {
          logger.error(`Error checking file stats: ${err.message}`);
          reject(err);
          return;
        }
        
        resolve(destPath);
      });
      
      writer.on('error', (err) => {
        logger.error(`Error writing file: ${err.message}`);
        reject(err);
      });
    });
  } catch (error) {
    logger.error(`Error downloading file from ${url}:`, error);
    throw new Error(`Failed to download file: ${error.message}`);
  }
};

/**
 * Upload file to Firebase Storage (original function)
 */
const uploadToFirebase = async (filePath, destinationPath) => {
  try {
    logger.info(`Uploading file to Firebase: ${filePath} -> ${destinationPath}`);
    
    // Check if file exists before uploading
    try {
      const stats = await promisify(fs.stat)(filePath);
      logger.info(`File size to upload: ${stats.size} bytes`);
      
      if (stats.size === 0) {
        throw new Error(`Cannot upload empty file: ${filePath}`);
      }
    } catch (err) {
      logger.error(`Error checking file before upload: ${err.message}`);
      throw err;
    }
    
    const fileBuffer = await readFile(filePath);
    const storageRef = ref(storage, destinationPath);
    
    const uploadTask = uploadBytesResumable(storageRef, fileBuffer, {
      contentType: 'video/mp4', // Adjust based on file type
    });
    
    await uploadTask;
    
    // Get the download URL
    const downloadURL = await getDownloadURL(storageRef);
    
    logger.info(`Upload successful, download URL: ${downloadURL}`);
    return downloadURL;
  } catch (error) {
    logger.error(`Error uploading to Firebase:`, error);
    throw new Error(`Failed to upload to Firebase: ${error.message}`);
  }
};

/**
 * Upload file to Firebase Storage with progress tracking
 */
const uploadToFirebaseWithProgress = async (filePath, destinationPath, progressCallback = null) => {
  try {
    logger.info(`Uploading file to Firebase with progress: ${filePath} -> ${destinationPath}`);
    
    // Check if file exists before uploading
    let fileStats;
    try {
      fileStats = await promisify(fs.stat)(filePath);
      logger.info(`File size to upload: ${fileStats.size} bytes (${(fileStats.size / 1024 / 1024).toFixed(2)} MB)`);
      
      if (fileStats.size === 0) {
        throw new Error(`Cannot upload empty file: ${filePath}`);
      }
    } catch (err) {
      logger.error(`Error checking file before upload: ${err.message}`);
      throw err;
    }
    
    const fileBuffer = await readFile(filePath);
    const storageRef = ref(storage, destinationPath);
    
    // Start progress reporting
    if (progressCallback) {
      progressCallback(0);
    }
    
    try {
      const uploadTask = uploadBytesResumable(storageRef, fileBuffer, {
        contentType: 'video/mp4', // Adjust based on file type
      });
      
      // Monitor upload progress
      if (progressCallback) {
        uploadTask.on('state_changed', 
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            progressCallback(Math.round(progress));
          }
        );
      }
      
      await uploadTask;
      
      // Get the download URL
      const downloadURL = await getDownloadURL(storageRef);
      
      if (progressCallback) {
        progressCallback(100); // Complete
      }
      
      logger.info(`Upload successful, download URL: ${downloadURL}`);
      return downloadURL;
    } catch (error) {
      logger.error(`Upload failed: ${error.message}`);
      throw new Error(`Failed to upload to Firebase: ${error.message}`);
    }
  } catch (error) {
    logger.error(`Error uploading to Firebase with progress:`, error);
    throw new Error(`Failed to upload to Firebase: ${error.message}`);
  }
};

/**
 * Delete file from Firebase Storage
 */
const deleteFromFirebase = async (storagePath) => {
  try {
    logger.info(`Deleting file from Firebase: ${storagePath}`);
    const fileRef = ref(storage, storagePath);
    await deleteObject(fileRef);
    logger.info(`Successfully deleted file: ${storagePath}`);
    return true;
  } catch (error) {
    logger.error(`Error deleting from Firebase:`, error);
    throw new Error(`Failed to delete from Firebase: ${error.message}`);
  }
};

/**
 * Clean up local temporary files
 */
const cleanupTempFiles = async (filePaths) => {
  if (!Array.isArray(filePaths)) {
    filePaths = [filePaths];
  }
  
  for (const filePath of filePaths) {
    try {
      logger.info(`Cleaning up temporary file: ${filePath}`);
      await unlink(filePath);
      logger.info(`Successfully deleted file: ${filePath}`);
    } catch (error) {
      logger.warn(`Failed to clean up temporary file ${filePath}:`, error);
    }
  }
};

/**
 * Upload a directory to Firebase as a ZIP file
 */
const uploadDirectoryAsZip = async (dirPath, zipFileName, destinationPath) => {
  try {
    const archiver = require('archiver');
    const zipPath = path.join(path.dirname(dirPath), zipFileName);
    
    logger.info(`Creating ZIP archive: ${zipPath} from directory: ${dirPath}`);
    
    // Create a file to stream archive data to
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', {
      zlib: { level: 9 } // Maximum compression
    });
    
    // Listen for all archive data to be written
    const archiveComplete = new Promise((resolve, reject) => {
      output.on('close', () => {
        logger.info(`ZIP archive completed: ${zipPath}, size: ${archive.pointer()} bytes`);
        resolve(zipPath);
      });
      archive.on('error', (err) => {
        logger.error(`ZIP creation error: ${err.message}`);
        reject(err);
      });
    });
    
    // Pipe archive data to the file
    archive.pipe(output);
    
    // Append files from directory
    archive.directory(dirPath, false);
    
    // Finalize the archive
    await archive.finalize();
    
    // Wait for the archive to complete
    await archiveComplete;
    
    // Upload the zip file to Firebase
    const downloadURL = await uploadToFirebase(zipPath, destinationPath);
    
    // Clean up the zip file
    await cleanupTempFiles(zipPath);
    
    return downloadURL;
  } catch (error) {
    logger.error(`Error creating and uploading zip:`, error);
    throw new Error(`Failed to create and upload zip: ${error.message}`);
  }
};

/**
 * Upload a directory to Firebase as a ZIP file with progress tracking
 */
const uploadDirectoryAsZipWithProgress = async (dirPath, zipFileName, destinationPath, progressCallback = null) => {
  try {
    const archiver = require('archiver');
    const zipPath = path.join(path.dirname(dirPath), zipFileName);
    
    logger.info(`Creating ZIP archive with progress: ${zipPath} from directory: ${dirPath}`);
    
    // Phase 1: Create ZIP (0-50% of progress)
    const zipProgressCallback = (progress) => {
      if (progressCallback) {
        progressCallback(Math.round(progress * 0.5));
      }
    };
    
    // Create a file to stream archive data to
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', {
      zlib: { level: 9 } // Maximum compression
    });
    
    let totalFiles = 0;
    let processedFiles = 0;
    
    // Count files first
    try {
      const files = await readdir(dirPath);
      totalFiles = files.length;
    } catch (err) {
      logger.warn(`Could not count files in directory: ${err.message}`);
      totalFiles = 1; // Fallback
    }
    
    // Listen for all archive data to be written
    const archiveComplete = new Promise((resolve, reject) => {
      output.on('close', () => {
        logger.info(`ZIP archive completed: ${zipPath}, size: ${archive.pointer()} bytes`);
        zipProgressCallback(100); // Complete ZIP creation phase
        resolve(zipPath);
      });
      archive.on('error', (err) => {
        logger.error(`ZIP creation error: ${err.message}`);
        reject(err);
      });
    });
    
    // Track file addition progress
    archive.on('entry', (entry) => {
      processedFiles++;
      const zipProgress = Math.round((processedFiles / totalFiles) * 100);
      zipProgressCallback(zipProgress);
      logger.debug(`ZIP progress: ${zipProgress}% (${processedFiles}/${totalFiles} files)`);
    });
    
    // Pipe archive data to the file
    archive.pipe(output);
    
    // Append files from directory
    archive.directory(dirPath, false);
    
    // Finalize the archive
    await archive.finalize();
    
    // Wait for the archive to complete
    await archiveComplete;
    
    // Phase 2: Upload ZIP (50-100% of progress)
    const uploadProgressCallback = (uploadProgress) => {
      if (progressCallback) {
        const totalProgress = 50 + Math.round(uploadProgress * 0.5);
        progressCallback(totalProgress);
      }
    };
    
    // Upload the zip file to Firebase with progress
    const downloadURL = await uploadToFirebaseWithProgress(zipPath, destinationPath, uploadProgressCallback);
    
    // Clean up the zip file
    await cleanupTempFiles(zipPath);
    
    return downloadURL;
  } catch (error) {
    logger.error(`Error creating and uploading zip with progress:`, error);
    throw new Error(`Failed to create and upload zip: ${error.message}`);
  }
};

module.exports = {
  downloadFile,
  downloadFileWithProgress,
  uploadToFirebase,
  uploadToFirebaseWithProgress,
  deleteFromFirebase,
  cleanupTempFiles,
  uploadDirectoryAsZip,
  uploadDirectoryAsZipWithProgress,
  ensureTempDir
};