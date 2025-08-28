/**
 * パフォーマンス監視API
 * システム健全性、メトリクス、アラートの取得・管理
 */

import { NextRequest, NextResponse } from 'next/server';
import { performanceMonitor } from '@/lib/performance-monitor';
import { apiOptimizer } from '@/lib/api-optimizer';
import { cacheAdvanced } from '@/lib/cache-advanced';

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    // 管理者権限確認
    const isAdmin = request.headers.get('x-admin-secret') === process.env.ADMIN_SECRET_KEY;
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'health';
    const timeRange = parseInt(searchParams.get('timeRange') || '3600000'); // デフォルト1時間

    let responseData: any = {};

    switch (action) {
      case 'health':
        // システム健全性の評価
        responseData = await performanceMonitor.evaluateSystemHealth();
        break;

      case 'metrics':
        // 詳細メトリクスの取得
        const endpointAnalysis = performanceMonitor.getEndpointAnalysis(timeRange);
        const performanceReport = performanceMonitor.generateReport(timeRange);
        const apiStats = apiOptimizer.getPerformanceStats();
        const cacheStats = cacheAdvanced.getStats();
        
        responseData = {
          systemHealth: await performanceMonitor.evaluateSystemHealth(),
          endpoints: endpointAnalysis,
          report: performanceReport,
          api: apiStats,
          cache: cacheStats,
          system: {
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            nodeVersion: process.version,
            platform: process.platform,
            arch: process.arch
          }
        };
        break;

      case 'alerts':
        // アラート一覧の取得
        const systemHealth = await performanceMonitor.evaluateSystemHealth();
        responseData = {
          activeAlerts: systemHealth.alerts,
          alertSummary: {
            total: systemHealth.alerts.length,
            critical: systemHealth.alerts.filter(a => a.severity === 'critical').length,
            high: systemHealth.alerts.filter(a => a.severity === 'high').length,
            medium: systemHealth.alerts.filter(a => a.severity === 'medium').length,
            low: systemHealth.alerts.filter(a => a.severity === 'low').length
          }
        };
        break;

      case 'trends':
        // トレンド分析
        const analysis = performanceMonitor.getEndpointAnalysis(timeRange);
        const trendData = analysis.map(endpoint => ({
          endpoint: endpoint.endpoint,
          method: endpoint.method,
          trend: endpoint.trend,
          metrics: {
            requestCount: endpoint.requestCount,
            avgResponseTime: endpoint.avgResponseTime,
            errorRate: endpoint.errorRate,
            p95ResponseTime: endpoint.p95ResponseTime
          }
        }));
        
        responseData = {
          trends: trendData,
          summary: {
            improving: trendData.filter(t => t.trend.trend === 'improving').length,
            stable: trendData.filter(t => t.trend.trend === 'stable').length,
            degrading: trendData.filter(t => t.trend.trend === 'degrading').length
          }
        };
        break;

      case 'report':
        // 包括的なパフォーマンスレポート
        const fullReport = performanceMonitor.generateReport(timeRange);
        const healthData = await performanceMonitor.evaluateSystemHealth();
        
        responseData = {
          ...fullReport,
          health: healthData,
          generated: new Date().toISOString(),
          timeRange: {
            ms: timeRange,
            humanReadable: formatTimeRange(timeRange)
          }
        };
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid action parameter' },
          { status: 400 }
        );
    }

    // パフォーマンスメトリクスを記録
    const responseTime = Date.now() - startTime;
    await performanceMonitor.recordMetric(
      '/api/admin/performance',
      'GET',
      responseTime,
      200,
      {
        ip: getClientIP(request),
        userAgent: request.headers.get('user-agent') || undefined,
        cacheHit: false
      }
    );

    return NextResponse.json({
      ...responseData,
      metadata: {
        action,
        timeRange,
        responseTime,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Performance API error:', error);
    
    const responseTime = Date.now() - startTime;
    await performanceMonitor.recordMetric(
      '/api/admin/performance',
      'GET',
      responseTime,
      500,
      {
        ip: getClientIP(request),
        userAgent: request.headers.get('user-agent') || undefined,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        cacheHit: false
      }
    );

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST: アラート管理、設定更新
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // 管理者権限確認
    const isAdmin = request.headers.get('x-admin-secret') === process.env.ADMIN_SECRET_KEY;
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, data } = body;

    let result: any = {};

    switch (action) {
      case 'resolve_alert':
        // アラートを解決
        const { alertId } = data;
        const resolved = await performanceMonitor.resolveAlert(alertId);
        result = {
          success: resolved,
          message: resolved ? 'Alert resolved successfully' : 'Alert not found or already resolved'
        };
        break;

      case 'record_metric':
        // 手動メトリクス記録（テスト用）
        const { endpoint, method, responseTime, statusCode, options } = data;
        await performanceMonitor.recordMetric(endpoint, method, responseTime, statusCode, options);
        result = {
          success: true,
          message: 'Metric recorded successfully'
        };
        break;

      case 'clear_metrics':
        // メトリクスクリア（開発用）
        // 本来は実装しない方が良いが、デモ用として追加
        result = {
          success: true,
          message: 'This would clear metrics in production (not implemented for safety)'
        };
        break;

      case 'test_alert':
        // テストアラート生成
        await (performanceMonitor as any).createAlert(
          'performance',
          'medium',
          'Test alert generated from API',
          { testData: true, timestamp: new Date() }
        );
        result = {
          success: true,
          message: 'Test alert created successfully'
        };
        break;

      default:
        const errorResponseTime = Date.now() - startTime;
        await performanceMonitor.recordMetric(
          '/api/admin/performance',
          'POST',
          errorResponseTime,
          400,
          {
            ip: getClientIP(request),
            errorMessage: 'Invalid action',
            cacheHit: false
          }
        );

        return NextResponse.json(
          { error: 'Invalid action parameter' },
          { status: 400 }
        );
    }

    // パフォーマンスメトリクスを記録
    const responseTime = Date.now() - startTime;
    await performanceMonitor.recordMetric(
      '/api/admin/performance',
      'POST',
      responseTime,
      200,
      {
        ip: getClientIP(request),
        userAgent: request.headers.get('user-agent') || undefined,
        cacheHit: false
      }
    );

    return NextResponse.json({
      ...result,
      metadata: {
        action,
        responseTime,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Performance API POST error:', error);

    const responseTime = Date.now() - startTime;
    await performanceMonitor.recordMetric(
      '/api/admin/performance',
      'POST',
      responseTime,
      500,
      {
        ip: getClientIP(request),
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        cacheHit: false
      }
    );

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * 時間範囲を人間が読める形式にフォーマット
 */
function formatTimeRange(ms: number): string {
  const seconds = ms / 1000;
  const minutes = seconds / 60;
  const hours = minutes / 60;
  const days = hours / 24;

  if (days >= 1) {
    return `${Math.round(days)} day(s)`;
  } else if (hours >= 1) {
    return `${Math.round(hours)} hour(s)`;
  } else if (minutes >= 1) {
    return `${Math.round(minutes)} minute(s)`;
  } else {
    return `${Math.round(seconds)} second(s)`;
  }
}

/**
 * クライアントIPアドレス取得
 */
function getClientIP(request: NextRequest): string {
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