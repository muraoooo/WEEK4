import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import crypto from 'crypto';
import connectDatabase from '@/lib/database';
import AccessLog from '@/models/AccessLog';

// IPアドレスを匿名化（最後のオクテットを削除してハッシュ化）
function anonymizeIp(ip: string): string {
  if (!ip) return 'unknown';
  
  // IPv4の場合、最後のオクテットを0に置換
  const ipParts = ip.split('.');
  if (ipParts.length === 4) {
    ipParts[3] = '0';
    ip = ipParts.join('.');
  }
  
  // IPv6の場合、後半を削除
  if (ip.includes(':')) {
    const ipv6Parts = ip.split(':');
    if (ipv6Parts.length > 4) {
      ip = ipv6Parts.slice(0, 4).join(':') + '::';
    }
  }
  
  // SHA-256でハッシュ化
  return crypto.createHash('sha256').update(ip).digest('hex').substring(0, 16);
}

// User-Agentからデバイスタイプを判定
function getDeviceType(userAgent: string): string {
  const ua = userAgent.toLowerCase();
  
  if (/mobile|android|iphone/i.test(ua)) {
    if (/tablet|ipad/i.test(ua)) {
      return 'tablet';
    }
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

// User-Agentからブラウザタイプを判定
function getBrowserType(userAgent: string): string {
  const ua = userAgent.toLowerCase();
  
  if (ua.includes('edg/')) return 'Edge';
  if (ua.includes('chrome')) return 'Chrome';
  if (ua.includes('firefox')) return 'Firefox';
  if (ua.includes('safari') && !ua.includes('chrome')) return 'Safari';
  
  return 'Other';
}

// User-AgentからOSタイプを判定
function getOsType(userAgent: string): string {
  const ua = userAgent.toLowerCase();
  
  if (ua.includes('windows')) return 'Windows';
  if (ua.includes('mac')) return 'Mac';
  if (ua.includes('linux')) return 'Linux';
  if (ua.includes('iphone') || ua.includes('ipad')) return 'iOS';
  if (ua.includes('android')) return 'Android';
  
  return 'Other';
}

// 画面解像度のカテゴリを判定
function getScreenCategory(width: number | undefined): string {
  if (!width) return 'Unknown';
  
  if (width < 768) return 'Small';
  if (width < 1024) return 'Medium';
  if (width < 1920) return 'Large';
  return 'XLarge';
}

// リファラーからドメインのみを抽出
function getReferrerDomain(referrer: string | null): string {
  if (!referrer || referrer === '') return 'direct';
  
  try {
    const url = new URL(referrer);
    return url.hostname;
  } catch {
    return 'invalid';
  }
}

// POST: アクセスログを記録
export async function POST(request: NextRequest) {
  try {
    await connectDatabase();
    
    const headersList = await headers();
    const body = await request.json().catch(() => ({}));
    
    // IPアドレスの取得と匿名化
    const forwardedFor = headersList.get('x-forwarded-for');
    const realIp = headersList.get('x-real-ip');
    const ip = forwardedFor?.split(',')[0] || realIp || 'unknown';
    const anonymizedIp = anonymizeIp(ip);
    
    // User-Agentの解析
    const userAgent = headersList.get('user-agent') || '';
    const deviceType = getDeviceType(userAgent);
    const browserType = getBrowserType(userAgent);
    const osType = getOsType(userAgent);
    
    // リファラーの処理
    const referrer = headersList.get('referer');
    const referrerDomain = getReferrerDomain(referrer);
    
    // タイムスタンプの処理（分単位で丸める）
    const now = new Date();
    now.setSeconds(0, 0);
    
    // アクセスログの作成
    const accessLog = new AccessLog({
      anonymizedIp,
      pagePath: body.pagePath || '/',
      deviceType,
      browserType,
      osType,
      screenCategory: getScreenCategory(body.screenWidth),
      referrerDomain,
      hourOfDay: now.getHours(),
      dayOfWeek: now.getDay(),
      sessionDuration: Math.round((body.sessionDuration || 0) / 300) * 300, // 5分単位で丸める
      pageLoadTime: Math.round((body.pageLoadTime || 0) / 100) * 100, // 100ms単位で丸める
      timestamp: now,
      countryCode: 'JP', // 実際のプロダクションではIPジオロケーションサービスを使用
    });
    
    await accessLog.save();
    
    // レスポンスにトラッキングIDは含めない（プライバシー保護）
    return NextResponse.json(
      { success: true },
      { 
        status: 200,
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    );
  } catch (error) {
    console.error('Analytics tracking error:', error);
    // エラーの詳細は返さない（情報漏洩防止）
    return NextResponse.json(
      { success: false },
      { status: 500 }
    );
  }
}

// GET: アクセス統計を取得
export async function GET(request: NextRequest) {
  try {
    await connectDatabase();
    
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'day'; // day, week, month
    
    // 期間の計算
    const now = new Date();
    const startDate = new Date();
    
    switch (period) {
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      default: // day
        startDate.setDate(now.getDate() - 1);
    }
    
    // 各種統計の取得
    const [hourlyStats, deviceStats, topPages, referrerStats] = await Promise.all([
      (AccessLog as any).getHourlyStats?.(startDate, now) || [],
      (AccessLog as any).getDeviceStats?.(startDate, now) || [],
      (AccessLog as any).getTopPages?.(10, startDate, now) || [],
      (AccessLog as any).getReferrerStats?.(startDate, now) || [],
    ]);
    
    // 全体統計の計算
    const totalPageViews = await AccessLog.countDocuments({
      timestamp: { $gte: startDate, $lte: now },
    });
    
    const uniqueVisitors = await AccessLog.distinct('anonymizedIp', {
      timestamp: { $gte: startDate, $lte: now },
    });
    
    // 平均セッション時間の計算
    const avgSessionDuration = await AccessLog.aggregate([
      {
        $match: {
          timestamp: { $gte: startDate, $lte: now },
          sessionDuration: { $gt: 0 },
        },
      },
      {
        $group: {
          _id: null,
          avgDuration: { $avg: '$sessionDuration' },
        },
      },
    ]);
    
    return NextResponse.json({
      period,
      startDate,
      endDate: now,
      summary: {
        totalPageViews,
        uniqueVisitors: uniqueVisitors.length,
        avgSessionDuration: avgSessionDuration[0]?.avgDuration || 0,
        bounceRate: 0, // 実装は省略（1ページのみ閲覧したセッションの割合）
      },
      hourlyStats,
      deviceStats,
      topPages,
      referrerStats,
    });
  } catch (error) {
    console.error('Analytics fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}