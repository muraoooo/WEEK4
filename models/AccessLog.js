import mongoose from 'mongoose';

const AccessLogSchema = new mongoose.Schema({
  // 匿名化されたIPアドレス（ハッシュ化）
  anonymizedIp: {
    type: String,
    required: true,
    index: true, // インデックスで検索高速化
  },
  
  // アクセスされたページのパス
  pagePath: {
    type: String,
    required: true,
    index: true,
  },
  
  // デバイス種別（desktop, mobile, tablet, unknown）
  deviceType: {
    type: String,
    enum: ['desktop', 'mobile', 'tablet', 'unknown'],
    default: 'unknown',
    index: true,
  },
  
  // ブラウザ種別（Chrome, Firefox, Safari, Edge, Other）
  browserType: {
    type: String,
    enum: ['Chrome', 'Firefox', 'Safari', 'Edge', 'Other'],
    default: 'Other',
  },
  
  // OS種別（Windows, Mac, Linux, iOS, Android, Other）
  osType: {
    type: String,
    enum: ['Windows', 'Mac', 'Linux', 'iOS', 'Android', 'Other'],
    default: 'Other',
  },
  
  // 画面解像度カテゴリ（Small, Medium, Large, XLarge）
  screenCategory: {
    type: String,
    enum: ['Small', 'Medium', 'Large', 'XLarge', 'Unknown'],
    default: 'Unknown',
  },
  
  // リファラードメイン（完全URLではなくドメインのみ）
  referrerDomain: {
    type: String,
    default: 'direct',
  },
  
  // 国コード（IPジオロケーション、オプション）
  countryCode: {
    type: String,
    default: 'Unknown',
  },
  
  // 時間帯（0-23の整数、詳細な時刻は保存しない）
  hourOfDay: {
    type: Number,
    min: 0,
    max: 23,
    required: true,
  },
  
  // 曜日（0=日曜日, 6=土曜日）
  dayOfWeek: {
    type: Number,
    min: 0,
    max: 6,
    required: true,
  },
  
  // セッション時間（秒単位、5分単位で丸める）
  sessionDuration: {
    type: Number,
    default: 0,
  },
  
  // ページ読み込み時間（ミリ秒、100ms単位で丸める）
  pageLoadTime: {
    type: Number,
    default: 0,
  },
  
  // タイムスタンプ（分単位で丸める）
  timestamp: {
    type: Date,
    default: Date.now,
    required: true,
    index: true,
  },
  
  // データのバージョン（将来の拡張のため）
  version: {
    type: Number,
    default: 1,
  },
});

// 複合インデックス（よくある検索パターンの最適化）
AccessLogSchema.index({ timestamp: -1, pagePath: 1 });
AccessLogSchema.index({ timestamp: -1, deviceType: 1 });
AccessLogSchema.index({ hourOfDay: 1, dayOfWeek: 1 });

// TTLインデックス（90日後に自動削除、GDPR準拠）
AccessLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 7776000 }); // 90日

// 静的メソッド：時間帯別集計
AccessLogSchema.statics.getHourlyStats = async function(startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        timestamp: {
          $gte: startDate,
          $lte: endDate,
        },
      },
    },
    {
      $group: {
        _id: '$hourOfDay',
        count: { $sum: 1 },
        uniqueVisitors: { $addToSet: '$anonymizedIp' },
      },
    },
    {
      $project: {
        hour: '$_id',
        pageViews: '$count',
        uniqueVisitors: { $size: '$uniqueVisitors' },
      },
    },
    {
      $sort: { hour: 1 },
    },
  ]);
};

// 静的メソッド：デバイス別統計
AccessLogSchema.statics.getDeviceStats = async function(startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        timestamp: {
          $gte: startDate,
          $lte: endDate,
        },
      },
    },
    {
      $group: {
        _id: '$deviceType',
        count: { $sum: 1 },
      },
    },
    {
      $project: {
        deviceType: '$_id',
        count: 1,
        _id: 0,
      },
    },
  ]);
};

// 静的メソッド：人気ページランキング
AccessLogSchema.statics.getTopPages = async function(limit = 10, startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        timestamp: {
          $gte: startDate,
          $lte: endDate,
        },
      },
    },
    {
      $group: {
        _id: '$pagePath',
        pageViews: { $sum: 1 },
        uniqueVisitors: { $addToSet: '$anonymizedIp' },
        avgLoadTime: { $avg: '$pageLoadTime' },
      },
    },
    {
      $project: {
        pagePath: '$_id',
        pageViews: 1,
        uniqueVisitors: { $size: '$uniqueVisitors' },
        avgLoadTime: { $round: ['$avgLoadTime', 0] },
        _id: 0,
      },
    },
    {
      $sort: { pageViews: -1 },
    },
    {
      $limit: limit,
    },
  ]);
};

// 静的メソッド：リファラー統計
AccessLogSchema.statics.getReferrerStats = async function(startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        timestamp: {
          $gte: startDate,
          $lte: endDate,
        },
      },
    },
    {
      $group: {
        _id: '$referrerDomain',
        count: { $sum: 1 },
      },
    },
    {
      $project: {
        referrer: '$_id',
        count: 1,
        _id: 0,
      },
    },
    {
      $sort: { count: -1 },
    },
    {
      $limit: 10,
    },
  ]);
};

// 既存のモデルをチェックしてから作成
const AccessLog = mongoose.models.AccessLog || mongoose.model('AccessLog', AccessLogSchema);

export default AccessLog;