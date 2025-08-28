const mongoose = require('mongoose');

// 監査ログスキーマ
const auditLogSchema = new mongoose.Schema({
  // 基本情報
  timestamp: {
    type: Date,
    required: true,
    default: Date.now,
    index: true
  },
  eventType: {
    type: String,
    required: true,
    index: true,
    enum: [
      // 認証イベント
      'AUTH_LOGIN_SUCCESS',
      'AUTH_LOGIN_FAILED',
      'AUTH_LOGOUT',
      'AUTH_PASSWORD_RESET',
      'AUTH_2FA_ENABLED',
      'AUTH_2FA_DISABLED',
      'AUTH_SESSION_EXPIRED',
      'AUTH_UNAUTHORIZED_ACCESS',
      
      // データ操作イベント
      'DATA_CREATE',
      'DATA_READ',
      'DATA_UPDATE',
      'DATA_DELETE',
      'DATA_EXPORT',
      'DATA_IMPORT',
      'DATA_BULK_OPERATION',
      
      // ユーザー管理イベント
      'USER_CREATED',
      'USER_UPDATED',
      'USER_DELETED',
      'USER_SUSPENDED',
      'USER_REACTIVATED',
      'USER_BANNED',
      'ROLE_CHANGED',
      'PERMISSION_GRANTED',
      'PERMISSION_REVOKED',
      
      // 通報システムイベント
      'REPORT_CREATED',
      'REPORT_REVIEWED',
      'REPORT_APPROVED',
      'REPORT_REJECTED',
      'REPORT_ESCALATED',
      
      // システムイベント
      'SYSTEM_START',
      'SYSTEM_SHUTDOWN',
      'SYSTEM_CONFIG_CHANGED',
      'SYSTEM_BACKUP',
      'SYSTEM_RESTORE',
      'SYSTEM_ERROR',
      'SYSTEM_WARNING',
      
      // セキュリティイベント
      'SECURITY_ALERT',
      'SECURITY_BREACH_ATTEMPT',
      'SECURITY_SCAN_COMPLETED',
      'SECURITY_POLICY_VIOLATION'
    ]
  },
  eventCategory: {
    type: String,
    required: true,
    enum: ['security', 'data', 'system', 'user', 'compliance'],
    index: true
  },
  severity: {
    type: String,
    required: true,
    enum: ['critical', 'high', 'medium', 'low', 'info'],
    index: true
  },
  
  // アクター情報
  userId: {
    type: String,
    index: true
  },
  userEmail: String,
  userName: String,
  userRole: String,
  sessionId: String,
  
  // アクション詳細
  action: {
    type: String,
    required: true
  },
  resource: String,
  resourceId: String,
  resourceType: {
    type: String,
    enum: ['user', 'post', 'report', 'comment', 'system', 'config', 'file']
  },
  
  // リクエスト情報
  method: {
    type: String,
    enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD']
  },
  path: String,
  query: mongoose.Schema.Types.Mixed,
  body: mongoose.Schema.Types.Mixed, // 機密情報は除外
  statusCode: Number,
  
  // 変更情報
  changes: {
    before: mongoose.Schema.Types.Mixed,
    after: mongoose.Schema.Types.Mixed,
    fields: [String]
  },
  
  // 環境情報
  ipAddress: {
    type: String,
    index: true
  },
  userAgent: String,
  location: {
    country: String,
    city: String,
    region: String,
    coordinates: {
      type: [Number],
      index: '2dsphere'
    }
  },
  
  // セキュリティ
  signature: {
    type: String,
    required: true
  },
  previousHash: String, // 前のログのハッシュ
  isValid: {
    type: Boolean,
    default: true
  },
  
  // メタデータ
  tags: [String],
  correlationId: String, // 関連操作の追跡
  duration: Number, // 処理時間（ms）
  errorDetails: {
    code: String,
    message: String,
    stack: String
  },
  
  // アーカイブ情報
  isArchived: {
    type: Boolean,
    default: false,
    index: true
  },
  archivedAt: Date,
  archiveId: String,
  
  // 追加のメタデータ
  metadata: mongoose.Schema.Types.Mixed
}, {
  timestamps: true,
  collection: 'audit_logs'
});

// インデックスの設定
auditLogSchema.index({ timestamp: -1 });
auditLogSchema.index({ userId: 1, timestamp: -1 });
auditLogSchema.index({ eventType: 1, timestamp: -1 });
auditLogSchema.index({ severity: 1, timestamp: -1 });
auditLogSchema.index({ correlationId: 1 });
auditLogSchema.index({ 'location.coordinates': '2dsphere' });
auditLogSchema.index({ isArchived: 1, timestamp: -1 });

// 複合インデックス
auditLogSchema.index({ eventCategory: 1, severity: 1, timestamp: -1 });
auditLogSchema.index({ userId: 1, eventType: 1, timestamp: -1 });

// 仮想フィールド
auditLogSchema.virtual('isRecent').get(function() {
  const daysSinceLog = (Date.now() - this.timestamp) / (1000 * 60 * 60 * 24);
  return daysSinceLog < 7;
});

auditLogSchema.virtual('isCritical').get(function() {
  return this.severity === 'critical' || this.severity === 'high';
});

// 静的メソッド
auditLogSchema.statics.logEvent = async function(eventData) {
  const crypto = require('crypto');
  
  // 最新のログを取得して previousHash を設定
  const lastLog = await this.findOne().sort({ timestamp: -1 });
  if (lastLog) {
    eventData.previousHash = lastLog.signature;
  }
  
  // 署名を生成
  const signatureData = [
    (eventData.timestamp || new Date()).toISOString ? 
      (eventData.timestamp || new Date()).toISOString() :
      new Date(eventData.timestamp || Date.now()).toISOString(),
    eventData.eventType,
    eventData.userId || 'system',
    eventData.action,
    JSON.stringify(eventData.changes || {})
  ].join('|');
  
  const hmac = crypto.createHmac('sha256', process.env.AUDIT_LOG_SECRET || 'default-secret-key');
  hmac.update(signatureData);
  eventData.signature = hmac.digest('hex');
  
  // ログを作成
  const log = new this(eventData);
  await log.save();
  
  return log;
};

// インスタンスメソッド
auditLogSchema.methods.verify = function() {
  const crypto = require('crypto');
  
  const signatureData = [
    this.timestamp.toISOString(),
    this.eventType,
    this.userId || 'system',
    this.action,
    JSON.stringify(this.changes || {})
  ].join('|');
  
  const hmac = crypto.createHmac('sha256', process.env.AUDIT_LOG_SECRET || 'default-secret-key');
  hmac.update(signatureData);
  const expectedSignature = hmac.digest('hex');
  
  return this.signature === expectedSignature;
};

// チェーン検証
auditLogSchema.statics.verifyChain = async function(startDate, endDate) {
  const logs = await this.find({
    timestamp: {
      $gte: startDate,
      $lte: endDate
    }
  }).sort({ timestamp: 1 });
  
  const results = {
    total: logs.length,
    valid: 0,
    invalid: 0,
    broken: []
  };
  
  for (let i = 0; i < logs.length; i++) {
    const log = logs[i];
    
    // 個別署名の検証
    if (log.verify()) {
      results.valid++;
    } else {
      results.invalid++;
      results.broken.push({
        id: log._id,
        timestamp: log.timestamp,
        reason: 'Invalid signature'
      });
    }
    
    // チェーンの検証（2番目以降）
    if (i > 0) {
      const prevLog = logs[i - 1];
      if (log.previousHash !== prevLog.signature) {
        results.broken.push({
          id: log._id,
          timestamp: log.timestamp,
          reason: 'Broken chain'
        });
      }
    }
  }
  
  return results;
};

// アーカイブ処理
auditLogSchema.statics.archiveOldLogs = async function(daysOld = 90) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);
  
  const result = await this.updateMany(
    {
      timestamp: { $lt: cutoffDate },
      isArchived: false
    },
    {
      $set: {
        isArchived: true,
        archivedAt: new Date(),
        archiveId: `archive_${Date.now()}`
      }
    }
  );
  
  return result;
};

// 統計情報の取得
auditLogSchema.statics.getStats = async function(startDate, endDate) {
  const pipeline = [
    {
      $match: {
        timestamp: {
          $gte: startDate,
          $lte: endDate
        }
      }
    },
    {
      $facet: {
        byEventType: [
          { $group: { _id: '$eventType', count: { $sum: 1 } } },
          { $sort: { count: -1 } }
        ],
        bySeverity: [
          { $group: { _id: '$severity', count: { $sum: 1 } } },
          { $sort: { _id: 1 } }
        ],
        byUser: [
          { $group: { _id: '$userId', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 10 }
        ],
        byHour: [
          {
            $group: {
              _id: { $hour: '$timestamp' },
              count: { $sum: 1 }
            }
          },
          { $sort: { _id: 1 } }
        ],
        total: [
          { $count: 'count' }
        ]
      }
    }
  ];
  
  const result = await this.aggregate(pipeline);
  return result[0];
};

// 異常検出
auditLogSchema.statics.detectAnomalies = async function() {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  
  const anomalies = [];
  
  // 1. 短時間での大量ログイン失敗
  const failedLogins = await this.aggregate([
    {
      $match: {
        eventType: 'AUTH_LOGIN_FAILED',
        timestamp: { $gte: oneHourAgo }
      }
    },
    {
      $group: {
        _id: '$ipAddress',
        count: { $sum: 1 },
        users: { $addToSet: '$userEmail' }
      }
    },
    {
      $match: {
        count: { $gte: 5 }
      }
    }
  ]);
  
  if (failedLogins.length > 0) {
    anomalies.push({
      type: 'BRUTE_FORCE_ATTEMPT',
      details: failedLogins
    });
  }
  
  // 2. 異常なデータアクセスパターン
  const dataAccess = await this.aggregate([
    {
      $match: {
        eventCategory: 'data',
        timestamp: { $gte: oneHourAgo }
      }
    },
    {
      $group: {
        _id: '$userId',
        count: { $sum: 1 },
        resources: { $addToSet: '$resourceId' }
      }
    },
    {
      $match: {
        count: { $gte: 100 }
      }
    }
  ]);
  
  if (dataAccess.length > 0) {
    anomalies.push({
      type: 'EXCESSIVE_DATA_ACCESS',
      details: dataAccess
    });
  }
  
  // 3. 権限昇格の試み
  const privilegeEscalation = await this.find({
    eventType: 'AUTH_UNAUTHORIZED_ACCESS',
    timestamp: { $gte: oneHourAgo }
  });
  
  if (privilegeEscalation.length > 0) {
    anomalies.push({
      type: 'PRIVILEGE_ESCALATION_ATTEMPT',
      details: privilegeEscalation
    });
  }
  
  return anomalies;
};

// モデルのエクスポート
module.exports = mongoose.models.AuditLog || mongoose.model('AuditLog', auditLogSchema);