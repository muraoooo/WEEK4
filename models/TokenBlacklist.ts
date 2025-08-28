/**
 * トークンブラックリストモデル
 * 無効化されたJWTトークンの管理
 */

import mongoose, { Schema, Document, Model } from 'mongoose';

// =================================================================
// 型定義
// =================================================================

export interface ITokenBlacklist extends Document {
  // トークン情報
  tokenHash: string; // トークンのハッシュ値（セキュリティのため）
  tokenType: 'access' | 'refresh';
  
  // 無効化情報
  reason: string;
  blacklistedAt: Date;
  expiresAt: Date;
  
  // メタデータ
  userId?: string;
  sessionId?: string;
  deviceId?: string;
  ipAddress?: string;
  userAgent?: string;
  
  // 作成情報
  createdAt: Date;
}

export interface ITokenBlacklistMethods {
  isExpired(): boolean;
}

export interface ITokenBlacklistStatics {
  addToBlacklist(token: string, reason: string, metadata?: any): Promise<ITokenBlacklist>;
  isTokenBlacklisted(token: string): Promise<boolean>;
  cleanupExpiredTokens(): Promise<number>;
  getBlacklistStats(): Promise<any>;
}

export type TokenBlacklistModel = Model<ITokenBlacklist, {}, ITokenBlacklistMethods> & ITokenBlacklistStatics;

// =================================================================
// スキーマ定義
// =================================================================

const tokenBlacklistSchema = new Schema<ITokenBlacklist, TokenBlacklistModel, ITokenBlacklistMethods>({
  // トークン情報
  tokenHash: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  tokenType: {
    type: String,
    enum: ['access', 'refresh'],
    required: true,
    index: true
  },
  
  // 無効化情報
  reason: {
    type: String,
    required: true,
    trim: true
  },
  
  blacklistedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  
  expiresAt: {
    type: Date,
    required: true
  },
  
  // メタデータ
  userId: {
    type: String,
    index: true
  },
  
  sessionId: {
    type: String,
    index: true
  },
  
  deviceId: {
    type: String,
    index: true
  },
  
  ipAddress: {
    type: String
  },
  
  userAgent: {
    type: String
  }
}, {
  timestamps: true,
  collection: 'token_blacklist'
});

// =================================================================
// インデックス
// =================================================================

// TTL インデックス（expiresAtで自動削除）
tokenBlacklistSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0 }
);

// 複合インデックス
tokenBlacklistSchema.index({ tokenType: 1, blacklistedAt: -1 });
tokenBlacklistSchema.index({ userId: 1, blacklistedAt: -1 });
tokenBlacklistSchema.index({ reason: 1, blacklistedAt: -1 });

// =================================================================
// インスタンスメソッド
// =================================================================

/**
 * トークン有効期限チェック
 */
tokenBlacklistSchema.methods.isExpired = function(): boolean {
  return new Date() > this.expiresAt;
};

// =================================================================
// 静的メソッド
// =================================================================

/**
 * トークンをブラックリストに追加
 */
tokenBlacklistSchema.statics.addToBlacklist = async function(
  token: string,
  reason: string,
  metadata: any = {}
): Promise<ITokenBlacklist> {
  const crypto = require('crypto');
  
  // トークンをハッシュ化
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  
  // トークンタイプの判定
  let tokenType: 'access' | 'refresh' = 'access';
  let expiresAt = new Date();
  
  try {
    const jwt = require('jsonwebtoken');
    const decoded = jwt.decode(token) as any;
    
    if (decoded) {
      tokenType = decoded.type || 'access';
      if (decoded.exp) {
        expiresAt = new Date(decoded.exp * 1000);
      } else {
        // デフォルトの有効期限設定
        expiresAt = new Date(Date.now() + (tokenType === 'access' ? 15 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000));
      }
    }
  } catch (error) {
    console.error('Token decode error:', error);
    // デフォルト設定
    expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24時間
  }
  
  const blacklistEntry = new this({
    tokenHash,
    tokenType,
    reason,
    expiresAt,
    ...metadata
  });
  
  return await blacklistEntry.save();
};

/**
 * トークンがブラックリストにあるかチェック
 */
tokenBlacklistSchema.statics.isTokenBlacklisted = async function(token: string): Promise<boolean> {
  const crypto = require('crypto');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  
  const blacklistedToken = await this.findOne({
    tokenHash,
    expiresAt: { $gt: new Date() }
  });
  
  return !!blacklistedToken;
};

/**
 * 期限切れトークンのクリーンアップ
 */
tokenBlacklistSchema.statics.cleanupExpiredTokens = async function(): Promise<number> {
  const result = await this.deleteMany({
    expiresAt: { $lt: new Date() }
  });
  
  return result.deletedCount || 0;
};

/**
 * ブラックリスト統計取得
 */
tokenBlacklistSchema.statics.getBlacklistStats = async function() {
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  
  const [
    totalBlacklisted,
    accessTokenCount,
    refreshTokenCount,
    recentBlacklisted,
    reasonStats
  ] = await Promise.all([
    this.countDocuments({ expiresAt: { $gt: now } }),
    this.countDocuments({ tokenType: 'access', expiresAt: { $gt: now } }),
    this.countDocuments({ tokenType: 'refresh', expiresAt: { $gt: now } }),
    this.countDocuments({ 
      blacklistedAt: { $gte: yesterday },
      expiresAt: { $gt: now }
    }),
    this.aggregate([
      { $match: { expiresAt: { $gt: now } } },
      { $group: { _id: '$reason', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ])
  ]);
  
  return {
    totalBlacklisted,
    byType: {
      access: accessTokenCount,
      refresh: refreshTokenCount
    },
    recentBlacklisted,
    byReason: reasonStats.reduce((acc: any, item: any) => {
      acc[item._id] = item.count;
      return acc;
    }, {})
  };
};

// =================================================================
// ミドルウェア
// =================================================================

/**
 * 保存前処理
 */
tokenBlacklistSchema.pre('save', function(next) {
  // 最小有効期限チェック
  const now = new Date();
  if (this.expiresAt <= now) {
    this.expiresAt = new Date(now.getTime() + 60 * 1000); // 最低1分
  }
  
  next();
});

// =================================================================
// エクスポート
// =================================================================

const TokenBlacklist = mongoose.models?.TokenBlacklist || mongoose.model<ITokenBlacklist, TokenBlacklistModel>('TokenBlacklist', tokenBlacklistSchema);

export default TokenBlacklist;