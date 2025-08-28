import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

// メモリ内でアクティブユーザーを管理（本番環境ではRedis等を使用）
const activeUsers = new Map<string, any>();
const userLastActivity = new Map<string, number>();

// IPアドレスの匿名化
function anonymizeIp(ip: string): string {
  if (!ip) return 'unknown';
  
  // IPv4の場合、最後のオクテットを0に置換
  const ipParts = ip.split('.');
  if (ipParts.length === 4) {
    ipParts[3] = '0';
    ip = ipParts.join('.');
  }
  
  // SHA-256でハッシュ化
  return crypto.createHash('sha256').update(ip).digest('hex').substring(0, 16);
}

// デバイスタイプの検出
function getDeviceType(userAgent: string): string {
  const ua = userAgent.toLowerCase();
  
  if (/mobile|android|iphone/i.test(ua) && !/tablet|ipad/i.test(ua)) {
    return 'mobile';
  }
  if (/tablet|ipad/i.test(ua)) {
    return 'tablet';
  }
  if (/windows|mac|linux|x11/i.test(ua)) {
    return 'desktop';
  }
  
  return 'unknown';
}

// ブラウザタイプの検出
function getBrowserType(userAgent: string): string {
  const ua = userAgent.toLowerCase();
  
  if (ua.includes('edg/')) return 'Edge';
  if (ua.includes('chrome')) return 'Chrome';
  if (ua.includes('firefox')) return 'Firefox';
  if (ua.includes('safari') && !ua.includes('chrome')) return 'Safari';
  
  return 'Other';
}

// ページURLのサニタイズ
function sanitizePage(page: string): string {
  // UUIDパターンを除去
  let sanitized = page.replace(
    /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
    '[id]'
  );
  
  // 長い数字列を除去
  sanitized = sanitized.replace(/\/\d{5,}/g, '/[id]');
  
  // メールアドレスを除去
  sanitized = sanitized.replace(
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    '[email]'
  );
  
  // クエリパラメータを除去
  const urlParts = sanitized.split('?');
  sanitized = urlParts[0];
  
  return sanitized;
}

// オフラインユーザーのクリーンアップ
function cleanupOfflineUsers() {
  const now = Date.now();
  const offlineThreshold = 60000; // 60秒
  
  for (const [userId, lastActivity] of userLastActivity.entries()) {
    if (now - lastActivity > offlineThreshold) {
      const user = activeUsers.get(userId);
      if (user) {
        user.isOnline = false;
      }
      // 5分以上経過したユーザーは完全に削除
      if (now - lastActivity > 300000) {
        activeUsers.delete(userId);
        userLastActivity.delete(userId);
      }
    }
  }
}

// GET: アクティブユーザーリストの取得
export async function GET(request: NextRequest) {
  try {
    // オフラインユーザーのクリーンアップ
    cleanupOfflineUsers();
    
    // アクティブユーザーのリストを作成
    const users = Array.from(activeUsers.values()).map(user => ({
      id: user.id,
      currentPage: user.currentPage,
      deviceType: user.deviceType,
      browserType: user.browserType,
      lastActivity: user.lastActivity,
      joinedAt: user.joinedAt,
      isOnline: user.isOnline,
    }));
    
    // 統計情報
    const statistics = {
      total: users.length,
      online: users.filter(u => u.isOnline).length,
      desktop: users.filter(u => u.deviceType === 'desktop').length,
      mobile: users.filter(u => u.deviceType === 'mobile').length,
      tablet: users.filter(u => u.deviceType === 'tablet').length,
      pages: {} as Record<string, number>,
    };
    
    // ページ別統計
    users.forEach(user => {
      if (user.isOnline) {
        statistics.pages[user.currentPage] = (statistics.pages[user.currentPage] || 0) + 1;
      }
    });
    
    return NextResponse.json({
      users,
      statistics,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error('Active users fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch active users' },
      { status: 500 }
    );
  }
}

// POST: ユーザーアクティビティの更新
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, userId, page, sessionId } = body;
    
    // IPアドレスとUser-Agentの取得
    const forwardedFor = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const ip = forwardedFor?.split(',')[0] || realIp || 'unknown';
    const userAgent = request.headers.get('user-agent') || '';
    
    // ユーザーIDの生成または取得
    let userIdToUse = userId;
    if (!userIdToUse) {
      const anonymizedIp = anonymizeIp(ip);
      const timestamp = Date.now();
      userIdToUse = `user-${crypto.createHash('sha256')
        .update(`${anonymizedIp}-${userAgent}-${timestamp}`)
        .digest('hex')
        .substring(0, 8)}`;
    }
    
    const now = new Date();
    
    switch (type) {
      case 'connect':
      case 'heartbeat':
        // ユーザー情報の更新または作成
        const existingUser = activeUsers.get(userIdToUse);
        const user = existingUser || {
          id: userIdToUse,
          sessionId: sessionId || crypto.randomBytes(16).toString('hex'),
          joinedAt: existingUser?.joinedAt || now,
        };
        
        // 情報を更新
        user.currentPage = page ? sanitizePage(page) : user.currentPage || '/';
        user.deviceType = getDeviceType(userAgent);
        user.browserType = getBrowserType(userAgent);
        user.lastActivity = now;
        user.isOnline = true;
        
        activeUsers.set(userIdToUse, user);
        userLastActivity.set(userIdToUse, Date.now());
        
        return NextResponse.json({
          success: true,
          userId: userIdToUse,
          sessionId: user.sessionId,
        });
      
      case 'disconnect':
        const disconnectUser = activeUsers.get(userIdToUse);
        if (disconnectUser) {
          disconnectUser.isOnline = false;
          disconnectUser.lastActivity = now;
        }
        return NextResponse.json({ success: true });
      
      case 'page_change':
        const pageChangeUser = activeUsers.get(userIdToUse);
        if (pageChangeUser) {
          pageChangeUser.currentPage = sanitizePage(page || '/');
          pageChangeUser.lastActivity = now;
          userLastActivity.set(userIdToUse, Date.now());
        }
        return NextResponse.json({ success: true });
      
      default:
        return NextResponse.json(
          { error: 'Invalid activity type' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Activity update error:', error);
    return NextResponse.json(
      { error: 'Failed to update activity' },
      { status: 500 }
    );
  }
}

// DELETE: ユーザーの削除（管理用）
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    if (userId) {
      activeUsers.delete(userId);
      userLastActivity.delete(userId);
      return NextResponse.json({ success: true });
    }
    
    // すべてクリア
    activeUsers.clear();
    userLastActivity.clear();
    
    return NextResponse.json({ success: true, cleared: true });
  } catch (error) {
    console.error('User deletion error:', error);
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    );
  }
}