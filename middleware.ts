/**
 * Next.js Middleware - セキュリティ統合 + 認証チェック
 * 全てのリクエストに対してセキュリティチェックと認証チェックを実行
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { securityMiddleware } from '@/lib/security-middleware-edge';

// 認証が必要なパス
const protectedPaths = [
  '/admin',
  '/dashboard',
  '/profile',
  '/settings'
];

export async function middleware(request: NextRequest) {
  const startTime = Date.now();
  const pathname = request.nextUrl.pathname;

  try {
    // 1. セキュリティチェック実行（レート制限、IP制限など）
    const securityResult = await securityMiddleware.checkSecurity(request);

    if (!securityResult.allowed) {
      // セキュリティチェックに失敗した場合
      const response = NextResponse.json(
        {
          error: securityResult.reason || 'Access denied',
          timestamp: new Date().toISOString(),
          requestId: crypto.randomUUID()
        },
        { status: securityResult.statusCode || 403 }
      );

      // セキュリティヘッダーを追加
      addSecurityHeaders(response, securityResult.headers);
      response.headers.set('X-Security-Check', 'failed');

      return response;
    }

    // 2. 認証チェック（保護されたパスのみ）
    const isProtectedPath = protectedPaths.some(path => 
      pathname.startsWith(path)
    );
    
    if (isProtectedPath) {
      // アクセストークンを取得
      const accessToken = request.cookies.get('access_token')?.value;
      
      if (!accessToken) {
        // トークンがない場合はログインページへリダイレクト
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('from', pathname);
        const response = NextResponse.redirect(loginUrl);
        
        addSecurityHeaders(response, securityResult.headers);
        response.headers.set('X-Auth-Check', 'failed');
        
        return response;
      }
    }

    // 3. セキュリティチェック通過 - リクエストを続行
    const response = NextResponse.next();

    // セキュリティヘッダーを追加
    addSecurityHeaders(response, securityResult.headers);
    response.headers.set('X-Security-Check', 'passed');
    response.headers.set('X-Auth-Check', isProtectedPath ? 'passed' : 'not-required');
    response.headers.set('X-Response-Time', `${Date.now() - startTime}ms`);

    return response;

  } catch (error) {
    console.error('Middleware error:', error);

    // エラー時は基本的なセキュリティヘッダーのみ設定してリクエストを通す
    const response = NextResponse.next();
    addBasicSecurityHeaders(response);
    response.headers.set('X-Security-Check', 'error');

    return response;
  }
}

/**
 * セキュリティヘッダーを追加
 */
function addSecurityHeaders(response: NextResponse, additionalHeaders?: Record<string, string>) {
  // 追加のセキュリティヘッダー
  if (additionalHeaders) {
    Object.entries(additionalHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
  }

  // 基本セキュリティヘッダー
  addBasicSecurityHeaders(response);

  // CSP (Content Security Policy) ヘッダー
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "connect-src 'self'",
    "font-src 'self'",
    "object-src 'none'",
    "media-src 'self'",
    "frame-src 'none'"
  ].join('; ');
  
  response.headers.set('Content-Security-Policy', csp);
}

/**
 * 基本セキュリティヘッダーを追加
 */
function addBasicSecurityHeaders(response: NextResponse) {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/health (health check endpoint)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!api/health|_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.gif$|.*\\.svg$|.*\\.ico$).*)',
  ],
};