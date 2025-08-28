const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  // 通報の基本情報
  reportType: {
    type: String,
    enum: ['post', 'user', 'comment'],
    required: true
  },
  
  // 通報対象の情報
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  targetUserId: String,
  targetContent: String,
  
  // 通報者の情報
  reporterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  reporterEmail: String,
  reporterName: String,
  
  // 通報理由
  reason: {
    type: String,
    enum: [
      'spam',
      'harassment',
      'inappropriate_content',
      'hate_speech',
      'violence',
      'misinformation',
      'copyright',
      'other'
    ],
    required: true
  },
  
  reasonDetails: String,
  
  // ステータス管理
  status: {
    type: String,
    enum: ['pending', 'reviewing', 'approved', 'rejected', 'resolved'],
    default: 'pending'
  },
  
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  
  // 処理情報
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  assignedAt: Date,
  
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewedAt: Date,
  
  resolution: {
    action: {
      type: String,
      enum: ['warning_issued', 'content_removed', 'user_suspended', 'user_banned', 'no_action', 'false_report']
    },
    notes: String,
    resolvedAt: Date
  },
  
  // 追加情報
  evidence: [{
    type: String,
    url: String,
    uploadedAt: Date
  }],
  
  previousReports: [{
    reportId: mongoose.Schema.Types.ObjectId,
    createdAt: Date
  }],
  
  internalNotes: [{
    note: String,
    addedBy: mongoose.Schema.Types.ObjectId,
    addedAt: Date
  }],
  
  // メタデータ
  ipAddress: String,
  userAgent: String,
  
  // タイムスタンプ
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// インデックス
reportSchema.index({ status: 1, priority: -1, createdAt: -1 });
reportSchema.index({ targetId: 1 });
reportSchema.index({ reporterId: 1 });
reportSchema.index({ assignedTo: 1 });

// 更新時にupdatedAtを自動更新
reportSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Report', reportSchema);