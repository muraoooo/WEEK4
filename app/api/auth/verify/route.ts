import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

export async function GET(request: NextRequest) {
  try {
    // アクセストークンを取得
    const accessToken = request.cookies.get('access_token')?.value;
    
    if (!accessToken) {
      return NextResponse.json({
        authenticated: false,
        message: 'アクセストークンが見つかりません'
      });
    }
    
    // トークンを検証
    try {
      const decoded = jwt.verify(accessToken, process.env.JWT_ACCESS_SECRET || 'access-token-secret') as any;
      
      return NextResponse.json({
        authenticated: true,
        user: {
          id: decoded.userId,
          email: decoded.email,
          role: decoded.role
        }
      });
    } catch (error) {
      return NextResponse.json({
        authenticated: false,
        message: 'トークンが無効です'
      });
    }
    
  } catch (error) {
    console.error('Verify error:', error);
    return NextResponse.json({
      authenticated: false,
      message: 'エラーが発生しました',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}