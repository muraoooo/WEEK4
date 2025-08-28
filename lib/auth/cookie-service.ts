/**
 * セキュアクッキー管理サービス
 * HTTPOnly, Secure, SameSite設定による安全なクッキー管理
 */

import { NextRequest, NextResponse } from 'next/server';
import { RequestCookies, ResponseCookies } from 'next/dist/compiled/@edge-runtime/cookies';

// =================================================================
// 型定義
// =================================================================

export interface CookieOptions {
  maxAge?: number; // 秒単位
  expires?: Date;
  path?: string;
  domain?: string;
  secure?: boolean;
  httpOnly?: boolean;
  sameSite?: 'strict' | 'lax' | 'none';
}

export interface SecureCookieConfig {
  name: string;
  value: string;
  options: CookieOptions;
}

export interface CookieValidationResult {
  valid: boolean;
  value?: string;
  error?: 'not_found' | 'expired' | 'invalid' | 'tampered';
}

// =================================================================
// 設定
// =================================================================

const DEFAULT_COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  path: '/',
  maxAge: 24 * 60 * 60 // 24時間
};

const COOKIE_NAMES = {
  ACCESS_TOKEN: 'admin_access_token',
  REFRESH_TOKEN: 'admin_refresh_token',
  SESSION_ID: 'admin_session_id',
  CSRF_TOKEN: 'admin_csrf_token',
  DEVICE_ID: 'admin_device_id'
} as const;

// =================================================================
// クッキーサービスクラス
// =================================================================

export class CookieService {
  /**
   * セキュアクッキーを設定
   */
  static setSecureCookie(
    response: NextResponse,
    name: string,
    value: string,
    customOptions: Partial<CookieOptions> = {}
  ): void {
    const options: CookieOptions = {
      ...DEFAULT_COOKIE_OPTIONS,
      ...customOptions
    };

    // プロダクション環境では必ずSecureフラグを有効化
    if (process.env.NODE_ENV === 'production') {
      options.secure = true;
    }

    // 開発環境での警告
    if (process.env.NODE_ENV === 'development' && !options.secure) {
      console.warn(`Cookie '${name}' is not secure. This is only acceptable in development.`);
    }

    response.cookies.set(name, value, options);
  }

  /**
   * アクセストークンクッキー設定
   */
  static setAccessTokenCookie(response: NextResponse, token: string, maxAge?: number): void {
    this.setSecureCookie(response, COOKIE_NAMES.ACCESS_TOKEN, token, {
      maxAge: maxAge || 15 * 60, // 15分
      path: '/admin'
    });
  }

  /**
   * リフレッシュトークンクッキー設定
   */
  static setRefreshTokenCookie(response: NextResponse, token: string, maxAge?: number): void {
    this.setSecureCookie(response, COOKIE_NAMES.REFRESH_TOKEN, token, {
      maxAge: maxAge || 7 * 24 * 60 * 60, // 7日
      path: '/admin/auth/refresh',
      sameSite: 'strict'
    });
  }

  /**
   * セッションIDクッキー設定
   */
  static setSessionIdCookie(response: NextResponse, sessionId: string): void {
    this.setSecureCookie(response, COOKIE_NAMES.SESSION_ID, sessionId, {
      maxAge: 8 * 60 * 60, // 8時間（絶対タイムアウト）
      path: '/admin'
    });
  }

  /**
   * CSRFトークンクッキー設定
   */
  static setCSRFTokenCookie(response: NextResponse, token: string): void {
    this.setSecureCookie(response, COOKIE_NAMES.CSRF_TOKEN, token, {
      maxAge: 24 * 60 * 60, // 24時間
      httpOnly: false, // JavaScriptからアクセス可能（CSRFヘッダー送信のため）
      sameSite: 'strict'
    });
  }

  /**
   * デバイスIDクッキー設定
   */
  static setDeviceIdCookie(response: NextResponse, deviceId: string): void {
    this.setSecureCookie(response, COOKIE_NAMES.DEVICE_ID, deviceId, {
      maxAge: 365 * 24 * 60 * 60, // 1年
      path: '/'
    });
  }

  /**
   * クッキーから値を取得
   */
  static getCookie(request: NextRequest, name: string): CookieValidationResult {
    try {
      const cookieStore = request.cookies;
      const cookie = cookieStore.get(name);

      if (!cookie) {
        return {
          valid: false,
          error: 'not_found'
        };
      }

      // 基本的な検証
      if (!cookie.value || cookie.value.trim() === '') {
        return {
          valid: false,
          error: 'invalid'
        };
      }

      return {
        valid: true,
        value: cookie.value
      };
    } catch (error) {
      console.error(`Cookie validation error for '${name}':`, error);
      return {
        valid: false,
        error: 'invalid'
      };
    }
  }

  /**
   * アクセストークンを取得
   */
  static getAccessToken(request: NextRequest): CookieValidationResult {
    return this.getCookie(request, COOKIE_NAMES.ACCESS_TOKEN);
  }

  /**
   * リフレッシュトークンを取得
   */
  static getRefreshToken(request: NextRequest): CookieValidationResult {
    return this.getCookie(request, COOKIE_NAMES.REFRESH_TOKEN);
  }

  /**
   * セッションIDを取得
   */
  static getSessionId(request: NextRequest): CookieValidationResult {
    return this.getCookie(request, COOKIE_NAMES.SESSION_ID);
  }

  /**
   * CSRFトークンを取得
   */
  static getCSRFToken(request: NextRequest): CookieValidationResult {
    return this.getCookie(request, COOKIE_NAMES.CSRF_TOKEN);
  }

  /**
   * デバイスIDを取得
   */
  static getDeviceId(request: NextRequest): CookieValidationResult {
    return this.getCookie(request, COOKIE_NAMES.DEVICE_ID);
  }

  /**
   * クッキーを削除
   */
  static deleteCookie(response: NextResponse, name: string, path: string = '/'): void {
    response.cookies.set(name, '', {
      maxAge: 0,
      expires: new Date(0),
      path,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });
  }

  /**
   * 全ての認証関連クッキーを削除
   */
  static deleteAllAuthCookies(response: NextResponse): void {
    this.deleteCookie(response, COOKIE_NAMES.ACCESS_TOKEN, '/admin');
    this.deleteCookie(response, COOKIE_NAMES.REFRESH_TOKEN, '/admin/auth/refresh');
    this.deleteCookie(response, COOKIE_NAMES.SESSION_ID, '/admin');
    this.deleteCookie(response, COOKIE_NAMES.CSRF_TOKEN, '/');
    // デバイスIDは残す（デバイス識別のため）
  }

  /**
   * 完全なクッキー削除（ログアウト時）
   */
  static deleteAllCookies(response: NextResponse): void {
    this.deleteAllAuthCookies(response);
    this.deleteCookie(response, COOKIE_NAMES.DEVICE_ID, '/');
  }

  /**
   * クッキーセキュリティ検証
   */
  static validateCookieSecurity(request: NextRequest): {
    secure: boolean;
    issues: string[];
  } {
    const issues: string[] = [];
    let secure = true;

    // HTTPS接続チェック
    const protocol = request.headers.get('x-forwarded-proto') || 
                    request.url.split('://')[0];
    
    if (protocol !== 'https' && process.env.NODE_ENV === 'production') {
      issues.push('HTTPS connection required in production');
      secure = false;
    }

    // User-Agentチェック
    const userAgent = request.headers.get('user-agent');
    if (!userAgent || userAgent.length < 10) {
      issues.push('Suspicious or missing User-Agent');
      secure = false;
    }

    // Referrerチェック（管理画面アクセス時）
    const referer = request.headers.get('referer');
    const pathname = new URL(request.url).pathname;
    
    if (pathname.startsWith('/admin') && referer) {
      const refererHost = new URL(referer).host;
      const currentHost = request.headers.get('host');
      
      if (refererHost !== currentHost) {
        issues.push('Cross-origin request detected');
        secure = false;
      }
    }

    return { secure, issues };
  }

  /**
   * クッキー有効期限チェック
   */
  static checkCookieExpiration(cookieValue: string, type: 'access' | 'refresh'): {
    expired: boolean;
    expiresAt?: Date;
    remainingTime?: number;
  } {
    try {
      // JWTトークンの場合、ペイロードから有効期限を取得
      const parts = cookieValue.split('.');
      if (parts.length !== 3) {
        return { expired: true };
      }

      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      const exp = payload.exp;

      if (!exp) {
        return { expired: true };
      }

      const now = Math.floor(Date.now() / 1000);
      const expiresAt = new Date(exp * 1000);
      const remainingTime = exp - now;

      return {
        expired: now >= exp,
        expiresAt,
        remainingTime
      };
    } catch (error) {
      console.error('Cookie expiration check error:', error);
      return { expired: true };
    }
  }

  /**
   * セキュリティヘッダー設定
   */
  static setSecurityHeaders(response: NextResponse): NextResponse {
    // Cookie関連のセキュリティヘッダー
    response.headers.set('Set-Cookie-SameSite', 'Strict');
    
    // 一般的なセキュリティヘッダー
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-XSS-Protection', '1; mode=block');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    if (process.env.NODE_ENV === 'production') {
      response.headers.set(
        'Strict-Transport-Security',
        'max-age=31536000; includeSubDomains; preload'
      );
    }

    // Cache control for sensitive data
    response.headers.set(
      'Cache-Control',
      'no-store, no-cache, must-revalidate, proxy-revalidate'
    );
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');

    return response;
  }

  /**
   * クッキー統計情報取得
   */
  static getCookieStats(request: NextRequest): {
    totalCookies: number;
    authCookies: number;
    cookieNames: string[];
    securityFlags: {
      hasAccessToken: boolean;
      hasRefreshToken: boolean;
      hasSessionId: boolean;
      hasCSRFToken: boolean;
      hasDeviceId: boolean;
    };
  } {
    const cookies = request.cookies;
    const allCookies = cookies.getAll();
    const cookieNames = allCookies.map(cookie => cookie.name);

    const securityFlags = {
      hasAccessToken: cookieNames.includes(COOKIE_NAMES.ACCESS_TOKEN),
      hasRefreshToken: cookieNames.includes(COOKIE_NAMES.REFRESH_TOKEN),
      hasSessionId: cookieNames.includes(COOKIE_NAMES.SESSION_ID),
      hasCSRFToken: cookieNames.includes(COOKIE_NAMES.CSRF_TOKEN),
      hasDeviceId: cookieNames.includes(COOKIE_NAMES.DEVICE_ID)
    };

    const authCookieNames = Object.values(COOKIE_NAMES);
    const authCookies = cookieNames.filter(name => 
      authCookieNames.includes(name as any)
    ).length;

    return {
      totalCookies: allCookies.length,
      authCookies,
      cookieNames,
      securityFlags
    };
  }
}

// =================================================================
// エクスポート
// =================================================================

export default CookieService;
export { COOKIE_NAMES };