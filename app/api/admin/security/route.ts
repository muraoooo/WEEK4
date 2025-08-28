import { NextRequest, NextResponse } from 'next/server';
import { connectDatabase } from '@/lib/db';
import mongoose from 'mongoose';

export async function GET(request: NextRequest) {
  try {
    await connectDatabase();

    const loginAttemptsCollection = mongoose.connection.collection('login_attempts');
    const tokenBlacklistCollection = mongoose.connection.collection('token_blacklist');
    const sessionsCollection = mongoose.connection.collection('user_sessions');
    const usersCollection = mongoose.connection.collection('users');

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const lastMonth = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    // ログイン試行統計
    const totalLoginAttempts = await loginAttemptsCollection.countDocuments({});
    const failedLoginAttempts = await loginAttemptsCollection.countDocuments({ success: false });
    const todayLoginAttempts = await loginAttemptsCollection.countDocuments({
      timestamp: { $gte: today }
    });
    const todayFailedAttempts = await loginAttemptsCollection.countDocuments({
      timestamp: { $gte: today },
      success: false
    });

    // ブロックされたトークン
    const blacklistedTokens = await tokenBlacklistCollection.countDocuments({});
    const recentBlacklisted = await tokenBlacklistCollection.countDocuments({
      createdAt: { $gte: yesterday }
    });

    // 不審なアクティビティ検出
    const suspiciousIPs = await loginAttemptsCollection.aggregate([
      {
        $match: {
          success: false,
          timestamp: { $gte: lastWeek }
        }
      },
      {
        $group: {
          _id: "$ipAddress",
          count: { $sum: 1 }
        }
      },
      {
        $match: {
          count: { $gte: 5 } // 5回以上失敗
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: 10
      }
    ]).toArray();

    // 最近のセキュリティイベント
    const recentEvents: any[] = [];
    
    // 失敗したログイン試行
    const recentFailedLogins = await loginAttemptsCollection
      .find({ success: false })
      .sort({ timestamp: -1 })
      .limit(5)
      .toArray();
    
    recentFailedLogins.forEach(attempt => {
      recentEvents.push({
        id: attempt._id.toString(),
        type: 'failed_login',
        severity: 'warning',
        message: `ログイン失敗: ${attempt.email || attempt.ipAddress || 'Unknown'}`,
        timestamp: attempt.timestamp || now,
        details: {
          ip: attempt.ipAddress,
          email: attempt.email
        }
      });
    });

    // ブラックリストに追加されたトークン
    const recentBlacklistTokens = await tokenBlacklistCollection
      .find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .toArray();
    
    recentBlacklistTokens.forEach(token => {
      recentEvents.push({
        id: token._id.toString(),
        type: 'token_blacklisted',
        severity: 'info',
        message: `トークン無効化: ${token.reason || 'Security reason'}`,
        timestamp: token.createdAt || now,
        details: {
          type: token.type,
          reason: token.reason
        }
      });
    });

    // イベントを時系列でソート
    recentEvents.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    // セキュリティスコア計算（100点満点）
    let securityScore = 100;
    
    // 失敗率が高い場合減点
    const failureRate = totalLoginAttempts > 0 
      ? (failedLoginAttempts / totalLoginAttempts) * 100 
      : 0;
    if (failureRate > 10) securityScore -= 20;
    else if (failureRate > 5) securityScore -= 10;
    
    // 不審なIPが多い場合減点
    if (suspiciousIPs.length > 5) securityScore -= 15;
    else if (suspiciousIPs.length > 2) securityScore -= 5;
    
    // ブラックリストトークンが多い場合減点
    if (blacklistedTokens > 100) securityScore -= 10;
    else if (blacklistedTokens > 50) securityScore -= 5;

    // セキュリティレベル判定
    let securityLevel = 'high';
    if (securityScore < 60) securityLevel = 'low';
    else if (securityScore < 80) securityLevel = 'medium';

    // ユーザー別リスクスコア（簡略版）
    const riskUsers = await loginAttemptsCollection.aggregate([
      {
        $match: {
          success: false,
          timestamp: { $gte: lastMonth }
        }
      },
      {
        $group: {
          _id: "$email",
          failedAttempts: { $sum: 1 }
        }
      },
      {
        $match: {
          failedAttempts: { $gte: 3 }
        }
      },
      {
        $sort: { failedAttempts: -1 }
      },
      {
        $limit: 5
      }
    ]).toArray();

    const response = {
      overview: {
        securityScore,
        securityLevel,
        totalAlerts: suspiciousIPs.length + recentBlacklistTokens.length,
        activeThreats: suspiciousIPs.length
      },
      loginSecurity: {
        total: totalLoginAttempts,
        failed: failedLoginAttempts,
        failureRate: failureRate.toFixed(2),
        todayAttempts: todayLoginAttempts,
        todayFailed: todayFailedAttempts,
        suspiciousIPs: suspiciousIPs.map(ip => ({
          ip: ip._id,
          attempts: ip.count
        }))
      },
      tokenSecurity: {
        blacklisted: blacklistedTokens,
        recentBlacklisted,
        activeSessions: await sessionsCollection.countDocuments({ isActive: true })
      },
      riskUsers: riskUsers.map(user => ({
        email: user._id || 'Unknown',
        failedAttempts: user.failedAttempts,
        riskLevel: user.failedAttempts > 10 ? 'high' : user.failedAttempts > 5 ? 'medium' : 'low'
      })),
      recentEvents: recentEvents.slice(0, 10),
      recommendations: [
        failureRate > 10 && 'ログイン失敗率が高いです。ブルートフォース攻撃の可能性があります。',
        suspiciousIPs.length > 5 && 'multiple IPアドレスから不審なアクセスが検出されました。',
        blacklistedTokens > 100 && 'ブラックリストトークンが多数存在します。セキュリティ監査を推奨します。',
        securityScore < 70 && 'セキュリティスコアが低下しています。対策を検討してください。'
      ].filter(Boolean),
      lastUpdated: now
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Security API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch security data' },
      { status: 500 }
    );
  }
}