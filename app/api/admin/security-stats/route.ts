/**
 * セキュリティ統計API
 * セキュリティイベント、レート制限、ブロック統計の取得
 */

import { NextRequest, NextResponse } from 'next/server';
import { securityMiddleware } from '@/lib/security-middleware';
import { cacheAdvanced } from '@/lib/cache-advanced';

export async function GET(request: NextRequest) {
  try {
    // 管理者権限確認
    const isAdmin = request.headers.get('x-admin-secret') === process.env.ADMIN_SECRET_KEY;
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // セキュリティ統計を取得
    const securityStats = securityMiddleware.getSecurityStats();
    
    // キャッシュ統計を取得
    const cacheStats = cacheAdvanced.getStats();
    
    // システム健全性チェック
    const cacheHealth = cacheAdvanced.healthCheck();

    // 追加のセキュリティメトリクス
    const additionalMetrics = await getAdditionalSecurityMetrics();

    const response = {
      timestamp: new Date().toISOString(),
      security: {
        ...securityStats,
        systemHealth: calculateSecurityHealth(securityStats),
        threatLevel: calculateThreatLevel(securityStats)
      },
      cache: {
        ...cacheStats,
        health: cacheHealth
      },
      system: additionalMetrics
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Security stats API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * 追加のセキュリティメトリクスを取得
 */
async function getAdditionalSecurityMetrics() {
  try {
    // アクティブなブルートフォース攻撃者数
    const activeBruteForceAttacks = await countActivePatterns('brute_force:*');
    
    // レート制限中のIP数
    const rateLimitedIPs = await countActivePatterns('rate_limit:*');
    
    // 信頼度の低いIP数
    const lowTrustIPs = await countLowTrustIPs();
    
    // 最近の攻撃パターン
    const recentAttackPatterns = await getRecentAttackPatterns();

    return {
      activeBruteForceAttacks,
      rateLimitedIPs,
      lowTrustIPs,
      recentAttackPatterns,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      nodeVersion: process.version
    };

  } catch (error) {
    console.error('Additional metrics calculation error:', error);
    return {
      activeBruteForceAttacks: 0,
      rateLimitedIPs: 0,
      lowTrustIPs: 0,
      recentAttackPatterns: [],
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      nodeVersion: process.version
    };
  }
}

/**
 * パターンに一致するアクティブキーの数を取得
 */
async function countActivePatterns(pattern: string): Promise<number> {
  // 簡易実装: 実際の実装ではキャッシュストアのキー一覧を取得
  return 0; // キャッシュシステムがパターンマッチング未対応のため
}

/**
 * 信頼度の低いIP数を取得
 */
async function countLowTrustIPs(): Promise<number> {
  // 簡易実装: 実際の実装では信頼度スコアが低いIPを検索
  return 0;
}

/**
 * 最近の攻撃パターンを取得
 */
async function getRecentAttackPatterns(): Promise<Array<{
  pattern: string;
  count: number;
  firstSeen: Date;
  lastSeen: Date;
}>> {
  // 簡易実装: 実際の実装では攻撃パターンを分析
  return [];
}

/**
 * セキュリティ健全性スコアを計算
 */
function calculateSecurityHealth(stats: any): {
  score: number;
  status: 'healthy' | 'warning' | 'critical';
  issues: string[];
} {
  const issues = [];
  let score = 100;

  // イベント数による評価
  if (stats.eventsByType?.RATE_LIMIT_EXCEEDED > 1000) {
    issues.push('High rate limit violations');
    score -= 20;
  }

  if (stats.eventsByType?.BRUTE_FORCE > 100) {
    issues.push('Multiple brute force attempts');
    score -= 30;
  }

  if (stats.eventsByType?.BLOCKED_IP > 50) {
    issues.push('Many IP blocks');
    score -= 15;
  }

  if (stats.topOffendingIPs?.length > 10) {
    issues.push('High number of offending IPs');
    score -= 10;
  }

  // 健全性ステータスを決定
  let status: 'healthy' | 'warning' | 'critical';
  if (score >= 80) status = 'healthy';
  else if (score >= 60) status = 'warning';
  else status = 'critical';

  return { score: Math.max(0, score), status, issues };
}

/**
 * 脅威レベルを計算
 */
function calculateThreatLevel(stats: any): {
  level: 'low' | 'medium' | 'high' | 'critical';
  score: number;
  factors: string[];
} {
  const factors = [];
  let score = 0;

  // 脅威指標の評価
  const recentEvents = stats.recentEvents || [];
  const criticalEvents = recentEvents.filter((event: any) => 
    ['BRUTE_FORCE', 'BLOCKED_IP', 'SUSPICIOUS_PATTERN'].includes(event.eventType)
  );

  if (criticalEvents.length > 10) {
    factors.push('High critical event volume');
    score += 30;
  }

  if (stats.eventsByType?.BRUTE_FORCE > 20) {
    factors.push('Active brute force attacks');
    score += 40;
  }

  if (stats.topOffendingIPs?.some((ip: any) => ip.count > 100)) {
    factors.push('Persistent attackers detected');
    score += 25;
  }

  // レベル決定
  let level: 'low' | 'medium' | 'high' | 'critical';
  if (score <= 20) level = 'low';
  else if (score <= 50) level = 'medium';
  else if (score <= 80) level = 'high';
  else level = 'critical';

  return { level, score, factors };
}

// POST: セキュリティ設定の更新
export async function POST(request: NextRequest) {
  try {
    // 管理者権限確認
    const isAdmin = request.headers.get('x-admin-secret') === process.env.ADMIN_SECRET_KEY;
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, config } = body;

    switch (action) {
      case 'update_config':
        securityMiddleware.updateConfig(config);
        break;
        
      case 'block_ip':
        // IP をブロックリストに追加
        if (config.ip) {
          securityMiddleware.updateConfig({
            blockedIPs: [...(securityMiddleware as any).config.blockedIPs, config.ip]
          });
        }
        break;
        
      case 'unblock_ip':
        // IP をブロックリストから削除
        if (config.ip) {
          securityMiddleware.updateConfig({
            blockedIPs: (securityMiddleware as any).config.blockedIPs.filter((ip: string) => ip !== config.ip)
          });
        }
        break;
        
      case 'clear_cache':
        // セキュリティ関連キャッシュをクリア
        await cacheAdvanced.deletePattern(/^(rate_limit|brute_force|trust_score):/);
        break;
        
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    return NextResponse.json({ 
      success: true, 
      message: `Action '${action}' completed successfully`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Security config update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}