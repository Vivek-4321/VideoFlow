const Docker = require('dockerode');
const logger = require('./logger');

// Initialize Docker client
const docker = new Docker();

/**
 * Check Docker connection and details
 */
const checkDockerConnection = async () => {
  try {
    const info = await docker.info();
    logger.info(`Connected to Docker daemon: version ${info.ServerVersion}`);
    
    const containers = await docker.listContainers({ all: true });
    logger.info(`Found ${containers.length} containers`);
    
    return {
      success: true,
      version: info.ServerVersion,
      containerCount: containers.length,
      runningCount: containers.filter(c => c.State === 'running').length,
    };
  } catch (error) {
    logger.error(`Failed to connect to Docker daemon: ${error.message}`);
    throw new Error(`Docker connection error: ${error.message}`);
  }
};

/**
 * Pull an image if it doesn't exist
 */
const ensureImageExists = async (imageName) => {
  try {
    // Check if image exists
    const images = await docker.listImages();
    const imageExists = images.some(img => {
      return img.RepoTags && img.RepoTags.includes(imageName);
    });
    
    if (imageExists) {
      logger.info(`Image ${imageName} already exists`);
      return true;
    }
    
    // Pull the image
    logger.info(`Pulling image ${imageName}...`);
    
    // Parse image name and tag
    const [repo, tag] = imageName.split(':');
    
    const stream = await docker.pull(`${repo}:${tag || 'latest'}`);
    
    // Wait for pull to complete
    return new Promise((resolve, reject) => {
      docker.modem.followProgress(stream, 
        (err, output) => {
          if (err) {
            logger.error(`Error pulling image ${imageName}: ${err.message}`);
            return reject(err);
          }
          logger.info(`Successfully pulled image ${imageName}`);
          resolve(true);
        },
        (event) => {
          if (event.progress) {
            logger.debug(`Pulling ${imageName}: ${event.progress}`);
          }
        }
      );
    });
  } catch (error) {
    logger.error(`Error ensuring image exists (${imageName}): ${error.message}`);
    throw error;
  }
};

/**
 * Check and clean up old containers
 */
const cleanupContainers = async (namePrefix) => {
  try {
    const containers = await docker.listContainers({ all: true });
    
    // Filter containers by name prefix
    const matchingContainers = containers.filter(c => {
      return c.Names.some(n => n.substring(1).startsWith(namePrefix));
    });
    
    // Remove exited containers
    for (const container of matchingContainers) {
      if (container.State !== 'running') {
        logger.info(`Removing container ${container.Names[0]}`);
        const containerObj = docker.getContainer(container.Id);
        await containerObj.remove({ force: true });
      }
    }
    
    return {
      success: true,
      removed: matchingContainers.length,
    };
  } catch (error) {
    logger.error(`Error cleaning up containers: ${error.message}`);
    throw error;
  }
};

/**
 * Check if a specific container exists
 */
const containerExists = async (containerName) => {
  try {
    const containers = await docker.listContainers({ all: true });
    
    return containers.some(c => {
      return c.Names.includes(`/${containerName}`);
    });
  } catch (error) {
    logger.error(`Error checking if container exists: ${error.message}`);
    throw error;
  }
};

/**
 * Get Docker system information
 */
const getDockerInfo = async () => {
  try {
    const info = await docker.info();
    const version = await docker.version();
    
    return {
      info,
      version,
    };
  } catch (error) {
    logger.error(`Error getting Docker info: ${error.message}`);
    throw error;
  }
};

module.exports = {
  docker,
  checkDockerConnection,
  ensureImageExists,
  cleanupContainers,
  containerExists,
  getDockerInfo,
};