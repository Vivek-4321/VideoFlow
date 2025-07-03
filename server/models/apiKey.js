const mongoose = require("mongoose");
const crypto = require("crypto");

const ApiKeySchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    keyId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    keyHash: {
      type: String,
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: true,
      maxlength: 100,
    },
    lastUsed: {
      type: Date,
      default: null,
    },
    usageCount: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
ApiKeySchema.index({ userId: 1, isActive: 1 });
ApiKeySchema.index({ keyHash: 1 });

// Static method to generate a new API key
ApiKeySchema.statics.generateApiKey = function() {
  const prefix = 'ak_';
  const randomBytes = crypto.randomBytes(32).toString('hex');
  return prefix + randomBytes;
};

// Method to hash API key
ApiKeySchema.statics.hashApiKey = function(apiKey) {
  return crypto.createHash('sha256').update(apiKey).digest('hex');
};

// Method to verify API key
ApiKeySchema.statics.verifyApiKey = async function(apiKey) {
  const keyHash = this.hashApiKey(apiKey);
  return await this.findOne({ keyHash, isActive: true });
};

// Update last used timestamp
ApiKeySchema.methods.updateLastUsed = function() {
  this.lastUsed = new Date();
  this.usageCount += 1;
  return this.save();
};

module.exports = mongoose.model("ApiKey", ApiKeySchema);