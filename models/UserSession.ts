/**
 * ユーザーセッション管理モデル
 * JWT認証とセッション追跡
 */

import mongoose, { Schema, Document, Model } from 'mongoose';

// =================================================================
// 型定義
// =================================================================

export interface IUserSession extends Document {
  // 基本情報
  userId: string;
  sessionId: string;
  deviceId: string;
  
  // 接続情報
  ipAddress: string;
  userAgent: string;
  
  // 認証情報
  email?: string;
  role?: string;
  
  // セッション状態
  isActive: boolean;
  createdAt: Date;
  lastAccessAt: Date;
  expiresAt?: Date;
  
  // 終了情報
  endedAt?: Date;
  endReason?: string;
  
  // セキュリティ情報
  deviceFingerprint?: string;
  riskScore?: number;
  confidence?: number;
  isBlocked?: boolean;
  blockReason?: string;
  blockedAt?: Date;
  
  // メタデータ
  deviceInfo?: {
    screen?: {
      width: number;
      height: number;
      colorDepth: number;
    };
    timezone?: string;
    language?: string;
    platform?: string;
  };
  
  location?: {
    country?: string;
    city?: string;
    region?: string;
  };
  
  // セッション統計
  sessionCount?: number;
  tokenVersion?: number;
  
  // タイムアウト設定
  idleTimeout?: Date;
  absoluteTimeout?: Date;
}

export interface IUserSessionMethods {
  isExpired(): boolean;
  updateActivity(): Promise<void>;
  terminate(reason: string): Promise<void>;
  calculateRiskScore(): number;
}

export type UserSessionModel = Model<IUserSession, {}, IUserSessionMethods>;

// =================================================================
// スキーマ定義
// =================================================================

const userSessionSchema = new Schema<IUserSession, UserSessionModel, IUserSessionMethods>({
  // 基本情報
  userId: {
    type: String,
    required: true,
    index: true
  },
  
  sessionId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  deviceId: {
    type: String,
    required: true,
    index: true
  },
  
  // 接続情報
  ipAddress: {
    type: String,
    required: true
  },
  
  userAgent: {
    type: String,
    required: true
  },
  
  // 認証情報
  email: {
    type: String,
    lowercase: true,
    trim: true
  },
  
  role: {
    type: String,
    trim: true
  },
  
  // セッション状態
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  
  lastAccessAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  
  expiresAt: {
    type: Date,
    index: true
  },
  
  // 終了情報
  endedAt: {
    type: Date
  },
  
  endReason: {
    type: String,
    trim: true
  },
  
  // セキュリティ情報
  deviceFingerprint: {
    type: String,
    index: true
  },
  
  riskScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  
  confidence: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
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
  
  blockedAt: {
    type: Date
  },
  
  // メタデータ
  deviceInfo: {
    screen: {
      width: { type: Number },
      height: { type: Number },
      colorDepth: { type: Number }
    },
    timezone: { type: String },
    language: { type: String },
    platform: { type: String }
  },
  
  location: {
    country: { type: String },
    city: { type: String },
    region: { type: String }
  },
  
  // セッション統計
  sessionCount: {
    type: Number,
    default: 1
  },
  
  tokenVersion: {
    type: Number,
    default: 1
  },
  
  // タイムアウト設定
  idleTimeout: {
    type: Date
  },
  
  absoluteTimeout: {
    type: Date
  }
}, {
  timestamps: true,
  collection: 'user_sessions'
});

// =================================================================
// インデックス
// =================================================================

// 複合インデックス
userSessionSchema.index({ userId: 1, isActive: 1 });
userSessionSchema.index({ deviceId: 1, isActive: 1 });
userSessionSchema.index({ sessionId: 1, isActive: 1 });
userSessionSchema.index({ createdAt: -1, isActive: 1 });
userSessionSchema.index({ lastAccessAt: -1, isActive: 1 });

// TTL インデックス（30日後に自動削除）
userSessionSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 30 * 24 * 60 * 60 }
);

// =================================================================
// インスタンスメソッド
// =================================================================

/**
 * セッション有効期限チェック
 */
userSessionSchema.methods.isExpired = function(): boolean {
  if (!this.isActive) return true;
  
  const now = new Date();
  
  // 絶対タイムアウトチェック
  if (this.absoluteTimeout && now > this.absoluteTimeout) {
    return true;
  }
  
  // アイドルタイムアウトチェック
  if (this.idleTimeout && now > this.idleTimeout) {
    return true;
  }
  
  // expiresAtチェック
  if (this.expiresAt && now > this.expiresAt) {
    return true;
  }
  
  return false;
};

/**
 * アクティビティ更新
 */
userSessionSchema.methods.updateActivity = async function(): Promise<void> {
  this.lastAccessAt = new Date();
  
  // アイドルタイムアウトを30分後に設定
  this.idleTimeout = new Date(Date.now() + 30 * 60 * 1000);
  
  await this.save();
};

/**
 * セッション終了
 */
userSessionSchema.methods.terminate = async function(reason: string): Promise<void> {
  this.isActive = false;
  this.endedAt = new Date();
  this.endReason = reason;
  
  await this.save();
};

/**
 * リスクスコア計算
 */
userSessionSchema.methods.calculateRiskScore = function(): number {
  let score = 0;
  
  // デバイス情報の欠如
  if (!this.deviceInfo || !this.deviceInfo.screen) {
    score += 20;
  }
  
  // 位置情報の異常
  if (this.location && this.location.country !== 'JP') {
    score += 25;
  }
  
  // 既存のリスクスコア
  if (this.riskScore) {
    score += this.riskScore;
  }
  
  return Math.min(score, 100);
};

// =================================================================
// 静的メソッド
// =================================================================

/**
 * アクティブセッション取得
 */
userSessionSchema.statics.getActiveSessions = function(userId: string) {
  return this.find({
    userId,
    isActive: true
  }).sort({ lastAccessAt: -1 });
};

/**
 * 期限切れセッションのクリーンアップ
 */
userSessionSchema.statics.cleanupExpiredSessions = async function() {
  const now = new Date();
  
  const result = await this.updateMany(
    {
      isActive: true,
      $or: [
        { absoluteTimeout: { $lt: now } },
        { idleTimeout: { $lt: now } },
        { expiresAt: { $lt: now } }
      ]
    },
    {
      $set: {
        isActive: false,
        endedAt: now,
        endReason: 'timeout'
      }
    }
  );
  
  return result.modifiedCount;
};

// =================================================================
// ミドルウェア
// =================================================================

/**
 * 保存前処理
 */
userSessionSchema.pre('save', function(next) {
  // 絶対タイムアウトを8時間後に設定（新規作成時のみ）
  if (this.isNew && !this.absoluteTimeout) {
    this.absoluteTimeout = new Date(Date.now() + 8 * 60 * 60 * 1000);
  }
  
  // アイドルタイムアウトを30分後に設定（新規作成時のみ）
  if (this.isNew && !this.idleTimeout) {
    this.idleTimeout = new Date(Date.now() + 30 * 60 * 1000);
  }
  
  next();
});

// =================================================================
// エクスポート
// =================================================================

const UserSession = mongoose.models?.UserSession || mongoose.model<IUserSession, UserSessionModel>('UserSession', userSessionSchema);

export default UserSession;