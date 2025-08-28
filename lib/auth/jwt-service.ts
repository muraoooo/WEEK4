/**
 * セキュアJWTサービス
 * アクセス/リフレッシュトークンの生成・検証・管理
 */

import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { connectDatabase } from '@/lib/database';
import TokenBlacklist from '@/models/TokenBlacklist';
import UserSession from '@/models/UserSession';

// =================================================================
// 型定義
// =================================================================

export interface AccessTokenPayload {
  userId: string;
  email: string;
  role: string;
  sessionId: string;
  deviceId: string;
  type: 'access';
  iat: number;
  exp: number;
  iss: string;
  aud: string;
}

export interface RefreshTokenPayload {
  userId: string;
  sessionId: string;
  deviceId: string;
  type: 'refresh';
  version: number; // ローテーション用
  iat: number;
  exp: number;
  iss: string;
  aud: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  refreshExpiresIn: number;
}

export interface TokenValidationResult {
  valid: boolean;
  payload?: AccessTokenPayload | RefreshTokenPayload;
  error?: 'expired' | 'invalid' | 'blacklisted' | 'malformed';
  needsRefresh?: boolean;
}

// =================================================================
// 設定
// =================================================================

const TOKEN_CONFIG = {
  access: {
    expiresIn: 15 * 60, // 15分
    issuer: 'secure-admin-system',
    audience: 'admin-dashboard'
  },
  refresh: {
    expiresIn: 7 * 24 * 60 * 60, // 7日
    issuer: 'secure-admin-system',
    audience: 'admin-refresh'
  }
};

const SECRETS = {
  access: process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET || 'access-fallback',
  refresh: process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET + '_refresh' || 'refresh-fallback'
};

// =================================================================
// JWTサービスクラス
// =================================================================

export class JWTService {
  /**
   * アクセストークン生成
   */
  static generateAccessToken(payload: {
    userId: string;
    email: string;
    role: string;
    sessionId: string;
    deviceId: string;
  }): string {
    const now = Math.floor(Date.now() / 1000);
    
    const tokenPayload: Omit<AccessTokenPayload, 'iat' | 'exp' | 'iss' | 'aud'> = {
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
      sessionId: payload.sessionId,
      deviceId: payload.deviceId,
      type: 'access'
    };

    return jwt.sign(
      tokenPayload,
      SECRETS.access,
      {
        expiresIn: TOKEN_CONFIG.access.expiresIn,
        issuer: TOKEN_CONFIG.access.issuer,
        audience: TOKEN_CONFIG.access.audience,
        algorithm: 'HS256'
      }
    );
  }

  /**
   * リフレッシュトークン生成
   */
  static generateRefreshToken(payload: {
    userId: string;
    sessionId: string;
    deviceId: string;
    version?: number;
  }): string {
    const tokenPayload: Omit<RefreshTokenPayload, 'iat' | 'exp' | 'iss' | 'aud'> = {
      userId: payload.userId,
      sessionId: payload.sessionId,
      deviceId: payload.deviceId,
      type: 'refresh',
      version: payload.version || 1
    };

    return jwt.sign(
      tokenPayload,
      SECRETS.refresh,
      {
        expiresIn: TOKEN_CONFIG.refresh.expiresIn,
        issuer: TOKEN_CONFIG.refresh.issuer,
        audience: TOKEN_CONFIG.refresh.audience,
        algorithm: 'HS256'
      }
    );
  }

  /**
   * トークンペア生成
   */
  static async generateTokenPair(payload: {
    userId: string;
    email: string;
    role: string;
    sessionId: string;
    deviceId: string;
  }): Promise<TokenPair> {
    const accessToken = this.generateAccessToken(payload);
    const refreshToken = this.generateRefreshToken({
      userId: payload.userId,
      sessionId: payload.sessionId,
      deviceId: payload.deviceId,
      version: 1
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: TOKEN_CONFIG.access.expiresIn,
      refreshExpiresIn: TOKEN_CONFIG.refresh.expiresIn
    };
  }

  /**
   * アクセストークン検証
   */
  static async validateAccessToken(token: string): Promise<TokenValidationResult> {
    try {
      // ブラックリストチェック
      await connectDatabase();
      const crypto = await import('crypto');
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      const blacklistedToken = await TokenBlacklist.findOne({
        tokenHash,
        expiresAt: { $gt: new Date() }
      });
      const blacklisted = !!blacklistedToken;
      
      if (blacklisted) {
        return {
          valid: false,
          error: 'blacklisted'
        };
      }

      // JWT検証
      const decoded = jwt.verify(
        token,
        SECRETS.access,
        {
          issuer: TOKEN_CONFIG.access.issuer,
          audience: TOKEN_CONFIG.access.audience,
          algorithms: ['HS256']
        }
      ) as AccessTokenPayload;

      // タイプ確認
      if (decoded.type !== 'access') {
        return {
          valid: false,
          error: 'invalid'
        };
      }

      // セッション有効性チェック
      const sessionValid = await this.validateSession(decoded.sessionId, decoded.userId);
      if (!sessionValid) {
        return {
          valid: false,
          error: 'invalid'
        };
      }

      // 有効期限チェック（リフレッシュが必要かどうか）
      const now = Math.floor(Date.now() / 1000);
      const timeToExpire = decoded.exp - now;
      const needsRefresh = timeToExpire < 5 * 60; // 5分以内に期限切れ

      return {
        valid: true,
        payload: decoded,
        needsRefresh
      };

    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        return {
          valid: false,
          error: 'expired',
          needsRefresh: true
        };
      } else if (error instanceof jwt.JsonWebTokenError) {
        return {
          valid: false,
          error: 'malformed'
        };
      } else {
        return {
          valid: false,
          error: 'invalid'
        };
      }
    }
  }

  /**
   * リフレッシュトークン検証
   */
  static async validateRefreshToken(token: string): Promise<TokenValidationResult> {
    try {
      // ブラックリストチェック
      await connectDatabase();
      const crypto = await import('crypto');
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      const blacklistedToken = await TokenBlacklist.findOne({
        tokenHash,
        expiresAt: { $gt: new Date() }
      });
      const blacklisted = !!blacklistedToken;
      
      if (blacklisted) {
        return {
          valid: false,
          error: 'blacklisted'
        };
      }

      // JWT検証
      const decoded = jwt.verify(
        token,
        SECRETS.refresh,
        {
          issuer: TOKEN_CONFIG.refresh.issuer,
          audience: TOKEN_CONFIG.refresh.audience,
          algorithms: ['HS256']
        }
      ) as RefreshTokenPayload;

      // タイプ確認
      if (decoded.type !== 'refresh') {
        return {
          valid: false,
          error: 'invalid'
        };
      }

      // セッション有効性チェック
      const sessionValid = await this.validateSession(decoded.sessionId, decoded.userId);
      if (!sessionValid) {
        return {
          valid: false,
          error: 'invalid'
        };
      }

      return {
        valid: true,
        payload: decoded
      };

    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        return {
          valid: false,
          error: 'expired'
        };
      } else if (error instanceof jwt.JsonWebTokenError) {
        return {
          valid: false,
          error: 'malformed'
        };
      } else {
        return {
          valid: false,
          error: 'invalid'
        };
      }
    }
  }

  /**
   * トークンリフレッシュ（ローテーション）
   */
  static async refreshTokens(refreshToken: string): Promise<{
    success: boolean;
    tokens?: TokenPair;
    error?: string;
  }> {
    try {
      // リフレッシュトークン検証
      const validation = await this.validateRefreshToken(refreshToken);
      
      if (!validation.valid || !validation.payload) {
        return {
          success: false,
          error: validation.error || 'invalid_refresh_token'
        };
      }

      const refreshPayload = validation.payload as RefreshTokenPayload;

      // セッション情報取得
      const session = await UserSession.findOne({
        sessionId: refreshPayload.sessionId,
        userId: refreshPayload.userId,
        isActive: true
      });

      if (!session) {
        return {
          success: false,
          error: 'session_not_found'
        };
      }

      // 古いリフレッシュトークンをブラックリストに追加
      try {
        const crypto = await import('crypto');
        const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
        let expiresAt = new Date();
        
        try {
          const jwt = await import('jsonwebtoken');
          const decoded = jwt.decode(refreshToken) as any;
          if (decoded && decoded.exp) {
            expiresAt = new Date(decoded.exp * 1000);
          } else {
            expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7日後
          }
        } catch {
          expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24時間後
        }
        
        await TokenBlacklist.create({
          tokenHash,
          tokenType: 'refresh',
          reason: 'token_rotated',
          expiresAt
        });
      } catch (error) {
        console.error('Token blacklisting error:', error);
      }

      // 新しいトークンペア生成
      const newTokens = await this.generateTokenPair({
        userId: session.userId,
        email: session.email || 'unknown@example.com',
        role: session.role || 'user',
        sessionId: session.sessionId,
        deviceId: session.deviceId
      });

      // セッション更新
      session.lastAccessAt = new Date();
      session.tokenVersion = (session.tokenVersion || 0) + 1;
      await session.save();

      return {
        success: true,
        tokens: newTokens
      };

    } catch (error) {
      console.error('Token refresh error:', error);
      return {
        success: false,
        error: 'internal_error'
      };
    }
  }

  /**
   * セッション有効性チェック
   */
  private static async validateSession(sessionId: string, userId: string): Promise<boolean> {
    try {
      const session = await UserSession.findOne({
        sessionId,
        userId,
        isActive: true
      });

      if (!session) {
        return false;
      }

      // 絶対タイムアウトチェック
      const now = new Date();
      if (session.absoluteTimeout && now > session.absoluteTimeout) {
        // セッション無効化
        session.isActive = false;
        session.endedAt = now;
        session.endReason = 'absolute_timeout';
        await session.save();
        return false;
      }

      return true;
    } catch (error) {
      console.error('Session validation error:', error);
      return false;
    }
  }

  /**
   * トークンをブラックリストに追加
   */
  static async blacklistToken(token: string, reason: string): Promise<void> {
    try {
      await connectDatabase();
      const crypto = await import('crypto');
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      
      let tokenType: 'access' | 'refresh' = 'access';
      let expiresAt = new Date();
      
      try {
        const jwt = await import('jsonwebtoken');
        const decoded = jwt.decode(token) as any;
        if (decoded) {
          tokenType = decoded.type || 'access';
          if (decoded.exp) {
            expiresAt = new Date(decoded.exp * 1000);
          } else {
            expiresAt = new Date(Date.now() + (tokenType === 'access' ? 15 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000));
          }
        }
      } catch {
        expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      }
      
      await TokenBlacklist.create({
        tokenHash,
        tokenType,
        reason,
        expiresAt
      });
    } catch (error) {
      console.error('Token blacklisting error:', error);
      throw error;
    }
  }

  /**
   * 全セッション無効化（ユーザーのすべてのトークンを無効化）
   */
  static async invalidateAllUserTokens(userId: string, reason: string = 'manual_logout'): Promise<void> {
    try {
      await connectDatabase();
      
      // アクティブなセッションを取得
      const activeSessions = await UserSession.find({
        userId,
        isActive: true
      });

      // 各セッションを無効化
      for (const session of activeSessions) {
        session.isActive = false;
        session.endedAt = new Date();
        session.endReason = reason;
        await session.save();
      }

      console.log(`Invalidated ${activeSessions.length} sessions for user ${userId}`);
    } catch (error) {
      console.error('Token invalidation error:', error);
      throw error;
    }
  }

  /**
   * セッション統計取得
   */
  static async getSessionStatistics(userId: string): Promise<{
    totalSessions: number;
    activeSessions: number;
    devicesCount: number;
    lastActivity: Date | null;
  }> {
    try {
      await connectDatabase();
      
      const [totalSessions, activeSessions, deviceStats, lastActivity] = await Promise.all([
        UserSession.countDocuments({ userId }),
        UserSession.countDocuments({ userId, isActive: true }),
        UserSession.distinct('deviceId', { userId, isActive: true }),
        UserSession.findOne(
          { userId, isActive: true },
          {},
          { sort: { lastAccessAt: -1 } }
        )
      ]);

      return {
        totalSessions,
        activeSessions,
        devicesCount: deviceStats.length,
        lastActivity: lastActivity?.lastAccessAt || null
      };
    } catch (error) {
      console.error('Session statistics error:', error);
      return {
        totalSessions: 0,
        activeSessions: 0,
        devicesCount: 0,
        lastActivity: null
      };
    }
  }

  /**
   * デバイスフィンガープリント生成
   */
  static generateDeviceFingerprint(userAgent: string, ipAddress: string, additionalData: any = {}): string {
    const fingerprintData = {
      userAgent,
      ipAddress: this.anonymizeIP(ipAddress),
      screen: additionalData.screen,
      timezone: additionalData.timezone,
      language: additionalData.language,
      platform: additionalData.platform
    };

    const fingerprintString = JSON.stringify(fingerprintData);
    return crypto.createHash('sha256').update(fingerprintString).digest('hex');
  }

  /**
   * IPアドレス匿名化
   */
  private static anonymizeIP(ip: string): string {
    if (ip.includes('.')) {
      // IPv4
      const parts = ip.split('.');
      if (parts.length === 4) {
        parts[3] = '***';
        return parts.join('.');
      }
    } else if (ip.includes(':')) {
      // IPv6
      const parts = ip.split(':');
      if (parts.length > 4) {
        for (let i = 4; i < parts.length; i++) {
          parts[i] = '****';
        }
        return parts.join(':');
      }
    }
    return ip;
  }

  /**
   * トークンからペイロード抽出（検証なし）
   */
  static extractPayloadUnsafe(token: string): any {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      return payload;
    } catch {
      return null;
    }
  }

  /**
   * トークン残り有効時間取得
   */
  static getTokenTimeRemaining(token: string): number {
    const payload = this.extractPayloadUnsafe(token);
    if (!payload || !payload.exp) return 0;
    
    const now = Math.floor(Date.now() / 1000);
    return Math.max(0, payload.exp - now);
  }
}

// =================================================================
// エクスポート
// =================================================================

export default JWTService;