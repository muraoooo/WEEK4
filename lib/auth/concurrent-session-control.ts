/**
 * 同時ログイン制御サービス
 * ユーザーの同時セッション数制限、デバイス管理、強制ログアウト
 */

import { connectDatabase } from '@/lib/database';
import UserSession from '@/models/UserSession';
import { JWTService } from './jwt-service';

// =================================================================
// 型定義
// =================================================================

export interface ConcurrentSessionConfig {
  maxSessionsPerUser: number;
  maxSessionsPerDevice: number;
  maxSessionsGlobal?: number;
  sessionTimeout: number; // ミリ秒
  cleanupInterval: number; // ミリ秒
  allowDuplicateDevice: boolean;
  enforceUniqueDevice: boolean;
}

export interface SessionInfo {
  sessionId: string;
  userId: string;
  deviceId: string;
  ipAddress: string;
  userAgent: string;
  createdAt: Date;
  lastAccessAt: Date;
  isActive: boolean;
  location?: {
    country?: string;
    city?: string;
    region?: string;
  };
}

export interface SessionLimitResult {
  allowed: boolean;
  reason?: 'user_limit_exceeded' | 'device_limit_exceeded' | 'global_limit_exceeded' | 'duplicate_device_blocked';
  currentSessions: number;
  maxAllowed: number;
  oldestSession?: SessionInfo;
  recommendedAction: 'allow' | 'replace_oldest' | 'deny';
}

export interface SessionStats {
  totalActiveSessions: number;
  userSessionCounts: { userId: string; sessionCount: number; }[];
  deviceSessionCounts: { deviceId: string; sessionCount: number; }[];
  topActiveUsers: { userId: string; sessionCount: number; lastActivity: Date; }[];
  suspiciousActivity: {
    multipleDeviceUsers: number;
    highSessionCountUsers: number;
    staleSessionsCount: number;
  };
}

// =================================================================
// 設定
// =================================================================

const DEFAULT_CONFIG: ConcurrentSessionConfig = {
  maxSessionsPerUser: 3,      // ユーザーあたり最大3セッション
  maxSessionsPerDevice: 1,    // デバイスあたり最大1セッション
  maxSessionsGlobal: 1000,    // システム全体で最大1000セッション
  sessionTimeout: 30 * 60 * 1000, // 30分タイムアウト
  cleanupInterval: 5 * 60 * 1000,  // 5分毎クリーンアップ
  allowDuplicateDevice: false,     // 同一デバイスでの重複ログインを許可しない
  enforceUniqueDevice: true        // デバイスの一意性を強制
};

// =================================================================
// 同時セッション制御クラス
// =================================================================

export class ConcurrentSessionControl {
  private static config: ConcurrentSessionConfig = DEFAULT_CONFIG;
  private static cleanupTimer: NodeJS.Timeout | null = null;

  /**
   * 設定を更新
   */
  static configure(config: Partial<ConcurrentSessionConfig>): void {
    this.config = { ...this.config, ...config };
    
    // クリーンアップタイマーを再設定
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    this.startCleanupTimer();
  }

  /**
   * 新しいセッション作成可能かチェック
   */
  static async checkSessionLimit(
    userId: string,
    deviceId: string,
    ipAddress: string,
    userAgent: string
  ): Promise<SessionLimitResult> {
    try {
      await connectDatabase();

      // 現在のアクティブセッション取得
      const [userSessions, deviceSessions, globalSessions] = await Promise.all([
        UserSession.find({ userId, isActive: true }).sort({ lastAccessAt: -1 }),
        UserSession.find({ deviceId, isActive: true }).sort({ lastAccessAt: -1 }),
        UserSession.countDocuments({ isActive: true })
      ]);

      // グローバル制限チェック
      if (this.config.maxSessionsGlobal && globalSessions >= this.config.maxSessionsGlobal) {
        return {
          allowed: false,
          reason: 'global_limit_exceeded',
          currentSessions: globalSessions,
          maxAllowed: this.config.maxSessionsGlobal,
          recommendedAction: 'deny'
        };
      }

      // 同一デバイスでの重複チェック
      if (!this.config.allowDuplicateDevice && deviceSessions.length > 0) {
        // 同じユーザーの場合は既存セッションを置き換え
        const existingUserSession = deviceSessions.find(session => session.userId === userId);
        if (existingUserSession) {
          return {
            allowed: true,
            currentSessions: userSessions.length,
            maxAllowed: this.config.maxSessionsPerUser,
            oldestSession: this.sessionToInfo(existingUserSession),
            recommendedAction: 'replace_oldest'
          };
        }

        // 異なるユーザーの場合はブロック
        return {
          allowed: false,
          reason: 'duplicate_device_blocked',
          currentSessions: deviceSessions.length,
          maxAllowed: this.config.maxSessionsPerDevice,
          recommendedAction: 'deny'
        };
      }

      // ユーザー別セッション制限チェック
      if (userSessions.length >= this.config.maxSessionsPerUser) {
        const oldestSession = userSessions[userSessions.length - 1];
        
        return {
          allowed: true, // 古いセッションを削除して新しいセッションを作成
          reason: 'user_limit_exceeded',
          currentSessions: userSessions.length,
          maxAllowed: this.config.maxSessionsPerUser,
          oldestSession: this.sessionToInfo(oldestSession),
          recommendedAction: 'replace_oldest'
        };
      }

      // デバイス別セッション制限チェック
      if (deviceSessions.length >= this.config.maxSessionsPerDevice) {
        const oldestSession = deviceSessions[deviceSessions.length - 1];
        
        return {
          allowed: false,
          reason: 'device_limit_exceeded',
          currentSessions: deviceSessions.length,
          maxAllowed: this.config.maxSessionsPerDevice,
          oldestSession: this.sessionToInfo(oldestSession),
          recommendedAction: 'deny'
        };
      }

      return {
        allowed: true,
        currentSessions: userSessions.length,
        maxAllowed: this.config.maxSessionsPerUser,
        recommendedAction: 'allow'
      };

    } catch (error) {
      console.error('Session limit check error:', error);
      
      return {
        allowed: false,
        reason: 'global_limit_exceeded',
        currentSessions: 0,
        maxAllowed: 0,
        recommendedAction: 'deny'
      };
    }
  }

  /**
   * 新しいセッション作成
   */
  static async createSession(
    userId: string,
    sessionId: string,
    deviceId: string,
    ipAddress: string,
    userAgent: string,
    additionalData: any = {}
  ): Promise<{ success: boolean; replacedSession?: string; }> {
    try {
      await connectDatabase();

      // セッション制限チェック
      const limitCheck = await this.checkSessionLimit(userId, deviceId, ipAddress, userAgent);

      if (!limitCheck.allowed && limitCheck.recommendedAction === 'deny') {
        return { success: false };
      }

      // 古いセッションを削除（必要に応じて）
      let replacedSession: string | undefined;

      if (limitCheck.recommendedAction === 'replace_oldest' && limitCheck.oldestSession) {
        await this.terminateSession(limitCheck.oldestSession.sessionId, 'replaced_by_new_session');
        replacedSession = limitCheck.oldestSession.sessionId;
      }

      // 新しいセッションを作成
      const sessionData = {
        userId,
        sessionId,
        deviceId,
        ipAddress,
        userAgent,
        createdAt: new Date(),
        lastAccessAt: new Date(),
        isActive: true,
        ...additionalData
      };

      await UserSession.create(sessionData);

      return { success: true, replacedSession };

    } catch (error) {
      console.error('Create session error:', error);
      return { success: false };
    }
  }

  /**
   * セッション終了
   */
  static async terminateSession(
    sessionId: string,
    reason: string = 'manual_logout'
  ): Promise<boolean> {
    try {
      await connectDatabase();

      const session = await UserSession.findOne({ sessionId, isActive: true });
      
      if (!session) {
        return false;
      }

      // セッションを無効化
      session.isActive = false;
      session.endedAt = new Date();
      session.endReason = reason;
      await session.save();

      // 関連するトークンをブラックリストに追加
      // 注: この実装はJWTServiceがセッションIDベースでトークンを管理している前提
      await this.blacklistSessionTokens(sessionId);

      return true;

    } catch (error) {
      console.error('Terminate session error:', error);
      return false;
    }
  }

  /**
   * ユーザーの全セッションを終了
   */
  static async terminateAllUserSessions(
    userId: string,
    excludeSessionId?: string,
    reason: string = 'security_logout'
  ): Promise<number> {
    try {
      await connectDatabase();

      const query: any = { userId, isActive: true };
      if (excludeSessionId) {
        query.sessionId = { $ne: excludeSessionId };
      }

      const sessions = await UserSession.find(query);

      for (const session of sessions) {
        await this.terminateSession(session.sessionId, reason);
      }

      return sessions.length;

    } catch (error) {
      console.error('Terminate all user sessions error:', error);
      return 0;
    }
  }

  /**
   * デバイスの全セッションを終了
   */
  static async terminateDeviceSessions(
    deviceId: string,
    reason: string = 'device_security'
  ): Promise<number> {
    try {
      await connectDatabase();

      const sessions = await UserSession.find({ deviceId, isActive: true });

      for (const session of sessions) {
        await this.terminateSession(session.sessionId, reason);
      }

      return sessions.length;

    } catch (error) {
      console.error('Terminate device sessions error:', error);
      return 0;
    }
  }

  /**
   * セッション更新
   */
  static async updateSessionActivity(
    sessionId: string,
    ipAddress?: string,
    additionalData: any = {}
  ): Promise<boolean> {
    try {
      await connectDatabase();

      const updateData: any = {
        lastAccessAt: new Date(),
        ...additionalData
      };

      if (ipAddress) {
        updateData.ipAddress = ipAddress;
      }

      const result = await UserSession.updateOne(
        { sessionId, isActive: true },
        { $set: updateData }
      );

      return result.modifiedCount > 0;

    } catch (error) {
      console.error('Update session activity error:', error);
      return false;
    }
  }

  /**
   * アクティブセッション一覧取得
   */
  static async getActiveSessions(userId: string): Promise<SessionInfo[]> {
    try {
      await connectDatabase();

      const sessions = await UserSession.find({
        userId,
        isActive: true
      }).sort({ lastAccessAt: -1 });

      return sessions.map(session => this.sessionToInfo(session));

    } catch (error) {
      console.error('Get active sessions error:', error);
      return [];
    }
  }

  /**
   * セッション統計取得
   */
  static async getSessionStatistics(): Promise<SessionStats> {
    try {
      await connectDatabase();

      const [
        totalActiveSessions,
        userSessionCounts,
        deviceSessionCounts,
        topActiveUsers,
        multipleDeviceUsers,
        highSessionCountUsers,
        staleSessions
      ] = await Promise.all([
        UserSession.countDocuments({ isActive: true }),
        
        UserSession.aggregate([
          { $match: { isActive: true } },
          { $group: { _id: '$userId', sessionCount: { $sum: 1 } } },
          { $project: { userId: '$_id', sessionCount: 1, _id: 0 } },
          { $sort: { sessionCount: -1 } }
        ]),
        
        UserSession.aggregate([
          { $match: { isActive: true } },
          { $group: { _id: '$deviceId', sessionCount: { $sum: 1 } } },
          { $project: { deviceId: '$_id', sessionCount: 1, _id: 0 } },
          { $sort: { sessionCount: -1 } }
        ]),
        
        UserSession.aggregate([
          { $match: { isActive: true } },
          {
            $group: {
              _id: '$userId',
              sessionCount: { $sum: 1 },
              lastActivity: { $max: '$lastAccessAt' }
            }
          },
          { $sort: { sessionCount: -1 } },
          { $limit: 10 },
          {
            $project: {
              userId: '$_id',
              sessionCount: 1,
              lastActivity: 1,
              _id: 0
            }
          }
        ]),
        
        UserSession.aggregate([
          { $match: { isActive: true } },
          { $group: { _id: '$userId', devices: { $addToSet: '$deviceId' } } },
          { $match: { 'devices.1': { $exists: true } } },
          { $count: 'count' }
        ]).then(result => result[0]?.count || 0),
        
        UserSession.aggregate([
          { $match: { isActive: true } },
          { $group: { _id: '$userId', sessionCount: { $sum: 1 } } },
          { $match: { sessionCount: { $gte: this.config.maxSessionsPerUser } } },
          { $count: 'count' }
        ]).then(result => result[0]?.count || 0),
        
        UserSession.countDocuments({
          isActive: true,
          lastAccessAt: {
            $lt: new Date(Date.now() - this.config.sessionTimeout)
          }
        })
      ]);

      return {
        totalActiveSessions,
        userSessionCounts,
        deviceSessionCounts,
        topActiveUsers,
        suspiciousActivity: {
          multipleDeviceUsers,
          highSessionCountUsers,
          staleSessionsCount: staleSessions
        }
      };

    } catch (error) {
      console.error('Get session statistics error:', error);
      return {
        totalActiveSessions: 0,
        userSessionCounts: [],
        deviceSessionCounts: [],
        topActiveUsers: [],
        suspiciousActivity: {
          multipleDeviceUsers: 0,
          highSessionCountUsers: 0,
          staleSessionsCount: 0
        }
      };
    }
  }

  /**
   * 期限切れセッションのクリーンアップ
   */
  static async cleanupExpiredSessions(): Promise<number> {
    try {
      await connectDatabase();

      const expiredTime = new Date(Date.now() - this.config.sessionTimeout);
      
      const expiredSessions = await UserSession.find({
        isActive: true,
        lastAccessAt: { $lt: expiredTime }
      });

      let cleanedCount = 0;

      for (const session of expiredSessions) {
        await this.terminateSession(session.sessionId, 'timeout');
        cleanedCount++;
      }

      return cleanedCount;

    } catch (error) {
      console.error('Cleanup expired sessions error:', error);
      return 0;
    }
  }

  /**
   * セッションの強制終了（管理者用）
   */
  static async forceTerminateSession(
    sessionId: string,
    adminUserId: string,
    reason: string = 'admin_action'
  ): Promise<boolean> {
    try {
      const success = await this.terminateSession(sessionId, reason);
      
      if (success) {
        console.log(`Session ${sessionId} forcibly terminated by admin ${adminUserId}: ${reason}`);
      }

      return success;

    } catch (error) {
      console.error('Force terminate session error:', error);
      return false;
    }
  }

  /**
   * セッション情報変換
   */
  private static sessionToInfo(session: any): SessionInfo {
    return {
      sessionId: session.sessionId,
      userId: session.userId,
      deviceId: session.deviceId,
      ipAddress: session.ipAddress,
      userAgent: session.userAgent,
      createdAt: session.createdAt,
      lastAccessAt: session.lastAccessAt,
      isActive: session.isActive,
      location: session.location
    };
  }

  /**
   * セッション関連トークンをブラックリスト追加
   */
  private static async blacklistSessionTokens(sessionId: string): Promise<void> {
    try {
      // JWTServiceを使用してセッション関連のトークンをブラックリストに追加
      // 実装はJWTServiceの設計に依存
      // 例: await JWTService.blacklistSessionTokens(sessionId);
      
    } catch (error) {
      console.error('Blacklist session tokens error:', error);
    }
  }

  /**
   * クリーンアップタイマー開始
   */
  private static startCleanupTimer(): void {
    this.cleanupTimer = setInterval(async () => {
      const cleanedCount = await this.cleanupExpiredSessions();
      if (cleanedCount > 0) {
        console.log(`Cleaned up ${cleanedCount} expired sessions`);
      }
    }, this.config.cleanupInterval);
  }

  /**
   * サービス停止
   */
  static stop(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }
}

// =================================================================
// 初期化
// =================================================================

// サービス開始時にクリーンアップタイマーを開始（サーバーサイドのみ）
if (typeof process !== 'undefined' && typeof window === 'undefined') {
  ConcurrentSessionControl.configure({});
  
  // プロセス終了時にクリーンアップ
  process.on('SIGINT', () => {
    ConcurrentSessionControl.stop();
  });
  
  process.on('SIGTERM', () => {
    ConcurrentSessionControl.stop();
  });
}

// =================================================================
// エクスポート
// =================================================================

export default ConcurrentSessionControl;