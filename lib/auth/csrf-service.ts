/**
 * CSRF保護サービス
 * Double Submit Cookie、SameSite、Origin検証による包括的CSRF対策
 */

import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { CookieService } from './cookie-service';

// =================================================================
// 型定義
// =================================================================

export interface CSRFTokenConfig {
  tokenLength: number;
  algorithm: string;
  cookieName: string;
  headerName: string;
  maxAge: number; // 秒単位
}

export interface CSRFValidationResult {
  valid: boolean;
  token?: string;
  error?: 'missing_token' | 'invalid_token' | 'token_mismatch' | 'origin_mismatch' | 'method_not_allowed';
  details?: string;
}

export interface CSRFProtectionOptions {
  skipMethods?: string[];
  skipPaths?: string[];
  trustedOrigins?: string[];
  requireSecureContext?: boolean;
}

// =================================================================
// 設定
// =================================================================

const DEFAULT_CONFIG: CSRFTokenConfig = {
  tokenLength: 32,
  algorithm: 'sha256',
  cookieName: 'csrf_token',
  headerName: 'x-csrf-token',
  maxAge: 24 * 60 * 60 // 24時間
};

const DEFAULT_PROTECTION_OPTIONS: CSRFProtectionOptions = {
  skipMethods: ['GET', 'HEAD', 'OPTIONS'],
  skipPaths: ['/api/health', '/api/status'],
  trustedOrigins: [],
  requireSecureContext: true
};

// =================================================================
// CSRFサービスクラス
// =================================================================

export class CSRFService {
  private static config: CSRFTokenConfig = DEFAULT_CONFIG;
  private static protectionOptions: CSRFProtectionOptions = DEFAULT_PROTECTION_OPTIONS;

  /**
   * 設定を更新
   */
  static configure(config: Partial<CSRFTokenConfig>, options?: Partial<CSRFProtectionOptions>): void {
    this.config = { ...this.config, ...config };
    
    if (options) {
      this.protectionOptions = { ...this.protectionOptions, ...options };
    }
  }

  /**
   * CSRFトークン生成
   */
  static generateToken(): string {
    return crypto.randomBytes(this.config.tokenLength).toString('hex');
  }

  /**
   * トークンのハッシュ値生成
   */
  static hashToken(token: string): string {
    return crypto
      .createHash(this.config.algorithm)
      .update(token)
      .digest('hex');
  }

  /**
   * CSRFトークンをレスポンスに設定
   */
  static setCSRFToken(response: NextResponse): string {
    const token = this.generateToken();
    
    // クッキーに設定（HttpOnlyは無効、JavaScriptからアクセス可能）
    CookieService.setSecureCookie(response, this.config.cookieName, token, {
      maxAge: this.config.maxAge,
      httpOnly: false, // JavaScriptからアクセス可能
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production'
    });

    // メタタグ用にヘッダーにも設定
    response.headers.set('X-CSRF-Token', token);

    return token;
  }

  /**
   * CSRFトークン検証
   */
  static validateCSRFToken(request: NextRequest): CSRFValidationResult {
    const method = request.method.toUpperCase();
    const pathname = new URL(request.url).pathname;

    // スキップ対象のメソッド
    if (this.protectionOptions.skipMethods?.includes(method)) {
      return { valid: true };
    }

    // スキップ対象のパス
    if (this.protectionOptions.skipPaths?.some(path => pathname.startsWith(path))) {
      return { valid: true };
    }

    // Origin検証
    const originResult = this.validateOrigin(request);
    if (!originResult.valid) {
      return originResult;
    }

    // クッキーからCSRFトークンを取得
    const cookieResult = CookieService.getCookie(request, this.config.cookieName);
    if (!cookieResult.valid || !cookieResult.value) {
      return {
        valid: false,
        error: 'missing_token',
        details: 'CSRF token not found in cookies'
      };
    }

    // ヘッダーからCSRFトークンを取得
    const headerToken = request.headers.get(this.config.headerName) ||
                       request.headers.get('X-Requested-With'); // Fallback

    if (!headerToken) {
      return {
        valid: false,
        error: 'missing_token',
        details: 'CSRF token not found in headers'
      };
    }

    // トークン比較（Double Submit Cookie）
    if (cookieResult.value !== headerToken) {
      return {
        valid: false,
        error: 'token_mismatch',
        details: 'CSRF token mismatch between cookie and header'
      };
    }

    return {
      valid: true,
      token: cookieResult.value
    };
  }

  /**
   * Origin検証
   */
  private static validateOrigin(request: NextRequest): CSRFValidationResult {
    const origin = request.headers.get('origin');
    const referer = request.headers.get('referer');
    const host = request.headers.get('host');

    // 安全なコンテキストの要求
    if (this.protectionOptions.requireSecureContext && process.env.NODE_ENV === 'production') {
      const protocol = request.headers.get('x-forwarded-proto') || 
                      request.url.split('://')[0];
      
      if (protocol !== 'https') {
        return {
          valid: false,
          error: 'origin_mismatch',
          details: 'HTTPS required for CSRF protection'
        };
      }
    }

    // Originヘッダーの検証
    if (origin) {
      const originHost = new URL(origin).host;
      
      // 信頼できるオリジン
      const trustedOrigins = this.protectionOptions.trustedOrigins || [];
      const allowedHosts = [host, ...trustedOrigins];
      
      if (!allowedHosts.includes(originHost)) {
        return {
          valid: false,
          error: 'origin_mismatch',
          details: `Origin ${originHost} not in trusted origins`
        };
      }
    }

    // Refererヘッダーの検証（Originが無い場合）
    if (!origin && referer) {
      const refererHost = new URL(referer).host;
      
      if (refererHost !== host) {
        return {
          valid: false,
          error: 'origin_mismatch',
          details: `Referer ${refererHost} does not match host ${host}`
        };
      }
    }

    // Origin/Refererが両方無い場合（疑わしい）
    if (!origin && !referer) {
      return {
        valid: false,
        error: 'origin_mismatch',
        details: 'Missing Origin and Referer headers'
      };
    }

    return { valid: true };
  }

  /**
   * CSRF保護ミドルウェア
   */
  static middleware(
    request: NextRequest,
    options?: Partial<CSRFProtectionOptions>
  ): CSRFValidationResult {
    // オプションをマージ
    const mergedOptions = { ...this.protectionOptions, ...options };
    const originalOptions = this.protectionOptions;
    this.protectionOptions = mergedOptions;

    const result = this.validateCSRFToken(request);

    // 元の設定に戻す
    this.protectionOptions = originalOptions;

    return result;
  }

  /**
   * CSRF保護をバイパス（開発・テスト用）
   */
  static bypassProtection(request: NextRequest): boolean {
    // 開発環境での特別なヘッダー
    if (process.env.NODE_ENV === 'development') {
      const bypassHeader = request.headers.get('x-csrf-bypass');
      if (bypassHeader === 'development') {
        console.warn('CSRF protection bypassed for development');
        return true;
      }
    }

    // テスト環境での特別なヘッダー
    if (process.env.NODE_ENV === 'test') {
      const testHeader = request.headers.get('x-test-csrf-bypass');
      if (testHeader === 'true') {
        return true;
      }
    }

    return false;
  }

  /**
   * セキュアヘッダー設定
   */
  static setSecurityHeaders(response: NextResponse): NextResponse {
    // CSRF関連のセキュリティヘッダー
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    
    // SameSiteクッキーの強制
    const existingSetCookie = response.headers.get('Set-Cookie');
    if (existingSetCookie && !existingSetCookie.includes('SameSite')) {
      response.headers.set(
        'Set-Cookie',
        existingSetCookie + '; SameSite=Strict'
      );
    }

    return response;
  }

  /**
   * CSRFトークン取得（クライアントサイド用）
   */
  static getTokenFromMeta(): string | null {
    if (typeof document === 'undefined') return null;

    const metaTag = document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement;
    return metaTag?.content || null;
  }

  /**
   * CSRFトークン取得（クッキーから）
   */
  static getTokenFromCookie(): string | null {
    if (typeof document === 'undefined') return null;

    const cookies = document.cookie.split(';');
    const csrfCookie = cookies.find(cookie => 
      cookie.trim().startsWith(`${this.config.cookieName}=`)
    );

    if (csrfCookie) {
      return csrfCookie.split('=')[1];
    }

    return null;
  }

  /**
   * Ajax リクエスト用ヘッダー設定
   */
  static getAjaxHeaders(): Record<string, string> {
    const token = this.getTokenFromMeta() || this.getTokenFromCookie();
    
    const headers: Record<string, string> = {
      'X-Requested-With': 'XMLHttpRequest',
      'Content-Type': 'application/json'
    };

    if (token) {
      headers[this.config.headerName] = token;
    }

    return headers;
  }

  /**
   * フェッチリクエスト用設定
   */
  static getFetchConfig(): RequestInit {
    return {
      headers: this.getAjaxHeaders(),
      credentials: 'same-origin' // クッキーを含める
    };
  }

  /**
   * CSRF統計情報
   */
  static getCSRFStats(request: NextRequest): {
    hasCSRFToken: boolean;
    tokenSource: 'cookie' | 'header' | 'none';
    originValid: boolean;
    methodRequiresProtection: boolean;
    pathRequiresProtection: boolean;
  } {
    const method = request.method.toUpperCase();
    const pathname = new URL(request.url).pathname;

    const cookieResult = CookieService.getCookie(request, this.config.cookieName);
    const headerToken = request.headers.get(this.config.headerName);
    const originResult = this.validateOrigin(request);

    let tokenSource: 'cookie' | 'header' | 'none' = 'none';
    if (cookieResult.valid) tokenSource = 'cookie';
    else if (headerToken) tokenSource = 'header';

    return {
      hasCSRFToken: cookieResult.valid || !!headerToken,
      tokenSource,
      originValid: originResult.valid,
      methodRequiresProtection: !this.protectionOptions.skipMethods?.includes(method),
      pathRequiresProtection: !this.protectionOptions.skipPaths?.some(path => pathname.startsWith(path))
    };
  }

  /**
   * CSRF攻撃検出
   */
  static detectCSRFAttack(request: NextRequest): {
    isAttack: boolean;
    attackType?: 'missing_token' | 'invalid_origin' | 'token_mismatch';
    riskScore: number; // 0-100
    details: string[];
  } {
    const details: string[] = [];
    let riskScore = 0;
    let isAttack = false;
    let attackType: 'missing_token' | 'invalid_origin' | 'token_mismatch' | undefined;

    const validation = this.validateCSRFToken(request);
    
    if (!validation.valid) {
      isAttack = true;
      attackType = validation.error as any;
      riskScore += 60;
      details.push(`CSRF validation failed: ${validation.error}`);
    }

    // 追加のリスク要因
    const userAgent = request.headers.get('user-agent');
    if (!userAgent || userAgent.length < 20) {
      riskScore += 20;
      details.push('Suspicious User-Agent');
    }

    const referer = request.headers.get('referer');
    if (!referer) {
      riskScore += 15;
      details.push('Missing Referer header');
    }

    const xRequestedWith = request.headers.get('x-requested-with');
    if (!xRequestedWith) {
      riskScore += 10;
      details.push('Missing X-Requested-With header');
    }

    // 同時接続数の異常
    const contentLength = request.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > 10 * 1024 * 1024) { // 10MB
      riskScore += 25;
      details.push('Large request body');
    }

    return {
      isAttack,
      attackType,
      riskScore: Math.min(riskScore, 100),
      details
    };
  }
}

// =================================================================
// Next.js用ヘルパー関数
// =================================================================

/**
 * APIルート用CSRF検証
 */
export function withCSRFProtection(
  handler: (request: NextRequest) => Promise<NextResponse> | NextResponse,
  options?: Partial<CSRFProtectionOptions>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    // バイパスチェック
    if (CSRFService.bypassProtection(request)) {
      return handler(request);
    }

    // CSRF検証
    const validation = CSRFService.middleware(request, options);
    
    if (!validation.valid) {
      return CSRFService.setSecurityHeaders(
        NextResponse.json(
          {
            success: false,
            error: {
              code: 'CSRF_PROTECTION_FAILED',
              message: 'CSRF token validation failed',
              details: validation.details
            }
          },
          { status: 403 }
        )
      );
    }

    return handler(request);
  };
}

// =================================================================
// エクスポート
// =================================================================

export default CSRFService;