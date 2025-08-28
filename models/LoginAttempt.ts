/**
 * ログイン試行記録モデル
 * セキュリティ監視とブルートフォース攻撃対策
 */

import mongoose, { Schema, Document, Model } from 'mongoose';

// =================================================================
// 型定義
// =================================================================

export interface ILoginAttempt extends Document {
  // 基本情報
  email: string;
  ipAddress: string;
  userAgent?: string;
  
  // 試行結果
  success: boolean;
  failureReason?: 'user_not_found' | 'invalid_password' | 'account_locked' | 'rate_limited' | 'two_factor_failed' | 'invalid_session';
  
  // 位置情報（IPから推定）
  country?: string;
  city?: string;
  region?: string;
  timezone?: string;
  
  // セキュリティ情報
  riskScore: number; // 0-100のリスクスコア
  isBlocked: boolean;
  blockReason?: string;
  
  // 2段階認証関連
  twoFactorRequired: boolean;
  twoFactorSuccess?: boolean;
  
  // メタデータ
  sessionId?: string;
  requestId?: string;
  processingTime?: number; // ms
  
  // タイムスタンプ
  timestamp: Date;
  createdAt: Date;
}

export interface ILoginAttemptMethods {
  calculateRiskScore(): number;
  markAsBlocked(reason: string): Promise<void>;
  getLocationFromIP(): Promise<any>;
  isAnomalous(): boolean;
}

export interface ILoginAttemptStatics {
  recordAttempt(data: {
    email: string;
    ipAddress: string;
    userAgent?: string;
    success: boolean;
    failureReason?: string;
    twoFactorRequired?: boolean;
    twoFactorSuccess?: boolean;
    sessionId?: string;
    processingTime?: number;
  }): Promise<ILoginAttempt>;
}

export type LoginAttemptModel = Model<ILoginAttempt, {}, ILoginAttemptMethods> & ILoginAttemptStatics;

// =================================================================
// スキーマ定義
// =================================================================

const loginAttemptSchema = new Schema<ILoginAttempt, LoginAttemptModel, ILoginAttemptMethods>({
  // 基本情報
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    index: true
  },
  
  ipAddress: {
    type: String,
    required: true,
    index: true,
    validate: {
      validator: function(v: string) {
        // IPv4 or IPv6 validation
        const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
        const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
        return ipv4Regex.test(v) || ipv6Regex.test(v) || v === '127.0.0.1';
      },
      message: '無効なIPアドレス形式です'
    }
  },
  
  userAgent: {
    type: String,
    trim: true
  },
  
  // 試行結果
  success: {
    type: Boolean,
    required: true,
    index: true
  },
  
  failureReason: {
    type: String,
    enum: [
      'user_not_found',
      'invalid_password', 
      'account_locked',
      'rate_limited',
      'two_factor_failed',
      'invalid_session'
    ],
    index: true
  },
  
  // 位置情報
  country: {
    type: String,
    trim: true
  },
  
  city: {
    type: String,
    trim: true
  },
  
  region: {
    type: String,
    trim: true
  },
  
  timezone: {
    type: String,
    trim: true
  },
  
  // セキュリティ情報
  riskScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 0,
    index: true
  },
  
  isBlocked: {
    type: Boolean,
    default: false,
    index: true
  },
  
  blockReason: {
    type: String,
    trim: true
  },
  
  // 2段階認証関連
  twoFactorRequired: {
    type: Boolean,
    default: false
  },
  
  twoFactorSuccess: {
    type: Boolean
  },
  
  // メタデータ
  sessionId: {
    type: String,
    trim: true
  },
  
  requestId: {
    type: String,
    trim: true
  },
  
  processingTime: {
    type: Number,
    min: 0
  },
  
  // タイムスタンプ
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true,
  collection: 'login_attempts'
});

// =================================================================
// インデックス
// =================================================================

// 複合インデックス（クエリパフォーマンス向上）
loginAttemptSchema.index({ email: 1, timestamp: -1 });
loginAttemptSchema.index({ ipAddress: 1, timestamp: -1 });
loginAttemptSchema.index({ success: 1, timestamp: -1 });
loginAttemptSchema.index({ riskScore: -1, timestamp: -1 });
loginAttemptSchema.index({ isBlocked: 1, timestamp: -1 });

// TTL インデックス（90日後に自動削除）
loginAttemptSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 90 * 24 * 60 * 60 }
);

// =================================================================
// インスタンスメソッド
// =================================================================

/**
 * リスクスコア計算
 */
loginAttemptSchema.methods.calculateRiskScore = function(): number {
  let score = 0;
  
  // 失敗による加点
  if (!this.success) {
    score += 20;
  }
  
  // 失敗理由による加点
  switch (this.failureReason) {
    case 'user_not_found':
      score += 15;
      break;
    case 'invalid_password':
      score += 25;
      break;
    case 'account_locked':
      score += 30;
      break;
    case 'two_factor_failed':
      score += 20;
      break;
  }
  
  // UserAgentによる加点
  if (!this.userAgent || this.userAgent.length < 10) {
    score += 15; // 疑わしいUserAgent
  }
  
  // 時間帯による加点（深夜時間帯）
  const hour = this.timestamp.getHours();
  if (hour >= 23 || hour <= 5) {
    score += 10;
  }
  
  // 位置情報による加点（日本国外）
  if (this.country && this.country !== 'JP') {
    score += 25;
  }
  
  return Math.min(score, 100);
};

/**
 * ブロック処理
 */
loginAttemptSchema.methods.markAsBlocked = async function(reason: string): Promise<void> {
  this.isBlocked = true;
  this.blockReason = reason;
  this.riskScore = Math.max(this.riskScore, 80);
  await this.save();
};

/**
 * 位置情報取得（IPアドレスから）
 */
loginAttemptSchema.methods.getLocationFromIP = async function(): Promise<any> {
  // 実装例：外部APIを使用してIPから位置情報を取得
  // 今回は簡易版
  
  if (this.ipAddress === '127.0.0.1' || this.ipAddress.startsWith('192.168.') || this.ipAddress.startsWith('10.')) {
    return {
      country: 'JP',
      city: 'Local',
      region: 'Local',
      timezone: 'Asia/Tokyo'
    };
  }
  
  // 実際の実装では、GeoIPサービスを使用
  try {
    // const geoData = await geoipService.lookup(this.ipAddress);
    // return geoData;
    
    // モック実装
    return {
      country: 'JP',
      city: 'Tokyo',
      region: 'Tokyo',
      timezone: 'Asia/Tokyo'
    };
  } catch (error) {
    console.error('GeoIP lookup failed:', error);
    return null;
  }
};

/**
 * 異常検知
 */
loginAttemptSchema.methods.isAnomalous = function(): boolean {
  // 複数の条件で異常を判定
  
  // 高リスクスコア
  if (this.riskScore >= 70) return true;
  
  // 疑わしいUserAgent
  if (!this.userAgent || this.userAgent.length < 10) return true;
  
  // 海外からのアクセス（日本のサービスの場合）
  if (this.country && this.country !== 'JP') return true;
  
  // 深夜の連続失敗
  const hour = this.timestamp.getHours();
  if (!this.success && (hour >= 23 || hour <= 5)) return true;
  
  return false;
};

// =================================================================
// 静的メソッド
// =================================================================

/**
 * ログイン試行記録
 */
loginAttemptSchema.statics.recordAttempt = async function(data: {
  email: string;
  ipAddress: string;
  userAgent?: string;
  success: boolean;
  failureReason?: string;
  twoFactorRequired?: boolean;
  twoFactorSuccess?: boolean;
  sessionId?: string;
  processingTime?: number;
}) {
  const attempt = new this(data);
  
  // 位置情報の取得
  const location = await attempt.getLocationFromIP();
  if (location) {
    attempt.country = location.country;
    attempt.city = location.city;
    attempt.region = location.region;
    attempt.timezone = location.timezone;
  }
  
  // リスクスコア計算
  attempt.riskScore = attempt.calculateRiskScore();
  
  // 異常検知
  if (attempt.isAnomalous()) {
    attempt.isBlocked = true;
    attempt.blockReason = 'anomalous_activity';
  }
  
  await attempt.save();
  return attempt;
};

// =================================================================
// ミドルウェア（フック）
// =================================================================

/**
 * 保存前処理
 */
loginAttemptSchema.pre('save', function(next) {
  // リスクスコアが未設定の場合は計算
  if (this.riskScore === 0) {
    this.riskScore = this.calculateRiskScore();
  }
  
  next();
});

// =================================================================
// エクスポート
// =================================================================

const LoginAttempt = mongoose.models?.LoginAttempt || mongoose.model<ILoginAttempt, LoginAttemptModel>('LoginAttempt', loginAttemptSchema);

export default LoginAttempt;