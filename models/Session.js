const mongoose = require('mongoose');

const SessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  userEmail: {
    type: String,
    required: true
  },
  sessionToken: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  deviceInfo: {
    userAgent: String,
    ip: String,
    deviceType: {
      type: String,
      enum: ['desktop', 'mobile', 'tablet', 'unknown'],
      default: 'unknown'
    },
    browser: String,
    os: String
  },
  location: String,
  country: String,
  city: String,
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  isSuspicious: {
    type: Boolean,
    default: false,
    index: true
  },
  loginCount: {
    type: Number,
    default: 1
  },
  lastActivity: {
    type: Date,
    default: Date.now,
    index: true
  },
  expiresAt: {
    type: Date,
    required: true,
    index: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for better query performance
SessionSchema.index({ userId: 1, isActive: 1 });
SessionSchema.index({ expiresAt: 1 });
SessionSchema.index({ lastActivity: 1 });
SessionSchema.index({ createdAt: -1 });

// Virtual for checking if session is expired
SessionSchema.virtual('isExpired').get(function() {
  return this.expiresAt < new Date();
});

// Method to check if session is inactive (no activity for more than 30 minutes)
SessionSchema.methods.isInactive = function() {
  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
  return this.lastActivity < thirtyMinutesAgo;
};

// Method to update last activity
SessionSchema.methods.updateActivity = function() {
  this.lastActivity = new Date();
  return this.save();
};

// Method to terminate session
SessionSchema.methods.terminate = function() {
  this.isActive = false;
  this.expiresAt = new Date();
  return this.save();
};

// Static method to find active sessions for a user
SessionSchema.statics.findActiveByUserId = function(userId) {
  return this.find({
    userId,
    isActive: true,
    expiresAt: { $gt: new Date() }
  });
};

// Static method to terminate all sessions for a user
SessionSchema.statics.terminateAllForUser = async function(userId) {
  return this.updateMany(
    { userId, isActive: true },
    { 
      isActive: false,
      expiresAt: new Date(),
      updatedAt: new Date()
    }
  );
};

// Static method to clean up expired sessions
SessionSchema.statics.cleanupExpired = function() {
  return this.deleteMany({
    $or: [
      { expiresAt: { $lt: new Date() } },
      { isActive: false, updatedAt: { $lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }
    ]
  });
};

// Static method to get session statistics
SessionSchema.statics.getStats = async function() {
  const now = new Date();
  const oneHourAgo = new Date(now - 60 * 60 * 1000);
  const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000);
  const oneWeekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);

  const [total, active, expired, suspicious, deviceStats, recentActivity] = await Promise.all([
    this.countDocuments(),
    this.countDocuments({ isActive: true, expiresAt: { $gt: now } }),
    this.countDocuments({ $or: [{ isActive: false }, { expiresAt: { $lte: now } }] }),
    this.countDocuments({ isSuspicious: true }),
    this.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$deviceInfo.deviceType', count: { $sum: 1 } } }
    ]),
    Promise.all([
      this.countDocuments({ lastActivity: { $gte: oneHourAgo } }),
      this.countDocuments({ lastActivity: { $gte: oneDayAgo } }),
      this.countDocuments({ lastActivity: { $gte: oneWeekAgo } })
    ])
  ]);

  // Transform device stats
  const deviceStatsObj = {
    desktop: 0,
    mobile: 0,
    tablet: 0,
    unknown: 0
  };
  deviceStats.forEach(item => {
    if (item._id && deviceStatsObj.hasOwnProperty(item._id)) {
      deviceStatsObj[item._id] = item.count;
    }
  });

  return {
    total,
    active,
    expired,
    suspicious,
    deviceStats: deviceStatsObj,
    recentActivity: {
      last1h: recentActivity[0],
      last24h: recentActivity[1],
      last7d: recentActivity[2]
    }
  };
};

// Middleware to update updatedAt on save
SessionSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

const Session = mongoose.models.Session || mongoose.model('Session', SessionSchema);

module.exports = Session;