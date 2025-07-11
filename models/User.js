const mongoose = require('mongoose');

// User schema for MongoDB storage
const userSchema = new mongoose.Schema({
  fbId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  serialNumber: {
    type: String,
    required: true,
    unique: true
  },
  cookies: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  lastUsed: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  },
  loginMethod: {
    type: String,
    enum: ['puppeteer', 'manual'],
    default: 'manual'
  },
  userAgent: {
    type: String,
    default: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
  },
  totalActions: {
    type: Number,
    default: 0
  },
  lastActionAt: {
    type: Date
  },
  metadata: {
    ip: String,
    country: String,
    device: String
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      // Don't expose sensitive cookie data in JSON responses
      delete ret.cookies;
      return ret;
    }
  }
});

// Index for better query performance
userSchema.index({ fbId: 1, isActive: 1 });
userSchema.index({ timestamp: -1 });
userSchema.index({ lastUsed: -1 });

// Methods
userSchema.methods.updateLastUsed = function() {
  this.lastUsed = new Date();
  return this.save();
};

userSchema.methods.incrementActions = function() {
  this.totalActions += 1;
  this.lastActionAt = new Date();
  return this.save();
};

userSchema.methods.deactivate = function() {
  this.isActive = false;
  return this.save();
};

// Static methods
userSchema.statics.findActiveUsers = function() {
  return this.find({ isActive: true }).sort({ lastUsed: -1 });
};

userSchema.statics.findByFbId = function(fbId) {
  return this.findOne({ fbId, isActive: true });
};

userSchema.statics.cleanupInactiveUsers = function(daysOld = 30) {
  const cutoffDate = new Date(Date.now() - (daysOld * 24 * 60 * 60 * 1000));
  return this.updateMany(
    { lastUsed: { $lt: cutoffDate }, isActive: true },
    { isActive: false }
  );
};

// Pre-save middleware
userSchema.pre('save', function(next) {
  if (this.isNew) {
    // Generate serial number if not provided
    if (!this.serialNumber) {
      this.serialNumber = `FB_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
  }
  next();
});

module.exports = mongoose.model('User', userSchema);