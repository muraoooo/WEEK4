const mongoose = require('mongoose');

// 簡易キャッシュ
const settingsCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5分

const systemSettingsSchema = new mongoose.Schema({
  category: {
    type: String,
    required: true,
    enum: ['general', 'security', 'email', 'storage', 'notification', 'api'],
    unique: true
  },
  settings: {
    // General Settings
    siteName: { type: String, default: 'Secure Session System' },
    siteDescription: { type: String, default: '' },
    adminEmail: { type: String, default: '' },
    timezone: { type: String, default: 'Asia/Tokyo' },
    defaultLanguage: { type: String, default: 'ja' },
    maintenanceMode: { type: Boolean, default: false },
    maintenanceMessage: { type: String, default: 'システムメンテナンス中です' },
    maintenanceExcludedIPs: [{ type: String }],
    
    // Security Settings
    sessionTimeout: { type: Number, default: 30 }, // minutes
    maxLoginAttempts: { type: Number, default: 5 },
    lockoutDuration: { type: Number, default: 30 }, // minutes
    passwordMinLength: { type: Number, default: 8 },
    passwordRequireUppercase: { type: Boolean, default: true },
    passwordRequireLowercase: { type: Boolean, default: true },
    passwordRequireNumbers: { type: Boolean, default: true },
    passwordRequireSpecialChars: { type: Boolean, default: false },
    passwordExpiryDays: { type: Number, default: 0 }, // 0 = no expiry
    passwordHistoryCount: { type: Number, default: 3 },
    forceHttps: { type: Boolean, default: true },
    force2FA: { type: Boolean, default: false },
    csrfProtection: { type: Boolean, default: true },
    ipWhitelist: [{ type: String }],
    ipBlacklist: [{ type: String }],
    
    // Email Settings
    smtpHost: { type: String, default: '' },
    smtpPort: { type: Number, default: 587 },
    smtpUser: { type: String, default: '' },
    smtpPassword: { type: String, default: '' }, // encrypted
    smtpSecure: { type: Boolean, default: false },
    emailFrom: { type: String, default: '' },
    emailFromName: { type: String, default: '' },
    emailSendDelay: { type: Number, default: 1 }, // seconds
    emailMaxRetries: { type: Number, default: 3 },
    
    // Storage Settings
    maxFileSize: { type: Number, default: 10 }, // MB
    allowedFileTypes: [{ type: String, default: ['jpg', 'jpeg', 'png', 'gif', 'pdf'] }],
    imageAutoResize: { type: Boolean, default: true },
    imageMaxWidth: { type: Number, default: 1920 },
    imageMaxHeight: { type: Number, default: 1080 },
    storageType: { type: String, default: 'local', enum: ['local', 's3'] },
    cdnEnabled: { type: Boolean, default: false },
    cdnUrl: { type: String, default: '' },
    cacheExpiry: { type: Number, default: 86400 }, // seconds
    autoBackup: { type: Boolean, default: false },
    backupInterval: { type: Number, default: 24 }, // hours
    backupRetention: { type: Number, default: 30 }, // days
    
    // Notification Settings
    notifyNewUser: { type: Boolean, default: true },
    notifyReport: { type: Boolean, default: true },
    notifyError: { type: Boolean, default: true },
    errorLogLevel: { type: String, default: 'error', enum: ['error', 'warning', 'info'] },
    alertFrequency: { type: Number, default: 60 }, // minutes
    notificationEmails: [{ type: String }],
    cpuAlertThreshold: { type: Number, default: 80 },
    memoryAlertThreshold: { type: Number, default: 80 },
    diskAlertThreshold: { type: Number, default: 90 },
    
    // API Settings
    rateLimitPerMinute: { type: Number, default: 60 },
    rateLimitPerHour: { type: Number, default: 1000 },
    rateLimitExcludedIPs: [{ type: String }],
    corsEnabled: { type: Boolean, default: true },
    allowedOrigins: [{ type: String, default: ['http://localhost:3000'] }],
    allowedMethods: [{ type: String, default: ['GET', 'POST', 'PUT', 'DELETE'] }],
    allowedHeaders: [{ type: String }],
    webhookUrl: { type: String, default: '' },
    webhookSecret: { type: String, default: '' },
    webhookEvents: [{ type: String }],
    webhookRetries: { type: Number, default: 3 },
    webhookTimeout: { type: Number, default: 10 }, // seconds
  },
  updatedBy: {
    type: String,
    default: 'system'
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  version: {
    type: Number,
    default: 1
  }
}, {
  timestamps: true
});

// インデックス（categoryはuniqueなので自動的にインデックスが作成される）
systemSettingsSchema.index({ updatedAt: -1 });

// 設定変更履歴スキーマ
const settingsHistorySchema = new mongoose.Schema({
  settingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SystemSettings',
    required: true
  },
  category: {
    type: String,
    required: true
  },
  previousSettings: {
    type: Object,
    required: true
  },
  newSettings: {
    type: Object,
    required: true
  },
  changedBy: {
    type: String,
    required: true
  },
  changedAt: {
    type: Date,
    default: Date.now
  },
  changeReason: {
    type: String,
    default: ''
  },
  ipAddress: {
    type: String,
    default: ''
  },
  userAgent: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// インデックス
settingsHistorySchema.index({ settingId: 1, changedAt: -1 });
settingsHistorySchema.index({ category: 1, changedAt: -1 });
settingsHistorySchema.index({ changedBy: 1, changedAt: -1 });

// メソッド: 設定の取得
systemSettingsSchema.statics.getSettings = async function(category) {
  // キャッシュをチェック
  const cacheKey = `settings_${category}`;
  const cached = settingsCache.get(cacheKey);
  
  if (cached && cached.timestamp > Date.now() - CACHE_TTL) {
    return cached.data;
  }
  
  let settings = await this.findOne({ category });
  
  if (!settings) {
    // デフォルト設定を作成
    settings = await this.create({
      category,
      settings: {}
    });
  }
  
  // キャッシュに保存
  settingsCache.set(cacheKey, {
    data: settings,
    timestamp: Date.now()
  });
  
  return settings;
};

// メソッド: 設定の更新
systemSettingsSchema.statics.updateSettings = async function(category, newSettings, updatedBy, ipAddress) {
  const currentSettings = await this.getSettings(category);
  const previousSettings = currentSettings.settings;
  
  // 新しい設定をマージ
  const mergedSettings = {
    ...currentSettings.settings,
    ...newSettings
  };
  
  // 設定を更新
  currentSettings.settings = mergedSettings;
  currentSettings.updatedBy = updatedBy;
  currentSettings.updatedAt = new Date();
  currentSettings.version += 1;
  
  await currentSettings.save();
  
  // キャッシュをクリア
  const cacheKey = `settings_${category}`;
  settingsCache.delete(cacheKey);
  
  // 履歴を記録
  await SettingsHistory.create({
    settingId: currentSettings._id,
    category,
    previousSettings,
    newSettings: mergedSettings,
    changedBy: updatedBy,
    ipAddress
  });
  
  return currentSettings;
};

// メソッド: 全設定の取得
systemSettingsSchema.statics.getAllSettings = async function() {
  const categories = ['general', 'security', 'email', 'storage', 'notification', 'api'];
  
  // 並列処理で全カテゴリーを取得
  const settingsPromises = categories.map(category => this.getSettings(category));
  const results = await Promise.all(settingsPromises);
  
  // 結果をオブジェクトに変換
  const allSettings = {};
  categories.forEach((category, index) => {
    allSettings[category] = results[index].settings;
  });
  
  return allSettings;
};

// パスワードの暗号化
systemSettingsSchema.pre('save', async function(next) {
  if (this.isModified('settings.smtpPassword') && this.settings.smtpPassword) {
    const bcrypt = require('bcryptjs');
    this.settings.smtpPassword = await bcrypt.hash(this.settings.smtpPassword, 10);
  }
  next();
});

const SystemSettings = mongoose.models.SystemSettings || mongoose.model('SystemSettings', systemSettingsSchema);
const SettingsHistory = mongoose.models.SettingsHistory || mongoose.model('SettingsHistory', settingsHistorySchema);

module.exports = { SystemSettings, SettingsHistory };