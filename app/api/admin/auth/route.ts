import { NextRequest, NextResponse } from 'next/server';
import { config } from '@/lib/config';
import jwt from 'jsonwebtoken';

// 管理者認証トークンを生成
export async function POST(request: NextRequest) {
  try {
    // セッションまたはクッキーから認証状態を確認
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    
    try {
      // JWTトークンを検証
      const decoded = jwt.verify(token, config.jwtSecret) as any;
      
      // 管理者権限を確認
      if (!decoded.isAdmin && decoded.role !== 'admin') {
        return NextResponse.json(
          { error: 'Admin access required' },
          { status: 403 }
        );
      }

      // 管理者API用の一時トークンを生成（短時間有効）
      const adminApiToken = jwt.sign(
        { 
          userId: decoded.userId,
          isAdmin: true,
          purpose: 'admin-api',
          timestamp: Date.now()
        },
        config.adminSecretKey,
        { expiresIn: '5m' } // 5分間のみ有効
      );

      return NextResponse.json({
        success: true,
        token: adminApiToken
      });

    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

  } catch (error) {
    console.error('Admin auth error:', error);
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    );
  }
}

// 管理者トークンを検証
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('x-admin-token');
    
    if (!authHeader) {
      return NextResponse.json(
        { valid: false },
        { status: 401 }
      );
    }

    try {
      const decoded = jwt.verify(authHeader, config.adminSecretKey) as any;
      
      // トークンの目的と有効期限を確認
      if (decoded.purpose !== 'admin-api') {
        return NextResponse.json({ valid: false });
      }

      // タイムスタンプを確認（5分以内）
      const elapsed = Date.now() - decoded.timestamp;
      if (elapsed > 5 * 60 * 1000) {
        return NextResponse.json({ valid: false });
      }

      return NextResponse.json({ 
        valid: true,
        userId: decoded.userId
      });

    } catch (error) {
      return NextResponse.json({ valid: false });
    }

  } catch (error) {
    return NextResponse.json(
      { error: 'Validation failed' },
      { status: 500 }
    );
  }
}