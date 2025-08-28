import { NextRequest, NextResponse } from 'next/server';
import { JWTService } from '@/lib/auth/jwt-service';
import { CookieService } from '@/lib/auth/cookie-service';

export async function GET(request: NextRequest) {
  try {
    // アクセストークンを取得
    const accessTokenResult = CookieService.getAccessToken(request);
    const refreshTokenResult = CookieService.getRefreshToken(request);
    
    if (!accessTokenResult.valid || !accessTokenResult.value) {
      return NextResponse.json({
        authenticated: false,
        message: 'アクセストークンが見つかりません'
      });
    }
    
    // トークンを検証
    const verifyResult = await JWTService.verifyAccessToken(accessTokenResult.value);
    
    if (!verifyResult.valid) {
      return NextResponse.json({
        authenticated: false,
        message: 'トークンが無効です',
        error: verifyResult.error
      });
    }
    
    // トークンの有効期限を計算
    const now = Math.floor(Date.now() / 1000);
    const accessTokenExpiry = verifyResult.payload?.exp 
      ? new Date(verifyResult.payload.exp * 1000).toLocaleString('ja-JP')
      : '不明';
    
    // リフレッシュトークンの検証（情報取得のため）
    let refreshTokenExpiry = '不明';
    if (refreshTokenResult.valid && refreshTokenResult.value) {
      const refreshVerify = await JWTService.verifyRefreshToken(refreshTokenResult.value);
      if (refreshVerify.valid && refreshVerify.payload?.exp) {
        refreshTokenExpiry = new Date(refreshVerify.payload.exp * 1000).toLocaleString('ja-JP');
      }
    }
    
    return NextResponse.json({
      authenticated: true,
      message: '認証済み',
      user: {
        userId: verifyResult.payload?.userId,
        email: verifyResult.payload?.email,
        role: verifyResult.payload?.role || 'user'
      },
      tokenInfo: {
        accessTokenExpiry,
        refreshTokenExpiry,
        deviceId: CookieService.getDeviceId(request).value
      }
    });
    
  } catch (error) {
    console.error('Verify error:', error);
    return NextResponse.json({
      authenticated: false,
      message: 'エラーが発生しました',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}