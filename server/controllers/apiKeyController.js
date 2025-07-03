// const ApiKey = require('../models/apiKey');
// const ApiUsage = require('../models/apiUsage');
// const logger = require('../utils/logger');

// // Create a new API key
// const createApiKey = async (req, res) => {
//   try {
//     const { name } = req.body;
//     const userId = req.user.uid;

//     if (!name || name.trim().length === 0) {
//       return res.status(400).json({ error: 'API key name is required' });
//     }

//     // Generate new API key
//     const apiKey = ApiKey.generateApiKey();
//     const keyHash = ApiKey.hashApiKey(apiKey);

//     // Create new API key record
//     const newApiKey = new ApiKey({
//       userId,
//       keyId: apiKey.substring(3, 11), // Use part of the key as ID for display
//       keyHash,
//       name: name.trim(),
//     });

//     await newApiKey.save();

//     // Return the API key only once (security best practice)
//     res.status(201).json({
//       message: 'API key created successfully',
//       apiKey: {
//         id: newApiKey._id,
//         keyId: newApiKey.keyId,
//         name: newApiKey.name,
//         key: apiKey, // Only shown once
//         createdAt: newApiKey.createdAt,
//         lastUsed: newApiKey.lastUsed,
//         usageCount: newApiKey.usageCount,
//         isActive: newApiKey.isActive,
//       },
//     });
//   } catch (error) {
//     logger.error('Error creating API key:', error);
//     res.status(500).json({ error: 'Failed to create API key' });
//   }
// };

// // Get all API keys for a user (without the actual key)
// const getUserApiKeys = async (req, res) => {
//   try {
//     const userId = req.user.uid;

//     const apiKeys = await ApiKey.find({ userId, isActive: true })
//       .select('-keyHash') // Exclude the hash for security
//       .sort({ createdAt: -1 });

//     res.json({
//       apiKeys: apiKeys.map(key => ({
//         id: key._id,
//         keyId: key.keyId,
//         name: key.name,
//         createdAt: key.createdAt,
//         lastUsed: key.lastUsed,
//         usageCount: key.usageCount,
//         isActive: key.isActive,
//       })),
//     });
//   } catch (error) {
//     logger.error('Error fetching API keys:', error);
//     res.status(500).json({ error: 'Failed to fetch API keys' });
//   }
// };

// // Delete an API key
// const deleteApiKey = async (req, res) => {
//   try {
//     const { keyId } = req.params;
//     const userId = req.user.uid;

//     const apiKey = await ApiKey.findOne({ _id: keyId, userId });

//     if (!apiKey) {
//       return res.status(404).json({ error: 'API key not found' });
//     }

//     // Soft delete by setting isActive to false
//     apiKey.isActive = false;
//     await apiKey.save();

//     res.json({ message: 'API key deleted successfully' });
//   } catch (error) {
//     logger.error('Error deleting API key:', error);
//     res.status(500).json({ error: 'Failed to delete API key' });
//   }
// };

// // Get API usage statistics
// const getUsageStats = async (req, res) => {
//   try {
//     const userId = req.user.uid;
//     const { days = 30 } = req.query;

//     // Get daily usage stats
//     const dailyStats = await ApiUsage.getUserStats(userId, parseInt(days));
    
//     // Get current day usage counts
//     const apiKeyUsageToday = await ApiUsage.getDailyUsage(userId, 'api_key');
//     const webUsageToday = await ApiUsage.getDailyUsage(userId, 'web');
    
//     // Get endpoint usage breakdown
//     const endpointStats = await ApiUsage.getEndpointStats(userId, parseInt(days));
    
//     // Calculate success rates and organize data
//     const processedStats = dailyStats.reduce((acc, stat) => {
//       const date = stat._id.date;
//       const accessType = stat._id.accessType;
      
//       if (!acc[date]) {
//         acc[date] = {
//           date,
//           apiKey: { count: 0, successRate: 0, avgResponseTime: 0 },
//           web: { count: 0, successRate: 0, avgResponseTime: 0 },
//           total: 0,
//         };
//       }
      
//       const successRate = stat.count > 0 ? (stat.successCount / stat.count) * 100 : 0;
      
//       acc[date][accessType] = {
//         count: stat.count,
//         successRate: Math.round(successRate * 100) / 100,
//         avgResponseTime: Math.round(stat.avgResponseTime),
//       };
      
//       acc[date].total += stat.count;
      
//       return acc;
//     }, {});

//     // Convert to array and sort by date
//     const chartData = Object.values(processedStats).sort((a, b) => new Date(b.date) - new Date(a.date));

//     res.json({
//       usage: {
//         today: {
//           apiKey: apiKeyUsageToday,
//           web: webUsageToday,
//           total: apiKeyUsageToday + webUsageToday,
//           limits: {
//             apiKey: 5,
//             web: 5,
//             total: 10,
//           },
//         },
//         chartData,
//         endpoints: endpointStats,
//       },
//     });
//   } catch (error) {
//     logger.error('Error fetching usage stats:', error);
//     res.status(500).json({ error: 'Failed to fetch usage statistics' });
//   }
// };

// // Regenerate an API key
// const regenerateApiKey = async (req, res) => {
//   try {
//     const { keyId } = req.params;
//     const userId = req.user.uid;

//     const existingApiKey = await ApiKey.findOne({ _id: keyId, userId, isActive: true });

//     if (!existingApiKey) {
//       return res.status(404).json({ error: 'API key not found' });
//     }

//     // Generate new API key
//     const newApiKey = ApiKey.generateApiKey();
//     const keyHash = ApiKey.hashApiKey(newApiKey);

//     // Update the existing record
//     existingApiKey.keyId = newApiKey.substring(3, 11);
//     existingApiKey.keyHash = keyHash;
//     existingApiKey.lastUsed = null;
//     existingApiKey.usageCount = 0;

//     await existingApiKey.save();

//     res.json({
//       message: 'API key regenerated successfully',
//       apiKey: {
//         id: existingApiKey._id,
//         keyId: existingApiKey.keyId,
//         name: existingApiKey.name,
//         key: newApiKey, // Only shown once
//         createdAt: existingApiKey.createdAt,
//         lastUsed: existingApiKey.lastUsed,
//         usageCount: existingApiKey.usageCount,
//         isActive: existingApiKey.isActive,
//       },
//     });
//   } catch (error) {
//     logger.error('Error regenerating API key:', error);
//     res.status(500).json({ error: 'Failed to regenerate API key' });
//   }
// };

// module.exports = {
//   createApiKey,
//   getUserApiKeys,
//   deleteApiKey,
//   getUsageStats,
//   regenerateApiKey,
// };


const ApiKey = require('../models/apiKey');
const ApiUsage = require('../models/apiUsage');
const logger = require('../utils/logger');

// Create a new API key
const createApiKey = async (req, res) => {
  try {
    const { name } = req.body;
    const userId = req.user.uid;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'API key name is required' });
    }

    // Generate new API key
    const apiKey = ApiKey.generateApiKey();
    const keyHash = ApiKey.hashApiKey(apiKey);

    // Create new API key record
    const newApiKey = new ApiKey({
      userId,
      keyId: apiKey.substring(3, 11), // Use part of the key as ID for display
      keyHash,
      name: name.trim(),
    });

    await newApiKey.save();

    // Return the API key only once (security best practice)
    res.status(201).json({
      message: 'API key created successfully',
      apiKey: {
        id: newApiKey._id,
        keyId: newApiKey.keyId,
        name: newApiKey.name,
        key: apiKey, // Only shown once
        createdAt: newApiKey.createdAt,
        lastUsed: newApiKey.lastUsed,
        usageCount: newApiKey.usageCount,
        isActive: newApiKey.isActive,
      },
    });
  } catch (error) {
    logger.error('Error creating API key:', error);
    res.status(500).json({ error: 'Failed to create API key' });
  }
};

// Get all API keys for a user (without the actual key)
const getUserApiKeys = async (req, res) => {
  try {
    const userId = req.user.uid;

    const apiKeys = await ApiKey.find({ userId, isActive: true })
      .select('-keyHash') // Exclude the hash for security
      .sort({ createdAt: -1 });

    res.json({
      apiKeys: apiKeys.map(key => ({
        id: key._id,
        keyId: key.keyId,
        name: key.name,
        createdAt: key.createdAt,
        lastUsed: key.lastUsed,
        usageCount: key.usageCount,
        isActive: key.isActive,
      })),
    });
  } catch (error) {
    logger.error('Error fetching API keys:', error);
    res.status(500).json({ error: 'Failed to fetch API keys' });
  }
};

// Delete an API key
const deleteApiKey = async (req, res) => {
  try {
    const { keyId } = req.params;
    const userId = req.user.uid;

    const apiKey = await ApiKey.findOne({ _id: keyId, userId });

    if (!apiKey) {
      return res.status(404).json({ error: 'API key not found' });
    }

    // Soft delete by setting isActive to false
    apiKey.isActive = false;
    await apiKey.save();

    res.json({ message: 'API key deleted successfully' });
  } catch (error) {
    logger.error('Error deleting API key:', error);
    res.status(500).json({ error: 'Failed to delete API key' });
  }
};

// Get API usage statistics - UPDATED to show only JOB CREATION stats
const getUsageStats = async (req, res) => {
  try {
    const userId = req.user.uid;
    const { days = 30 } = req.query;

    // Get daily JOB CREATION stats (not total API usage)
    const dailyJobStats = await ApiUsage.getJobStats(userId, parseInt(days));
    
    // Get current day JOB COUNT (not total API usage)
    const apiKeyJobsToday = await ApiUsage.getDailyJobCount(userId, 'api_key');
    const webJobsToday = await ApiUsage.getDailyJobCount(userId, 'web');
    
    // Get endpoint usage breakdown (this can stay the same for detailed breakdown)
    const endpointStats = await ApiUsage.getEndpointStats(userId, parseInt(days));
    
    // Calculate success rates and organize data for JOB CREATION only
    const processedStats = dailyJobStats.reduce((acc, stat) => {
      const date = stat._id.date;
      const accessType = stat._id.accessType;
      
      if (!acc[date]) {
        acc[date] = {
          date,
          apiKey: { count: 0, successRate: 0, avgResponseTime: 0 },
          web: { count: 0, successRate: 0, avgResponseTime: 0 },
          total: 0,
        };
      }
      
      const successRate = stat.count > 0 ? (stat.successCount / stat.count) * 100 : 0;
      
      acc[date][accessType] = {
        count: stat.count,
        successRate: Math.round(successRate * 100) / 100,
        avgResponseTime: Math.round(stat.avgResponseTime),
      };
      
      acc[date].total += stat.count;
      
      return acc;
    }, {});

    // Convert to array and sort by date
    const chartData = Object.values(processedStats).sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json({
      usage: {
        today: {
          apiKey: apiKeyJobsToday,  // Now shows only jobs, not total API calls
          web: webJobsToday,        // Now shows only jobs, not total API calls
          total: apiKeyJobsToday + webJobsToday,
          limits: {
            apiKey: 5,
            web: 5,
            total: 10,
          },
        },
        chartData,
        endpoints: endpointStats,
      },
    });
  } catch (error) {
    logger.error('Error fetching usage stats:', error);
    res.status(500).json({ error: 'Failed to fetch usage statistics' });
  }
};

// Regenerate an API key
const regenerateApiKey = async (req, res) => {
  try {
    const { keyId } = req.params;
    const userId = req.user.uid;

    const existingApiKey = await ApiKey.findOne({ _id: keyId, userId, isActive: true });

    if (!existingApiKey) {
      return res.status(404).json({ error: 'API key not found' });
    }

    // Generate new API key
    const newApiKey = ApiKey.generateApiKey();
    const keyHash = ApiKey.hashApiKey(newApiKey);

    // Update the existing record
    existingApiKey.keyId = newApiKey.substring(3, 11);
    existingApiKey.keyHash = keyHash;
    existingApiKey.lastUsed = null;
    existingApiKey.usageCount = 0;

    await existingApiKey.save();

    res.json({
      message: 'API key regenerated successfully',
      apiKey: {
        id: existingApiKey._id,
        keyId: existingApiKey.keyId,
        name: existingApiKey.name,
        key: newApiKey, // Only shown once
        createdAt: existingApiKey.createdAt,
        lastUsed: existingApiKey.lastUsed,
        usageCount: existingApiKey.usageCount,
        isActive: existingApiKey.isActive,
      },
    });
  } catch (error) {
    logger.error('Error regenerating API key:', error);
    res.status(500).json({ error: 'Failed to regenerate API key' });
  }
};

module.exports = {
  createApiKey,
  getUserApiKeys,
  deleteApiKey,
  getUsageStats,
  regenerateApiKey,
};