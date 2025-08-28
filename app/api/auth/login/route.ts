import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { connectDatabase } from '@/lib/database';
import { securityMiddleware } from '@/lib/security-middleware-edge';

export async function POST(request: NextRequest) {
  const clientIP = getClientIP(request);
  
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'メールアドレスとパスワードは必須です' },
        { status: 400 }
      );
    }

    // データベース接続
    await connectDatabase();
    const mongoose = require('mongoose');
    const usersCollection = mongoose.connection.collection('users');

    // ユーザーを検索
    const user = await usersCollection.findOne({ email });

    if (!user) {
      // ログイン失敗を記録（ブルートフォース防御）
      await securityMiddleware.recordFailedLoginAttempt(clientIP);
      
      return NextResponse.json(
        { error: 'メールアドレスまたはパスワードが正しくありません' },
        { status: 401 }
      );
    }

    // パスワードを確認
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      // デモ用: パスワードがハッシュ化されていない場合の処理
      if (password === user.password) {
        // パスワードをハッシュ化して更新
        const hashedPassword = await bcrypt.hash(password, 10);
        await usersCollection.updateOne(
          { _id: user._id },
          { $set: { password: hashedPassword } }
        );
      } else {
        // ログイン失敗を記録（ブルートフォース防御）
        await securityMiddleware.recordFailedLoginAttempt(clientIP);
        
        return NextResponse.json(
          { error: 'メールアドレスまたはパスワードが正しくありません' },
          { status: 401 }
        );
      }
    }

    // ユーザーのステータスを確認
    if (user.status === 'suspended' || user.status === 'banned') {
      return NextResponse.json(
        { error: 'アカウントが無効化されています' },
        { status: 403 }
      );
    }

    // JWTトークンを生成
    const accessToken = jwt.sign(
      {
        userId: user._id.toString(),
        email: user.email,
        role: user.role || 'user'
      },
      process.env.JWT_ACCESS_SECRET || 'access-token-secret',
      { expiresIn: '15m' }
    );

    const refreshToken = jwt.sign(
      {
        userId: user._id.toString()
      },
      process.env.JWT_REFRESH_SECRET || 'refresh-token-secret',
      { expiresIn: '7d' }
    );

    // セッションを作成
    const sessionsCollection = mongoose.connection.collection('user_sessions');
    await sessionsCollection.insertOne({
      sessionId: `session_${Date.now()}_${Math.random().toString(36)}`,
      userId: user._id.toString(),
      token: accessToken,
      refreshToken,
      createdAt: new Date(),
      lastActivity: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7日後
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      isActive: true,
      deviceType: 'web',
      location: 'unknown'
    });

    // 最終ログイン時刻を更新
    await usersCollection.updateOne(
      { _id: user._id },
      { $set: { lastLoginAt: new Date() } }
    );

    // 成功ログインを記録（信頼度スコア向上）
    await securityMiddleware.recordSuccessfulLogin(clientIP);

    // 監査ログを記録
    const auditLogsCollection = mongoose.connection.collection('audit_logs');
    await auditLogsCollection.insertOne({
      timestamp: new Date(),
      action: 'LOGIN',
      eventType: 'AUTH_LOGIN_SUCCESS',
      eventCategory: 'authentication',
      severity: 'info',
      userId: user._id.toString(),
      userEmail: user.email,
      targetUserId: user._id.toString(),
      details: {
        loginMethod: 'password',
        success: true
      },
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    });

    // レスポンスを作成してCookieを設定
    const response = NextResponse.json({
      success: true,
      token: accessToken,
      refreshToken,
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        role: user.role || 'user'
      }
    });

    // Cookieにトークンを設定
    response.cookies.set('access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 15 * 60 // 15分
    });

    response.cookies.set('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 // 7日
    });

    return response;

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'ログイン処理中にエラーが発生しました' },
      { status: 500 }
    );
  }
}

/**
 * クライアントIPアドレス取得
 */
function getClientIP(request: NextRequest): string {
  // プロキシやロードバランサー経由の場合を考慮
  const xForwardedFor = request.headers.get('x-forwarded-for');
  if (xForwardedFor) {
    return xForwardedFor.split(',')[0].trim();
  }

  const xRealIP = request.headers.get('x-real-ip');
  if (xRealIP) {
    return xRealIP.trim();
  }

  return '127.0.0.1';
}