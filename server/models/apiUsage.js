const mongoose = require('mongoose');

const ApiUsageSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  apiKeyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ApiKey',
    default: null
  },
  endpoint: {
    type: String,
    required: true
  },
  method: {
    type: String,
    required: true,
    enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
  },
  statusCode: {
    type: Number,
    required: true
  },
  responseTime: {
    type: Number,
    required: true
  },
  requestSize: {
    type: Number,
    default: 0
  },
  responseSize: {
    type: Number,
    default: 0
  },
  userAgent: String,
  ipAddress: String,
  accessType: {
    type: String,
    required: true,
    enum: ['api_key', 'web']
  },
  errorMessage: String,
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true
});

// Indexes for performance
ApiUsageSchema.index({ userId: 1, timestamp: -1 });
ApiUsageSchema.index({ userId: 1, accessType: 1, timestamp: -1 });
ApiUsageSchema.index({ endpoint: 1, method: 1 });

// Static method to log usage
ApiUsageSchema.statics.logUsage = async function(usageData) {
  try {
    const usage = new this(usageData);
    await usage.save();
  } catch (error) {
    console.error('Error logging usage:', error);
  }
};

// Static method to get daily usage count (ALL endpoints)
ApiUsageSchema.statics.getDailyUsage = async function(userId, accessType) {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);
  
  const count = await this.countDocuments({
    userId,
    accessType,
    timestamp: {
      $gte: startOfDay,
      $lte: endOfDay
    }
  });
  
  return count;
};

// NEW: Static method to get daily JOB CREATION count only
ApiUsageSchema.statics.getDailyJobCount = async function(userId, accessType) {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);
  
  const count = await this.countDocuments({
    userId,
    accessType,
    endpoint: '/api/v1/jobs',
    method: 'POST',
    timestamp: {
      $gte: startOfDay,
      $lte: endOfDay
    }
  });
  
  return count;
};

// NEW: Static method to get historical job creation stats
ApiUsageSchema.statics.getJobStats = async function(userId, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  const pipeline = [
    {
      $match: {
        userId,
        endpoint: '/api/v1/jobs',
        method: 'POST',
        timestamp: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: {
          date: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } },
          accessType: "$accessType"
        },
        count: { $sum: 1 },
        avgResponseTime: { $avg: "$responseTime" },
        successCount: {
          $sum: {
            $cond: [{ $lt: ["$statusCode", 400] }, 1, 0]
          }
        },
        errorCount: {
          $sum: {
            $cond: [{ $gte: ["$statusCode", 400] }, 1, 0]
          }
        }
      }
    },
    {
      $sort: { "_id.date": -1 }
    }
  ];
  
  return await this.aggregate(pipeline);
};

// Static method to get user stats (ALL endpoints - for general API usage)
ApiUsageSchema.statics.getUserStats = async function(userId, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  const pipeline = [
    {
      $match: {
        userId,
        timestamp: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: {
          date: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } },
          accessType: "$accessType"
        },
        count: { $sum: 1 },
        avgResponseTime: { $avg: "$responseTime" },
        successCount: {
          $sum: {
            $cond: [{ $lt: ["$statusCode", 400] }, 1, 0]
          }
        },
        errorCount: {
          $sum: {
            $cond: [{ $gte: ["$statusCode", 400] }, 1, 0]
          }
        }
      }
    },
    {
      $sort: { "_id.date": -1 }
    }
  ];
  
  return await this.aggregate(pipeline);
};

// Static method to get endpoint usage breakdown
ApiUsageSchema.statics.getEndpointStats = async function(userId, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  const pipeline = [
    {
      $match: {
        userId,
        timestamp: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: {
          endpoint: "$endpoint",
          method: "$method"
        },
        count: { $sum: 1 },
        avgResponseTime: { $avg: "$responseTime" },
        successRate: {
          $avg: {
            $cond: [{ $lt: ["$statusCode", 400] }, 1, 0]
          }
        }
      }
    },
    {
      $sort: { count: -1 }
    },
    {
      $limit: 10
    }
  ];
  
  return await this.aggregate(pipeline);
};

module.exports = mongoose.model("ApiUsage", ApiUsageSchema);