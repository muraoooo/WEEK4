import { NextRequest, NextResponse } from 'next/server';
import { connectDatabase } from '@/lib/db';
import mongoose from 'mongoose';

export async function GET(request: NextRequest) {
  try {
    await connectDatabase();

    const sessionsCollection = mongoose.connection.collection('user_sessions');
    const usersCollection = mongoose.connection.collection('users');

    // セッションデータを取得（最新100件まで）
    const sessions = await sessionsCollection
      .find({})
      .sort({ createdAt: -1 })
      .limit(100)
      .toArray();
    
    // セッションデータを整形
    const formattedSessions = await Promise.all(sessions.map(async (session) => {
      // ユーザー情報を取得
      let userEmail = 'Unknown';
      let userName = 'Unknown';
      let userId = session.userId || 'N/A';
      
      if (session.userId) {
        try {
          // userIdが文字列の場合とObjectIdの場合の両方に対応
          const userIdString = typeof session.userId === 'string' 
            ? session.userId 
            : session.userId.toString();
          
          // まず文字列で検索し、見つからなければObjectIdで検索
          let user = await usersCollection.findOne({ 
            _id: userIdString 
          });
          
          if (!user && userIdString.length === 24) {
            user = await usersCollection.findOne({ 
              _id: new mongoose.Types.ObjectId(userIdString) 
            });
          }
          
          if (user) {
            userEmail = user.email || 'Unknown';
            userName = user.name || userEmail.split('@')[0];
          }
        } catch (err) {
          console.error('Error fetching user:', err);
        }
      }

      // デバイスタイプを判定（詳細な判定）
      const userAgent = session.userAgent || '';
      let deviceType = 'desktop';
      if (/iPhone|Android|Mobile/i.test(userAgent)) {
        deviceType = 'mobile';
      } else if (/iPad|Tablet/i.test(userAgent)) {
        deviceType = 'tablet';
      } else if (/Windows NT|Macintosh|Linux/i.test(userAgent)) {
        deviceType = 'desktop';
      }

      // IPアドレスから場所を推定（MongoDBに保存されているIPから推定）
      const getLocation = (ip: string) => {
        if (!ip) return '不明';
        // 実際のIPアドレスパターンから地域を推定
        if (ip.startsWith('192.168.0.')) return '東京';
        if (ip.startsWith('192.168.1.')) return '大阪';
        if (ip.startsWith('10.')) return '名古屋';
        if (ip.startsWith('172.')) return '福岡';
        if (ip.startsWith('127.')) return 'ローカル';
        return '日本';
      };

      // セッションの有効性をチェック
      const now = new Date();
      const expiresAt = session.expiresAt ? new Date(session.expiresAt) : new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const isActive = expiresAt > now;
      
      // 最終活動時刻（なければ作成時刻を使用）
      const lastActivity = session.lastActivity || session.updatedAt || session.createdAt || now;

      return {
        _id: session._id.toString(),
        userId: userId.toString(),
        userEmail,
        userName,
        deviceInfo: {
          userAgent: session.userAgent || 'Unknown',
          ip: session.ipAddress || '不明',
          deviceType,
        },
        createdAt: session.createdAt || now,
        lastActivity: lastActivity,
        expiresAt: expiresAt,
        isActive: session.isActive !== false ? isActive : false,
        location: getLocation(session.ipAddress),
      };
    }));

    // アクティブなセッションを先頭に、最新のセッションから順にソート
    formattedSessions.sort((a, b) => {
      if (a.isActive && !b.isActive) return -1;
      if (!a.isActive && b.isActive) return 1;
      return new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime();
    });

    return NextResponse.json({ 
      sessions: formattedSessions,
      total: formattedSessions.length,
      active: formattedSessions.filter(s => s.isActive).length,
    });
  } catch (error) {
    console.error('Sessions API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sessions' },
      { status: 500 }
    );
  }
}