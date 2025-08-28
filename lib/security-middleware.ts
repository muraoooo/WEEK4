/**
 * セキュリティミドルウェア
 * Rate Limiting + IP制限 + ブルートフォース防御
 */

import { NextRequest, NextResponse } from 'next/server';
import { cacheAdvanced } from '@/lib/cache-advanced';

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (req: NextRequest) => string;
  onLimitReached?: (req: NextRequest) => void;
}

interface SecurityConfig {
  enableRateLimit: boolean;
  enableIPWhitelist: boolean;
  enableBruteForceProtection: boolean;
  enableGeoBlocking: boolean;
  suspiciousPatterns: string[];
  trustedIPs: string[];
  blockedIPs: string[];
  blockedCountries: string[];
}

interface SecurityEvent {
  ip: string;
  userAgent: string;
  endpoint: string;
  timestamp: Date;
  eventType: 'RATE_LIMIT_EXCEEDED' | 'BLOCKED_IP' | 'BRUTE_FORCE' | 'SUSPICIOUS_PATTERN' | 'GEO_BLOCKED';
  metadata?: any;
}

class SecurityMiddleware {
  private config: SecurityConfig;
  private securityEvents: SecurityEvent[] = [];

  constructor() {
    this.config = {
      enableRateLimit: true,
      enableIPWhitelist: false,
      enableBruteForceProtection: true,
      enableGeoBlocking: false,
      suspiciousPatterns: [
        'admin',
        'wp-admin',
        'phpmyadmin',
        '.env',
        'config',
        'backup',
        'dump',
        'sql',
        'database'
      ],
      trustedIPs: [
        '127.0.0.1',
        '::1'
      ],
      blockedIPs: [],
      blockedCountries: ['CN', 'RU', 'KP'] // デフォルトでブロック
    };
  }

  /**
   * メインセキュリティチェック
   */
  async checkSecurity(request: NextRequest): Promise<{
    allowed: boolean;
    reason?: string;
    statusCode?: number;
    headers?: Record<string, string>;
  }> {
    const ip = this.getClientIP(request);
    const userAgent = request.headers.get('user-agent') || '';
    const path = request.nextUrl.pathname;
    const method = request.method;

    // 1. IP ホワイトリスト/ブラックリストチェック
    const ipCheck = await this.checkIP(ip);
    if (!ipCheck.allowed) {
      this.logSecurityEvent({
        ip,
        userAgent,
        endpoint: `${method} ${path}`,
        timestamp: new Date(),
        eventType: 'BLOCKED_IP',
        metadata: { reason: ipCheck.reason }
      });
      return ipCheck;
    }

    // 2. 地理的ブロック
    if (this.config.enableGeoBlocking) {
      const geoCheck = await this.checkGeolocation(ip);
      if (!geoCheck.allowed) {
        this.logSecurityEvent({
          ip,
          userAgent,
          endpoint: `${method} ${path}`,
          timestamp: new Date(),
          eventType: 'GEO_BLOCKED',
          metadata: { country: geoCheck.country }
        });
        return geoCheck;
      }
    }

    // 3. 不審なパターンチェック
    const patternCheck = this.checkSuspiciousPatterns(path);
    if (!patternCheck.allowed) {
      this.logSecurityEvent({
        ip,
        userAgent,
        endpoint: `${method} ${path}`,
        timestamp: new Date(),
        eventType: 'SUSPICIOUS_PATTERN',
        metadata: { pattern: patternCheck.pattern }
      });
      return patternCheck;
    }

    // 4. レート制限チェック
    if (this.config.enableRateLimit) {
      const rateLimitCheck = await this.checkRateLimit(request);
      if (!rateLimitCheck.allowed) {
        this.logSecurityEvent({
          ip,
          userAgent,
          endpoint: `${method} ${path}`,
          timestamp: new Date(),
          eventType: 'RATE_LIMIT_EXCEEDED',
          metadata: { limit: rateLimitCheck.limit, window: rateLimitCheck.window }
        });
        return rateLimitCheck;
      }
    }

    // 5. ブルートフォース攻撃防御
    if (this.config.enableBruteForceProtection) {
      const bruteForceCheck = await this.checkBruteForce(ip, path);
      if (!bruteForceCheck.allowed) {
        this.logSecurityEvent({
          ip,
          userAgent,
          endpoint: `${method} ${path}`,
          timestamp: new Date(),
          eventType: 'BRUTE_FORCE',
          metadata: { attempts: bruteForceCheck.attempts }
        });
        return bruteForceCheck;
      }
    }

    return { allowed: true };
  }

  /**
   * 適応的レート制限
   */
  async adaptiveRateLimit(request: NextRequest): Promise<{
    allowed: boolean;
    reason?: string;
    statusCode?: number;
    headers?: Record<string, string>;
    limit?: number;
    window?: number;
  }> {
    const ip = this.getClientIP(request);
    const path = request.nextUrl.pathname;
    const method = request.method;

    // エンドポイント別の設定
    const configs: Record<string, RateLimitConfig> = {
      '/api/auth/login': {
        windowMs: 15 * 60 * 1000, // 15分
        maxRequests: 5, // 5回まで
        skipSuccessfulRequests: true
      },
      '/api/auth/register': {
        windowMs: 60 * 60 * 1000, // 1時間
        maxRequests: 3, // 3回まで
        skipSuccessfulRequests: true
      },
      '/api/auth/forgot-password': {
        windowMs: 60 * 60 * 1000, // 1時間
        maxRequests: 2, // 2回まで
        skipSuccessfulRequests: false
      },
      '/api/posts': {
        windowMs: 60 * 1000, // 1分
        maxRequests: method === 'POST' ? 5 : 100 // POST: 5回, GET: 100回
      },
      '/api/reports': {
        windowMs: 60 * 60 * 1000, // 1時間
        maxRequests: 10 // 10回まで
      },
      'default': {
        windowMs: 60 * 1000, // 1分
        maxRequests: 100 // 100回まで
      }
    };

    const config = configs[path] || configs['default'];
    const key = `rate_limit:${ip}:${path}:${method}`;

    // ユーザーの信頼度によるレート調整
    const userTrust = await this.getUserTrustScore(ip);
    const adjustedMaxRequests = Math.floor(config.maxRequests * (1 + userTrust));

    try {
      const currentCount = await cacheAdvanced.get<number>(key) || 0;
      
      if (currentCount >= adjustedMaxRequests) {
        // レート制限超過時の追加ペナルティ
        const penaltyKey = `rate_limit_penalty:${ip}`;
        const penaltyCount = await cacheAdvanced.get<number>(penaltyKey) || 0;
        await cacheAdvanced.set(penaltyKey, penaltyCount + 1, 24 * 60 * 60 * 1000); // 24時間

        return {
          allowed: false,
          reason: 'Rate limit exceeded',
          statusCode: 429,
          headers: {
            'X-RateLimit-Limit': adjustedMaxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(Date.now() + config.windowMs).toISOString(),
            'Retry-After': Math.ceil(config.windowMs / 1000).toString()
          },
          limit: adjustedMaxRequests,
          window: config.windowMs
        };
      }

      // カウンターを増加
      await cacheAdvanced.set(key, currentCount + 1, config.windowMs);

      return {
        allowed: true,
        headers: {
          'X-RateLimit-Limit': adjustedMaxRequests.toString(),
          'X-RateLimit-Remaining': (adjustedMaxRequests - currentCount - 1).toString(),
          'X-RateLimit-Reset': new Date(Date.now() + config.windowMs).toISOString()
        }
      };

    } catch (error) {
      console.error('Rate limit check error:', error);
      return { allowed: true }; // エラー時はアクセス許可
    }
  }

  /**
   * IPアドレスチェック
   */
  private async checkIP(ip: string): Promise<{
    allowed: boolean;
    reason?: string;
    statusCode?: number;
  }> {
    // ブラックリストチェック
    if (this.config.blockedIPs.includes(ip)) {
      return {
        allowed: false,
        reason: 'IP address is blocked',
        statusCode: 403
      };
    }

    // ホワイトリストが有効で、IPが含まれていない場合
    if (this.config.enableIPWhitelist && !this.config.trustedIPs.includes(ip)) {
      return {
        allowed: false,
        reason: 'IP address not in whitelist',
        statusCode: 403
      };
    }

    // 動的ブラックリストチェック（過去の悪用履歴）
    const abuseHistory = await cacheAdvanced.get<number>(`abuse_score:${ip}`);
    if (abuseHistory && abuseHistory > 100) {
      return {
        allowed: false,
        reason: 'IP address has high abuse score',
        statusCode: 403
      };
    }

    return { allowed: true };
  }

  /**
   * 地理的位置チェック（簡易版）
   */
  private async checkGeolocation(ip: string): Promise<{
    allowed: boolean;
    reason?: string;
    statusCode?: number;
    country?: string;
  }> {
    try {
      // 実装では外部のGeoIPサービスを使用
      // ここでは簡易的な実装
      const cacheKey = `geo:${ip}`;
      let geoData = await cacheAdvanced.get<any>(cacheKey);

      if (!geoData) {
        // 実際の実装では GeoIP API を呼び出し
        // ここではダミーデータ
        geoData = { country: 'JP' };
        await cacheAdvanced.set(cacheKey, geoData, 24 * 60 * 60 * 1000); // 24時間
      }

      if (this.config.blockedCountries.includes(geoData.country)) {
        return {
          allowed: false,
          reason: `Access from ${geoData.country} is not allowed`,
          statusCode: 403,
          country: geoData.country
        };
      }

      return { allowed: true, country: geoData.country };

    } catch (error) {
      console.error('Geolocation check error:', error);
      return { allowed: true }; // エラー時はアクセス許可
    }
  }

  /**
   * 不審なパターンチェック
   */
  private checkSuspiciousPatterns(path: string): {
    allowed: boolean;
    reason?: string;
    statusCode?: number;
    pattern?: string;
  } {
    const suspiciousPattern = this.config.suspiciousPatterns.find(pattern =>
      path.toLowerCase().includes(pattern.toLowerCase())
    );

    if (suspiciousPattern) {
      return {
        allowed: false,
        reason: `Suspicious pattern detected: ${suspiciousPattern}`,
        statusCode: 403,
        pattern: suspiciousPattern
      };
    }

    return { allowed: true };
  }

  /**
   * レート制限チェック
   */
  private async checkRateLimit(request: NextRequest): Promise<{
    allowed: boolean;
    reason?: string;
    statusCode?: number;
    headers?: Record<string, string>;
    limit?: number;
    window?: number;
  }> {
    return await this.adaptiveRateLimit(request);
  }

  /**
   * ブルートフォース攻撃防御
   */
  private async checkBruteForce(ip: string, path: string): Promise<{
    allowed: boolean;
    reason?: string;
    statusCode?: number;
    attempts?: number;
  }> {
    // ログインエンドポイントのみチェック
    if (!path.includes('/auth/login')) {
      return { allowed: true };
    }

    const key = `brute_force:${ip}`;
    const attempts = await cacheAdvanced.get<number>(key) || 0;

    // 10回以上の失敗で1時間ブロック
    if (attempts >= 10) {
      return {
        allowed: false,
        reason: 'Too many failed login attempts',
        statusCode: 429,
        attempts
      };
    }

    return { allowed: true };
  }

  /**
   * ユーザー信頼度スコア計算
   */
  private async getUserTrustScore(ip: string): Promise<number> {
    try {
      const trustKey = `trust_score:${ip}`;
      const trustScore = await cacheAdvanced.get<number>(trustKey);
      
      if (trustScore !== null) {
        return Math.max(0, Math.min(1, trustScore)); // 0-1の範囲に正規化
      }

      // 新しいIPの場合は中立的なスコア
      const initialScore = 0.5;
      await cacheAdvanced.set(trustKey, initialScore, 7 * 24 * 60 * 60 * 1000); // 7日間
      
      return initialScore;

    } catch (error) {
      console.error('Trust score calculation error:', error);
      return 0.5; // デフォルトスコア
    }
  }

  /**
   * ブルートフォース試行を記録
   */
  async recordFailedLoginAttempt(ip: string): Promise<void> {
    try {
      const key = `brute_force:${ip}`;
      const attempts = await cacheAdvanced.get<number>(key) || 0;
      await cacheAdvanced.set(key, attempts + 1, 60 * 60 * 1000); // 1時間

      // 信頼度スコアを下げる
      const trustKey = `trust_score:${ip}`;
      const currentTrust = await cacheAdvanced.get<number>(trustKey) || 0.5;
      const newTrust = Math.max(0, currentTrust - 0.1);
      await cacheAdvanced.set(trustKey, newTrust, 7 * 24 * 60 * 60 * 1000);

    } catch (error) {
      console.error('Failed login attempt recording error:', error);
    }
  }

  /**
   * 成功ログインを記録
   */
  async recordSuccessfulLogin(ip: string): Promise<void> {
    try {
      // ブルートフォースカウンターをリセット
      await cacheAdvanced.delete(`brute_force:${ip}`);

      // 信頼度スコアを上げる
      const trustKey = `trust_score:${ip}`;
      const currentTrust = await cacheAdvanced.get<number>(trustKey) || 0.5;
      const newTrust = Math.min(1, currentTrust + 0.05);
      await cacheAdvanced.set(trustKey, newTrust, 7 * 24 * 60 * 60 * 1000);

    } catch (error) {
      console.error('Successful login recording error:', error);
    }
  }

  /**
   * クライアントIPアドレス取得
   */
  private getClientIP(request: NextRequest): string {
    // プロキシやロードバランサー経由の場合を考慮
    const xForwardedFor = request.headers.get('x-forwarded-for');
    if (xForwardedFor) {
      return xForwardedFor.split(',')[0].trim();
    }

    const xRealIP = request.headers.get('x-real-ip');
    if (xRealIP) {
      return xRealIP.trim();
    }

    return request.ip || '127.0.0.1';
  }

  /**
   * セキュリティイベントのログ記録
   */
  private logSecurityEvent(event: SecurityEvent): void {
    this.securityEvents.push(event);

    // ログサイズ制限
    if (this.securityEvents.length > 10000) {
      this.securityEvents = this.securityEvents.slice(-5000);
    }

    // 重要なイベントはコンソールに出力
    if (['BLOCKED_IP', 'BRUTE_FORCE', 'GEO_BLOCKED'].includes(event.eventType)) {
      console.warn(`🚨 Security Event: ${event.eventType} from ${event.ip} at ${event.endpoint}`);
    }
  }

  /**
   * セキュリティ統計の取得
   */
  getSecurityStats(): {
    totalEvents: number;
    eventsByType: Record<string, number>;
    topOffendingIPs: Array<{ ip: string; count: number; lastSeen: Date }>;
    recentEvents: SecurityEvent[];
    recommendations: string[];
  } {
    const recentEvents = this.securityEvents.slice(-1000);
    
    const eventsByType: Record<string, number> = {};
    const ipCounts: Record<string, { count: number; lastSeen: Date }> = {};

    recentEvents.forEach(event => {
      eventsByType[event.eventType] = (eventsByType[event.eventType] || 0) + 1;
      
      if (!ipCounts[event.ip]) {
        ipCounts[event.ip] = { count: 0, lastSeen: event.timestamp };
      }
      ipCounts[event.ip].count++;
      if (event.timestamp > ipCounts[event.ip].lastSeen) {
        ipCounts[event.ip].lastSeen = event.timestamp;
      }
    });

    const topOffendingIPs = Object.entries(ipCounts)
      .map(([ip, data]) => ({ ip, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const recommendations = [];
    if (eventsByType['RATE_LIMIT_EXCEEDED'] > 100) {
      recommendations.push('Consider tightening rate limits');
    }
    if (eventsByType['BRUTE_FORCE'] > 50) {
      recommendations.push('Implement CAPTCHA for login attempts');
    }
    if (topOffendingIPs.length > 0) {
      recommendations.push(`Consider blocking IPs: ${topOffendingIPs.slice(0, 3).map(ip => ip.ip).join(', ')}`);
    }

    return {
      totalEvents: this.securityEvents.length,
      eventsByType,
      topOffendingIPs,
      recentEvents: recentEvents.slice(-50),
      recommendations
    };
  }

  /**
   * 設定の更新
   */
  updateConfig(newConfig: Partial<SecurityConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('Security configuration updated:', newConfig);
  }
}

// シングルトンインスタンス
const securityMiddleware = new SecurityMiddleware();

export { securityMiddleware, SecurityMiddleware };
export type { SecurityConfig, SecurityEvent, RateLimitConfig };