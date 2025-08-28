/**
 * トークンリフレッシュ API
 * リフレッシュトークンを使用してアクセストークンを更新
 */

import { NextRequest, NextResponse } from 'next/server';
import { JWTService } from '@/lib/auth/jwt-service';
import { CookieService } from '@/lib/auth/cookie-service';
import { connectDatabase } from '@/lib/database';
import LoginAttempt from '@/models/LoginAttempt';

// =================================================================
// ヘルパー関数
// =================================================================

/**
 * IPアドレス取得
 */
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const cfIP = request.headers.get('cf-connecting-ip');
  
  if (cfIP) return cfIP;
  if (forwarded) return forwarded.split(',')[0].trim();
  if (realIP) return realIP;
  
  return '127.0.0.1';
}

/**
 * セキュリティチェック
 */
function performSecurityChecks(request: NextRequest): {
  passed: boolean;
  error?: string;
} {
  // User-Agentチェック
  const userAgent = request.headers.get('user-agent');
  if (!userAgent || userAgent.length < 10) {
    return {
      passed: false,
      error: 'Invalid or missing User-Agent'
    };
  }

  // Refererチェック（同一オリジン）
  const referer = request.headers.get('referer');
  const host = request.headers.get('host');
  
  if (referer) {
    try {
      const refererHost = new URL(referer).host;
      if (refererHost !== host) {
        return {
          passed: false,
          error: 'Cross-origin request not allowed'
        };
      }
    } catch {
      return {
        passed: false,
        error: 'Invalid referer header'
      };
    }
  }

  return { passed: true };
}

// =================================================================
// メインハンドラー
// =================================================================

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const ipAddress = getClientIP(request);
  const userAgent = request.headers.get('user-agent') || 'Unknown';

  try {
    // =====================================
    // 1. セキュリティチェック
    // =====================================

    const securityCheck = performSecurityChecks(request);
    if (!securityCheck.passed) {
      return CookieService.setSecurityHeaders(
        NextResponse.json(
          {
            success: false,
            error: {
              code: 'SECURITY_VIOLATION',
              message: 'Security check failed'
            }
          },
          { status: 403 }
        )
      );
    }

    // =====================================
    // 2. データベース接続
    // =====================================

    await connectDatabase();

    // =====================================
    // 3. リフレッシュトークン取得と検証
    // =====================================

    const refreshTokenResult = CookieService.getRefreshToken(request);
    
    if (!refreshTokenResult.valid || !refreshTokenResult.value) {
      return CookieService.setSecurityHeaders(
        NextResponse.json(
          {
            success: false,
            error: {
              code: 'REFRESH_TOKEN_MISSING',
              message: 'Refresh token not found'
            }
          },
          { status: 401 }
        )
      );
    }

    // =====================================
    // 4. トークンリフレッシュ処理
    // =====================================

    const refreshResult = await JWTService.refreshTokens(refreshTokenResult.value);

    if (!refreshResult.success || !refreshResult.tokens) {
      // 失敗を記録
      try {
        await LoginAttempt.create({
          email: 'unknown', // リフレッシュトークンから取得できない場合
          ipAddress,
          userAgent,
          success: false,
          failureReason: 'invalid_session',
          timestamp: new Date(),
          riskScore: 50,
          isBlocked: false,
          twoFactorRequired: false
        });
      } catch (error) {
        console.error('Login attempt logging error:', error);
      }

      // リフレッシュに失敗した場合は全てのクッキーを削除
      const response = CookieService.setSecurityHeaders(
        NextResponse.json(
          {
            success: false,
            error: {
              code: 'REFRESH_FAILED',
              message: refreshResult.error || 'Token refresh failed',
              requiresLogin: true
            }
          },
          { status: 401 }
        )
      );

      CookieService.deleteAllAuthCookies(response);
      return response;
    }

    // =====================================
    // 5. 新しいトークンでクッキー更新
    // =====================================

    const { accessToken, refreshToken, expiresIn, refreshExpiresIn } = refreshResult.tokens;

    // デバイスIDを取得または生成
    let deviceId = CookieService.getDeviceId(request).value;
    if (!deviceId) {
      deviceId = JWTService.generateDeviceFingerprint(userAgent, ipAddress);
    }

    const response = CookieService.setSecurityHeaders(
      NextResponse.json(
        {
          success: true,
          message: 'Token refreshed successfully',
          expiresIn,
          refreshExpiresIn
        },
        { status: 200 }
      )
    );

    // 新しいクッキーを設定
    CookieService.setAccessTokenCookie(response, accessToken, expiresIn);
    CookieService.setRefreshTokenCookie(response, refreshToken, refreshExpiresIn);
    
    // デバイスIDが新しい場合は設定
    if (!CookieService.getDeviceId(request).valid) {
      CookieService.setDeviceIdCookie(response, deviceId);
    }

    return response;

  } catch (error) {
    console.error('Token refresh error:', error);

    const response = CookieService.setSecurityHeaders(
      NextResponse.json(
        {
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Server error occurred'
          }
        },
        { status: 500 }
      )
    );

    return response;
  }
}

// =================================================================
// その他のHTTPメソッド
// =================================================================

export async function GET() {
  return CookieService.setSecurityHeaders(
    NextResponse.json(
      {
        success: false,
        error: {
          code: 'METHOD_NOT_ALLOWED',
          message: 'Only POST method is allowed'
        }
      },
      { status: 405 }
    )
  );
}

export async function PUT() {
  return CookieService.setSecurityHeaders(
    NextResponse.json(
      {
        success: false,
        error: {
          code: 'METHOD_NOT_ALLOWED',
          message: 'Only POST method is allowed'
        }
      },
      { status: 405 }
    )
  );
}

export async function DELETE() {
  return CookieService.setSecurityHeaders(
    NextResponse.json(
      {
        success: false,
        error: {
          code: 'METHOD_NOT_ALLOWED',
          message: 'Only POST method is allowed'
        }
      },
      { status: 405 }
    )
  );
}