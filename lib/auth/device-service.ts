/**
 * デバイスフィンガープリント・デバイス管理サービス
 * デバイス識別、セキュリティ監視、異常検知
 */

import crypto from 'crypto';
import { connectDatabase } from '@/lib/database';
import UserSession from '@/models/UserSession';

// =================================================================
// 型定義
// =================================================================

export interface DeviceInfo {
  userAgent: string;
  ipAddress: string;
  screen?: {
    width: number;
    height: number;
    colorDepth: number;
    pixelRatio: number;
  };
  timezone?: string;
  language?: string;
  platform?: string;
  cookiesEnabled?: boolean;
  doNotTrack?: boolean;
  onlineStatus?: boolean;
  hardwareConcurrency?: number;
  maxTouchPoints?: number;
}

export interface DeviceFingerprint {
  id: string;
  hash: string;
  confidence: number; // 0-100の信頼度スコア
  riskScore: number;  // 0-100のリスクスコア
  components: {
    userAgent: string;
    ipAddressHash: string;
    screen?: string;
    timezone?: string;
    language?: string;
    platform?: string;
  };
  metadata: {
    createdAt: Date;
    lastSeenAt: Date;
    sessionCount: number;
    isBlocked: boolean;
    blockReason?: string;
  };
}

export interface DeviceValidationResult {
  valid: boolean;
  fingerprint: DeviceFingerprint;
  isNewDevice: boolean;
  riskFactors: string[];
  recommendation: 'allow' | 'challenge' | 'block';
}

export interface DeviceStats {
  totalDevices: number;
  activeDevices: number;
  blockedDevices: number;
  riskDistribution: {
    low: number;    // 0-30
    medium: number; // 31-70
    high: number;   // 71-100
  };
  recentActivity: {
    newDevices24h: number;
    suspiciousActivity24h: number;
  };
}

// =================================================================
// 設定
// =================================================================

const DEVICE_CONFIG = {
  FINGERPRINT_ALGORITHM: 'sha256',
  RISK_THRESHOLDS: {
    LOW: 30,
    MEDIUM: 70,
    HIGH: 90
  },
  SESSION_TIMEOUT: 30 * 24 * 60 * 60 * 1000, // 30日
  SUSPICIOUS_IP_CHANGE_THRESHOLD: 5, // 5回以上IP変更で疑わしい
  MIN_CONFIDENCE_SCORE: 60
};

// =================================================================
// デバイスサービスクラス
// =================================================================

export class DeviceService {
  /**
   * デバイスフィンガープリント生成
   */
  static generateFingerprint(deviceInfo: DeviceInfo): DeviceFingerprint {
    const components = {
      userAgent: deviceInfo.userAgent,
      ipAddressHash: this.hashIPAddress(deviceInfo.ipAddress),
      screen: deviceInfo.screen ? 
        `${deviceInfo.screen.width}x${deviceInfo.screen.height}_${deviceInfo.screen.colorDepth}_${deviceInfo.screen.pixelRatio}` : 
        undefined,
      timezone: deviceInfo.timezone,
      language: deviceInfo.language,
      platform: deviceInfo.platform
    };

    // フィンガープリント生成
    const fingerprintData = JSON.stringify(components);
    const hash = crypto.createHash(DEVICE_CONFIG.FINGERPRINT_ALGORITHM)
      .update(fingerprintData)
      .digest('hex');

    // 短縮ID生成（最初の16文字）
    const id = hash.substring(0, 16);

    // 信頼度計算
    const confidence = this.calculateConfidence(deviceInfo);

    // リスクスコア計算
    const riskScore = this.calculateRiskScore(deviceInfo, components);

    return {
      id,
      hash,
      confidence,
      riskScore,
      components,
      metadata: {
        createdAt: new Date(),
        lastSeenAt: new Date(),
        sessionCount: 1,
        isBlocked: false
      }
    };
  }

  /**
   * IPアドレスのハッシュ化（プライバシー保護）
   */
  private static hashIPAddress(ipAddress: string): string {
    // IPv4の場合、最後のオクテットをマスク
    if (ipAddress.includes('.')) {
      const parts = ipAddress.split('.');
      if (parts.length === 4) {
        parts[3] = 'xxx';
        return crypto.createHash('sha256')
          .update(parts.join('.'))
          .digest('hex')
          .substring(0, 16);
      }
    }
    
    // IPv6の場合、後半をマスク
    if (ipAddress.includes(':')) {
      const parts = ipAddress.split(':');
      if (parts.length > 4) {
        for (let i = 4; i < parts.length; i++) {
          parts[i] = 'xxxx';
        }
        return crypto.createHash('sha256')
          .update(parts.join(':'))
          .digest('hex')
          .substring(0, 16);
      }
    }

    // その他の場合はそのままハッシュ化
    return crypto.createHash('sha256')
      .update(ipAddress)
      .digest('hex')
      .substring(0, 16);
  }

  /**
   * 信頼度スコア計算
   */
  private static calculateConfidence(deviceInfo: DeviceInfo): number {
    let confidence = 0;

    // User-Agent存在 (+20)
    if (deviceInfo.userAgent && deviceInfo.userAgent.length > 50) {
      confidence += 20;
    }

    // スクリーン情報存在 (+15)
    if (deviceInfo.screen?.width && deviceInfo.screen?.height) {
      confidence += 15;
    }

    // タイムゾーン情報存在 (+10)
    if (deviceInfo.timezone) {
      confidence += 10;
    }

    // 言語情報存在 (+10)
    if (deviceInfo.language) {
      confidence += 10;
    }

    // プラットフォーム情報存在 (+10)
    if (deviceInfo.platform) {
      confidence += 10;
    }

    // ハードウェア情報存在 (+15)
    if (deviceInfo.hardwareConcurrency || deviceInfo.maxTouchPoints) {
      confidence += 15;
    }

    // クッキー有効 (+10)
    if (deviceInfo.cookiesEnabled) {
      confidence += 10;
    }

    // オンライン状態 (+10)
    if (deviceInfo.onlineStatus) {
      confidence += 10;
    }

    return Math.min(confidence, 100);
  }

  /**
   * リスクスコア計算
   */
  private static calculateRiskScore(deviceInfo: DeviceInfo, components: any): number {
    let riskScore = 0;

    // User-Agent関連リスク
    if (!deviceInfo.userAgent || deviceInfo.userAgent.length < 20) {
      riskScore += 25; // 疑わしいUser-Agent
    }

    if (deviceInfo.userAgent && deviceInfo.userAgent.includes('bot')) {
      riskScore += 30; // ボットの可能性
    }

    // スクリーン情報関連リスク
    if (deviceInfo.screen) {
      const { width, height } = deviceInfo.screen;
      
      // 異常なスクリーンサイズ
      if (width < 800 || height < 600 || width > 4000 || height > 3000) {
        riskScore += 15;
      }
      
      // 一般的でない解像度
      const commonResolutions = [
        '1920x1080', '1366x768', '1280x720', '1440x900',
        '1600x900', '2560x1440', '3840x2160'
      ];
      
      if (!commonResolutions.includes(`${width}x${height}`)) {
        riskScore += 10;
      }
    }

    // プライバシー設定関連リスク
    if (deviceInfo.doNotTrack) {
      riskScore += 5; // DNTヘッダー設定（軽微なリスク）
    }

    if (!deviceInfo.cookiesEnabled) {
      riskScore += 20; // クッキー無効
    }

    // タイムゾーン関連リスク
    if (deviceInfo.timezone && !deviceInfo.timezone.startsWith('Asia/Tokyo')) {
      riskScore += 15; // 日本以外のタイムゾーン
    }

    // 言語関連リスク
    if (deviceInfo.language && !deviceInfo.language.startsWith('ja')) {
      riskScore += 10; // 日本語以外
    }

    return Math.min(riskScore, 100);
  }

  /**
   * デバイス検証
   */
  static async validateDevice(
    deviceInfo: DeviceInfo,
    userId: string
  ): Promise<DeviceValidationResult> {
    const fingerprint = this.generateFingerprint(deviceInfo);
    const riskFactors: string[] = [];
    let isNewDevice = false;

    try {
      await connectDatabase();

      // 既存のデバイスを検索
      const existingDevice = await UserSession.findOne({
        userId,
        deviceId: fingerprint.id,
        isActive: true
      });

      if (!existingDevice) {
        isNewDevice = true;
        riskFactors.push('新しいデバイス');
      } else {
        // デバイス情報を更新
        fingerprint.metadata.sessionCount = existingDevice.sessionCount + 1;
        fingerprint.metadata.createdAt = existingDevice.createdAt;
      }

      // リスク要因の評価
      if (fingerprint.riskScore > DEVICE_CONFIG.RISK_THRESHOLDS.HIGH) {
        riskFactors.push('高リスクデバイス');
      }

      if (fingerprint.confidence < DEVICE_CONFIG.MIN_CONFIDENCE_SCORE) {
        riskFactors.push('信頼度不足');
      }

      // 同一ユーザーの他のデバイスとの比較
      const userDevices = await UserSession.find({
        userId,
        isActive: true
      }).sort({ lastAccessAt: -1 });

      if (userDevices.length > 5) {
        riskFactors.push('多数のデバイス');
      }

      // IP変更頻度チェック
      const recentSessions = userDevices.slice(0, 10);
      const uniqueIPs = new Set(recentSessions.map(session => session.ipAddress));
      
      if (uniqueIPs.size > DEVICE_CONFIG.SUSPICIOUS_IP_CHANGE_THRESHOLD) {
        riskFactors.push('頻繁なIP変更');
        fingerprint.riskScore += 20;
      }

      // 推奨アクション決定
      let recommendation: 'allow' | 'challenge' | 'block';
      
      if (fingerprint.metadata.isBlocked) {
        recommendation = 'block';
      } else if (fingerprint.riskScore > DEVICE_CONFIG.RISK_THRESHOLDS.HIGH || riskFactors.length >= 3) {
        recommendation = 'block';
      } else if (fingerprint.riskScore > DEVICE_CONFIG.RISK_THRESHOLDS.MEDIUM || isNewDevice) {
        recommendation = 'challenge';
      } else {
        recommendation = 'allow';
      }

      return {
        valid: recommendation !== 'block',
        fingerprint,
        isNewDevice,
        riskFactors,
        recommendation
      };

    } catch (error) {
      console.error('Device validation error:', error);
      
      return {
        valid: false,
        fingerprint,
        isNewDevice: true,
        riskFactors: ['検証エラー'],
        recommendation: 'block'
      };
    }
  }

  /**
   * デバイス情報を保存/更新
   */
  static async saveDeviceInfo(
    userId: string,
    sessionId: string,
    deviceInfo: DeviceInfo,
    fingerprint: DeviceFingerprint
  ): Promise<void> {
    try {
      await connectDatabase();

      const sessionData = {
        userId,
        sessionId,
        deviceId: fingerprint.id,
        ipAddress: deviceInfo.ipAddress,
        userAgent: deviceInfo.userAgent,
        deviceFingerprint: fingerprint.hash,
        deviceInfo: {
          screen: deviceInfo.screen,
          timezone: deviceInfo.timezone,
          language: deviceInfo.language,
          platform: deviceInfo.platform
        },
        riskScore: fingerprint.riskScore,
        confidence: fingerprint.confidence,
        lastAccessAt: new Date(),
        isActive: true
      };

      await UserSession.findOneAndUpdate(
        { sessionId, userId },
        sessionData,
        { upsert: true, new: true }
      );

    } catch (error) {
      console.error('Device save error:', error);
      throw error;
    }
  }

  /**
   * デバイスをブロック
   */
  static async blockDevice(
    deviceId: string,
    reason: string,
    userId?: string
  ): Promise<void> {
    try {
      await connectDatabase();

      const query: any = { deviceId };
      if (userId) query.userId = userId;

      await UserSession.updateMany(
        query,
        {
          $set: {
            isBlocked: true,
            blockReason: reason,
            blockedAt: new Date()
          }
        }
      );

    } catch (error) {
      console.error('Device block error:', error);
      throw error;
    }
  }

  /**
   * デバイスのブロック解除
   */
  static async unblockDevice(deviceId: string, userId?: string): Promise<void> {
    try {
      await connectDatabase();

      const query: any = { deviceId };
      if (userId) query.userId = userId;

      await UserSession.updateMany(
        query,
        {
          $unset: {
            isBlocked: 1,
            blockReason: 1,
            blockedAt: 1
          }
        }
      );

    } catch (error) {
      console.error('Device unblock error:', error);
      throw error;
    }
  }

  /**
   * ユーザーのデバイス一覧取得
   */
  static async getUserDevices(userId: string): Promise<any[]> {
    try {
      await connectDatabase();

      const devices = await UserSession.aggregate([
        {
          $match: {
            userId,
            isActive: true
          }
        },
        {
          $group: {
            _id: '$deviceId',
            lastAccessAt: { $max: '$lastAccessAt' },
            sessionCount: { $sum: 1 },
            ipAddresses: { $addToSet: '$ipAddress' },
            userAgent: { $first: '$userAgent' },
            deviceInfo: { $first: '$deviceInfo' },
            riskScore: { $avg: '$riskScore' },
            confidence: { $avg: '$confidence' },
            isBlocked: { $first: '$isBlocked' },
            blockReason: { $first: '$blockReason' }
          }
        },
        {
          $sort: { lastAccessAt: -1 }
        }
      ]);

      return devices;

    } catch (error) {
      console.error('Get user devices error:', error);
      return [];
    }
  }

  /**
   * デバイス統計取得
   */
  static async getDeviceStatistics(): Promise<DeviceStats> {
    try {
      await connectDatabase();

      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const [
        totalDevices,
        activeDevices,
        blockedDevices,
        riskDistribution,
        newDevices24h,
        suspiciousActivity24h
      ] = await Promise.all([
        UserSession.distinct('deviceId').then(devices => devices.length),
        
        UserSession.distinct('deviceId', { isActive: true }).then(devices => devices.length),
        
        UserSession.distinct('deviceId', { isBlocked: true }).then(devices => devices.length),
        
        UserSession.aggregate([
          { $match: { isActive: true } },
          {
            $group: {
              _id: {
                $switch: {
                  branches: [
                    { case: { $lte: ['$riskScore', 30] }, then: 'low' },
                    { case: { $lte: ['$riskScore', 70] }, then: 'medium' }
                  ],
                  default: 'high'
                }
              },
              count: { $sum: 1 }
            }
          }
        ]),
        
        UserSession.distinct('deviceId', {
          createdAt: { $gte: yesterday }
        }).then(devices => devices.length),
        
        UserSession.countDocuments({
          riskScore: { $gte: DEVICE_CONFIG.RISK_THRESHOLDS.HIGH },
          lastAccessAt: { $gte: yesterday }
        })
      ]);

      const riskDist = {
        low: 0,
        medium: 0,
        high: 0
      };

      riskDistribution.forEach((item: any) => {
        riskDist[item._id as keyof typeof riskDist] = item.count;
      });

      return {
        totalDevices,
        activeDevices,
        blockedDevices,
        riskDistribution: riskDist,
        recentActivity: {
          newDevices24h,
          suspiciousActivity24h
        }
      };

    } catch (error) {
      console.error('Device statistics error:', error);
      return {
        totalDevices: 0,
        activeDevices: 0,
        blockedDevices: 0,
        riskDistribution: { low: 0, medium: 0, high: 0 },
        recentActivity: {
          newDevices24h: 0,
          suspiciousActivity24h: 0
        }
      };
    }
  }

  /**
   * 異常デバイス検出
   */
  static async detectAnomalousDevices(timeWindow: number = 24 * 60 * 60 * 1000): Promise<any[]> {
    try {
      await connectDatabase();

      const startTime = new Date(Date.now() - timeWindow);

      const anomalousDevices = await UserSession.aggregate([
        {
          $match: {
            lastAccessAt: { $gte: startTime },
            $or: [
              { riskScore: { $gte: DEVICE_CONFIG.RISK_THRESHOLDS.HIGH } },
              { confidence: { $lte: DEVICE_CONFIG.MIN_CONFIDENCE_SCORE } }
            ]
          }
        },
        {
          $group: {
            _id: '$deviceId',
            sessions: {
              $push: {
                userId: '$userId',
                sessionId: '$sessionId',
                ipAddress: '$ipAddress',
                userAgent: '$userAgent',
                riskScore: '$riskScore',
                confidence: '$confidence',
                lastAccessAt: '$lastAccessAt'
              }
            },
            avgRiskScore: { $avg: '$riskScore' },
            avgConfidence: { $avg: '$confidence' },
            uniqueUsers: { $addToSet: '$userId' },
            uniqueIPs: { $addToSet: '$ipAddress' }
          }
        },
        {
          $match: {
            $or: [
              { avgRiskScore: { $gte: DEVICE_CONFIG.RISK_THRESHOLDS.HIGH } },
              { uniqueUsers: { $size: { $gt: 1 } } }, // 複数ユーザーで使用
              { uniqueIPs: { $size: { $gt: 5 } } }    // 頻繁なIP変更
            ]
          }
        },
        {
          $sort: { avgRiskScore: -1 }
        }
      ]);

      return anomalousDevices;

    } catch (error) {
      console.error('Anomalous device detection error:', error);
      return [];
    }
  }
}

// =================================================================
// エクスポート
// =================================================================

export default DeviceService;