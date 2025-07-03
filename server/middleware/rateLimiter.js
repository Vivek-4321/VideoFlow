const ApiUsage = require('../models/apiUsage');
const logger = require('../utils/logger');

// Rate limiting middleware - now based on JOB CREATION only
const rateLimiter = async (req, res, next) => {
  try {
    const userId = req.user?.uid;
    const accessType = req.apiKeyUsed ? 'api_key' : 'web';

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Get current day JOB CREATION counts (not total API usage)
    const apiKeyJobsToday = await ApiUsage.getDailyJobCount(userId, 'api_key');
    const webJobsToday = await ApiUsage.getDailyJobCount(userId, 'web');

    // Define limits for JOB CREATION
    const API_KEY_LIMIT = 5;
    const WEB_LIMIT = 5;

    // Check limits based on access type for JOB CREATION
    if (accessType === 'api_key' && apiKeyJobsToday >= API_KEY_LIMIT) {
      return res.status(429).json({
        error: 'API key daily job limit exceeded',
        message: `You have exceeded your daily limit of ${API_KEY_LIMIT} transcoding jobs via API keys.`,
        limits: {
          apiKey: { used: apiKeyJobsToday, limit: API_KEY_LIMIT },
          web: { used: webJobsToday, limit: WEB_LIMIT },
        },
        resetTime: getNextResetTime(),
      });
    }

    if (accessType === 'web' && webJobsToday >= WEB_LIMIT) {
      return res.status(429).json({
        error: 'Web daily job limit exceeded',
        message: `You have exceeded your daily limit of ${WEB_LIMIT} transcoding jobs via web interface.`,
        limits: {
          apiKey: { used: apiKeyJobsToday, limit: API_KEY_LIMIT },
          web: { used: webJobsToday, limit: WEB_LIMIT },
        },
        resetTime: getNextResetTime(),
      });
    }

    // Add job usage information to request for logging
    req.usageInfo = {
      apiKeyJobs: apiKeyJobsToday,
      webJobs: webJobsToday,
      accessType,
      limits: {
        apiKey: API_KEY_LIMIT,
        web: WEB_LIMIT,
      },
    };

    next();
  } catch (error) {
    logger.error('Error in rate limiter:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get next reset time (start of next day)
const getNextResetTime = () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  return tomorrow.toISOString();
};

// Usage tracking middleware (this tracks ALL API calls for monitoring)
const trackUsage = (req, res, next) => {
  const startTime = Date.now();
  
  // Store original res.json to intercept response
  const originalJson = res.json;
  
  res.json = function(data) {
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    // Log usage data asynchronously
    setImmediate(() => {
      try {
        // Only track usage if we have a valid user ID
        if (req.user?.uid) {
          const usageData = {
            userId: req.user.uid,
            apiKeyId: req.apiKeyDoc?._id || null,
            endpoint: req.originalUrl,
            method: req.method,
            statusCode: res.statusCode,
            responseTime,
            requestSize: req.get('content-length') || 0,
            responseSize: JSON.stringify(data).length,
            userAgent: req.get('user-agent') || '',
            ipAddress: req.ip || req.connection.remoteAddress,
            accessType: req.apiKeyUsed ? 'api_key' : 'web',
            errorMessage: res.statusCode >= 400 ? data?.error || data?.message : null,
          };
          
          ApiUsage.logUsage(usageData);
        } else {
          logger.warn('Skipping usage tracking: no valid user ID found');
        }
      } catch (error) {
        logger.error('Error tracking usage:', error);
      }
    });
    
    // Call original res.json
    return originalJson.call(this, data);
  };
  
  next();
};

// Check if endpoint should be rate limited (only JOB CREATION endpoints)
const shouldRateLimit = (req) => {
  // Only rate limit job creation endpoints
  const rateLimitedEndpoints = [
    { path: '/api/v1/jobs', method: 'POST' },      // Job creation via new API
    { path: '/api/jobs', method: 'POST' },         // Job creation via legacy API
  ];
  
  return rateLimitedEndpoints.some(endpoint => 
    req.originalUrl.includes(endpoint.path) && req.method === endpoint.method
  );
};

// Conditional rate limiter - only applies to job creation
const conditionalRateLimit = (req, res, next) => {
  if (shouldRateLimit(req)) {
    return rateLimiter(req, res, next);
  }
  next();
};

module.exports = {
  rateLimiter,
  trackUsage,
  conditionalRateLimit,
  getNextResetTime,
};