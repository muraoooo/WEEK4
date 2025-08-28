import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

async function verifyAuth(request: NextRequest) {
  try {
    // Authorizationヘッダーからトークンを取得
    const authHeader = request.headers.get('authorization');
    let token = null;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else {
      // クッキーからも確認
      token = request.cookies.get('access_token')?.value;
    }
    
    if (!token) {
      return NextResponse.json({
        authenticated: false,
        message: 'アクセストークンが見つかりません'
      }, { status: 401 });
    }
    
    // トークンを検証
    try {
      const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET || 'access-token-secret') as any;
      
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
      }, { status: 401 });
    }
    
  } catch (error) {
    console.error('Verify error:', error);
    return NextResponse.json({
      authenticated: false,
      message: 'エラーが発生しました',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return verifyAuth(request);
}

export async function POST(request: NextRequest) {
  return verifyAuth(request);
}