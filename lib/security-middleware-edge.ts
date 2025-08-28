/**
 * Edge-compatible Security Middleware
 * シンプルなレート制限とセキュリティチェック（Edge Runtime対応）
 */

import type { NextRequest } from 'next/server';

interface SecurityCheckResult {
  allowed: boolean;
  reason?: string;
  statusCode?: number;
  headers?: Record<string, string>;
}

// メモリ内でレート制限を追跡（本番環境ではRedisやKVストアを使用）
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

class EdgeSecurityMiddleware {
  private readonly maxRequestsPerMinute = 60;
  private readonly windowMs = 60000; // 1分

  /**
   * クライアントIPを取得
   */
  private getClientIP(request: NextRequest): string {
    return request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
           request.headers.get('x-real-ip') ||
           request.ip ||
           '127.0.0.1';
  }

  /**
   * レート制限をチェック
   */
  private checkRateLimit(clientIP: string): boolean {
    const now = Date.now();
    const record = rateLimitMap.get(clientIP);

    if (!record || now > record.resetTime) {
      // 新しいウィンドウを開始
      rateLimitMap.set(clientIP, {
        count: 1,
        resetTime: now + this.windowMs
      });
      return true;
    }

    if (record.count >= this.maxRequestsPerMinute) {
      return false;
    }

    record.count++;
    return true;
  }

  /**
   * セキュリティチェックを実行
   */
  async checkSecurity(request: NextRequest): Promise<SecurityCheckResult> {
    const clientIP = this.getClientIP(request);
    const pathname = request.nextUrl.pathname;

    // 静的ファイルはスキップ
    if (pathname.startsWith('/_next/') || 
        pathname.startsWith('/static/') ||
        pathname.match(/\.(ico|png|jpg|jpeg|svg|gif|css|js)$/)) {
      return { allowed: true };
    }

    // レート制限チェック
    if (!this.checkRateLimit(clientIP)) {
      return {
        allowed: false,
        reason: 'Too many requests',
        statusCode: 429,
        headers: {
          'X-RateLimit-Limit': String(this.maxRequestsPerMinute),
          'X-RateLimit-Remaining': '0',
          'Retry-After': '60'
        }
      };
    }

    // 基本的なセキュリティヘッダー
    const headers = {
      'X-Request-IP': clientIP,
      'X-Security-Check': 'passed'
    };

    return {
      allowed: true,
      headers
    };
  }

  /**
   * 失敗したログイン試行を記録（Edge対応版）
   */
  async recordFailedLoginAttempt(clientIP: string): Promise<void> {
    // Edge環境では簡略化
    console.log(`Failed login attempt from ${clientIP}`);
  }

  /**
   * 成功したログインを記録（Edge対応版）
   */
  async recordSuccessfulLogin(clientIP: string): Promise<void> {
    // Edge環境では簡略化
    console.log(`Successful login from ${clientIP}`);
  }
}

export const securityMiddleware = new EdgeSecurityMiddleware();