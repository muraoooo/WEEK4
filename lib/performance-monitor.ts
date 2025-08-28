/**
 * パフォーマンス監視システム
 * リアルタイムメトリクス収集 + アラート + レポート生成
 */

import { cacheAdvanced } from '@/lib/cache-advanced';

interface PerformanceMetric {
  timestamp: Date;
  endpoint: string;
  method: string;
  responseTime: number;
  statusCode: number;
  userAgent?: string;
  ip?: string;
  memoryUsage: NodeJS.MemoryUsage;
  cpuUsage?: number;
  dbResponseTime?: number;
  cacheHit: boolean;
  errorMessage?: string;
}

interface SystemHealth {
  status: 'healthy' | 'warning' | 'critical';
  score: number;
  metrics: {
    avgResponseTime: number;
    errorRate: number;
    cacheHitRate: number;
    memoryUsage: number;
    cpuUsage: number;
    dbHealth: 'good' | 'slow' | 'error';
  };
  alerts: Alert[];
  recommendations: string[];
}

interface Alert {
  id: string;
  type: 'performance' | 'error' | 'security' | 'resource';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: Date;
  resolved: boolean;
  resolvedAt?: Date;
  metadata: any;
}

interface TrendAnalysis {
  endpoint: string;
  trend: 'improving' | 'stable' | 'degrading';
  changePercent: number;
  recommendation: string;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private alerts: Alert[] = [];
  private thresholds = {
    responseTime: {
      warning: 1000,   // 1秒
      critical: 3000   // 3秒
    },
    errorRate: {
      warning: 0.05,   // 5%
      critical: 0.15   // 15%
    },
    memoryUsage: {
      warning: 0.80,   // 80%
      critical: 0.95   // 95%
    },
    cacheHitRate: {
      warning: 0.70,   // 70%未満
      critical: 0.50   // 50%未満
    }
  };

  /**
   * パフォーマンスメトリクスを記録
   */
  async recordMetric(
    endpoint: string,
    method: string,
    responseTime: number,
    statusCode: number,
    options: {
      userAgent?: string;
      ip?: string;
      dbResponseTime?: number;
      cacheHit?: boolean;
      errorMessage?: string;
    } = {}
  ): Promise<void> {
    const metric: PerformanceMetric = {
      timestamp: new Date(),
      endpoint,
      method,
      responseTime,
      statusCode,
      userAgent: options.userAgent,
      ip: options.ip,
      memoryUsage: process.memoryUsage(),
      dbResponseTime: options.dbResponseTime,
      cacheHit: options.cacheHit || false,
      errorMessage: options.errorMessage
    };

    this.metrics.push(metric);

    // メトリクス配列のサイズ制限
    if (this.metrics.length > 50000) {
      this.metrics = this.metrics.slice(-25000);
    }

    // リアルタイムアラートチェック
    await this.checkRealTimeAlerts(metric);

    // メトリクスをキャッシュにも保存（永続化用）
    const cacheKey = `perf_metric_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    await cacheAdvanced.set(cacheKey, metric, 7 * 24 * 60 * 60 * 1000); // 7日間
  }

  /**
   * システム健全性を評価
   */
  async evaluateSystemHealth(): Promise<SystemHealth> {
    const recentMetrics = this.getRecentMetrics(5 * 60 * 1000); // 過去5分

    if (recentMetrics.length === 0) {
      return {
        status: 'warning',
        score: 50,
        metrics: {
          avgResponseTime: 0,
          errorRate: 0,
          cacheHitRate: 0,
          memoryUsage: 0,
          cpuUsage: 0,
          dbHealth: 'good'
        },
        alerts: [],
        recommendations: ['No recent data available']
      };
    }

    // メトリクス計算
    const avgResponseTime = recentMetrics.reduce((sum, m) => sum + m.responseTime, 0) / recentMetrics.length;
    const errorCount = recentMetrics.filter(m => m.statusCode >= 400).length;
    const errorRate = errorCount / recentMetrics.length;
    const cacheHits = recentMetrics.filter(m => m.cacheHit).length;
    const cacheHitRate = cacheHits / recentMetrics.length;

    const latestMemory = recentMetrics[recentMetrics.length - 1].memoryUsage;
    const memoryUsagePercent = latestMemory.used / latestMemory.rss;

    const dbResponseTimes = recentMetrics
      .filter(m => m.dbResponseTime !== undefined)
      .map(m => m.dbResponseTime!);
    const avgDbResponseTime = dbResponseTimes.length > 0 
      ? dbResponseTimes.reduce((sum, time) => sum + time, 0) / dbResponseTimes.length 
      : 0;

    let dbHealth: 'good' | 'slow' | 'error' = 'good';
    if (avgDbResponseTime > 2000) dbHealth = 'error';
    else if (avgDbResponseTime > 500) dbHealth = 'slow';

    // スコア計算
    let score = 100;
    if (avgResponseTime > this.thresholds.responseTime.critical) score -= 30;
    else if (avgResponseTime > this.thresholds.responseTime.warning) score -= 15;

    if (errorRate > this.thresholds.errorRate.critical) score -= 25;
    else if (errorRate > this.thresholds.errorRate.warning) score -= 10;

    if (cacheHitRate < this.thresholds.cacheHitRate.critical) score -= 20;
    else if (cacheHitRate < this.thresholds.cacheHitRate.warning) score -= 10;

    if (memoryUsagePercent > this.thresholds.memoryUsage.critical) score -= 25;
    else if (memoryUsagePercent > this.thresholds.memoryUsage.warning) score -= 15;

    // ステータス決定
    let status: 'healthy' | 'warning' | 'critical';
    if (score >= 80) status = 'healthy';
    else if (score >= 60) status = 'warning';
    else status = 'critical';

    // 推奨事項生成
    const recommendations = this.generateRecommendations({
      avgResponseTime,
      errorRate,
      cacheHitRate,
      memoryUsagePercent,
      dbHealth
    });

    return {
      status,
      score: Math.max(0, score),
      metrics: {
        avgResponseTime: Math.round(avgResponseTime),
        errorRate: Math.round(errorRate * 100) / 100,
        cacheHitRate: Math.round(cacheHitRate * 100) / 100,
        memoryUsage: Math.round(memoryUsagePercent * 100) / 100,
        cpuUsage: 0, // CPU使用率は今回は簡易実装
        dbHealth
      },
      alerts: this.getActiveAlerts(),
      recommendations
    };
  }

  /**
   * エンドポイント別パフォーマンス分析
   */
  getEndpointAnalysis(timeRangeMs: number = 60 * 60 * 1000): Array<{
    endpoint: string;
    method: string;
    requestCount: number;
    avgResponseTime: number;
    errorRate: number;
    slowestRequest: number;
    p95ResponseTime: number;
    trend: TrendAnalysis;
  }> {
    const recentMetrics = this.getRecentMetrics(timeRangeMs);
    const endpointGroups = new Map<string, PerformanceMetric[]>();

    // エンドポイント別にグループ化
    recentMetrics.forEach(metric => {
      const key = `${metric.method} ${metric.endpoint}`;
      if (!endpointGroups.has(key)) {
        endpointGroups.set(key, []);
      }
      endpointGroups.get(key)!.push(metric);
    });

    const analysis = [];

    for (const [endpointKey, metrics] of endpointGroups.entries()) {
      const [method, endpoint] = endpointKey.split(' ', 2);
      
      const requestCount = metrics.length;
      const avgResponseTime = metrics.reduce((sum, m) => sum + m.responseTime, 0) / requestCount;
      const errorCount = metrics.filter(m => m.statusCode >= 400).length;
      const errorRate = errorCount / requestCount;
      const slowestRequest = Math.max(...metrics.map(m => m.responseTime));

      // P95レスポンス時間計算
      const sortedResponseTimes = metrics.map(m => m.responseTime).sort((a, b) => a - b);
      const p95Index = Math.ceil(sortedResponseTimes.length * 0.95) - 1;
      const p95ResponseTime = sortedResponseTimes[p95Index] || 0;

      // トレンド分析
      const trend = this.analyzeTrend(endpoint, method);

      analysis.push({
        endpoint,
        method,
        requestCount,
        avgResponseTime: Math.round(avgResponseTime),
        errorRate: Math.round(errorRate * 100) / 100,
        slowestRequest,
        p95ResponseTime,
        trend
      });
    }

    return analysis.sort((a, b) => b.requestCount - a.requestCount);
  }

  /**
   * リアルタイムアラートチェック
   */
  private async checkRealTimeAlerts(metric: PerformanceMetric): Promise<void> {
    const alertChecks = [
      {
        condition: metric.responseTime > this.thresholds.responseTime.critical,
        type: 'performance' as const,
        severity: 'critical' as const,
        message: `Critical response time: ${metric.responseTime}ms on ${metric.endpoint}`
      },
      {
        condition: metric.responseTime > this.thresholds.responseTime.warning,
        type: 'performance' as const,
        severity: 'medium' as const,
        message: `Slow response time: ${metric.responseTime}ms on ${metric.endpoint}`
      },
      {
        condition: metric.statusCode >= 500,
        type: 'error' as const,
        severity: 'high' as const,
        message: `Server error ${metric.statusCode} on ${metric.endpoint}`
      },
      {
        condition: (metric.memoryUsage.used / metric.memoryUsage.rss) > this.thresholds.memoryUsage.critical,
        type: 'resource' as const,
        severity: 'critical' as const,
        message: `Critical memory usage: ${Math.round((metric.memoryUsage.used / metric.memoryUsage.rss) * 100)}%`
      }
    ];

    for (const check of alertChecks) {
      if (check.condition) {
        await this.createAlert(check.type, check.severity, check.message, {
          endpoint: metric.endpoint,
          method: metric.method,
          timestamp: metric.timestamp,
          metric
        });
      }
    }
  }

  /**
   * アラートを作成
   */
  private async createAlert(
    type: Alert['type'],
    severity: Alert['severity'],
    message: string,
    metadata: any
  ): Promise<void> {
    // 重複アラートをチェック（同じメッセージは5分間に1回のみ）
    const recentSimilarAlert = this.alerts.find(alert => 
      alert.message === message && 
      !alert.resolved && 
      (Date.now() - alert.timestamp.getTime()) < 5 * 60 * 1000
    );

    if (recentSimilarAlert) {
      return; // 重複アラートはスキップ
    }

    const alert: Alert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      type,
      severity,
      message,
      timestamp: new Date(),
      resolved: false,
      metadata
    };

    this.alerts.push(alert);

    // アラート配列のサイズ制限
    if (this.alerts.length > 10000) {
      this.alerts = this.alerts.slice(-5000);
    }

    // 重要なアラートはログ出力
    if (['high', 'critical'].includes(severity)) {
      console.error(`🚨 ${severity.toUpperCase()} ALERT: ${message}`, metadata);
    }

    // アラートをキャッシュにも保存
    const cacheKey = `alert_${alert.id}`;
    await cacheAdvanced.set(cacheKey, alert, 24 * 60 * 60 * 1000); // 24時間
  }

  /**
   * 推奨事項を生成
   */
  private generateRecommendations(metrics: {
    avgResponseTime: number;
    errorRate: number;
    cacheHitRate: number;
    memoryUsagePercent: number;
    dbHealth: string;
  }): string[] {
    const recommendations = [];

    if (metrics.avgResponseTime > this.thresholds.responseTime.warning) {
      recommendations.push('Consider optimizing slow endpoints or adding more indexes');
    }

    if (metrics.errorRate > this.thresholds.errorRate.warning) {
      recommendations.push('Review error logs and implement better error handling');
    }

    if (metrics.cacheHitRate < this.thresholds.cacheHitRate.warning) {
      recommendations.push('Optimize caching strategy and increase cache TTL');
    }

    if (metrics.memoryUsagePercent > this.thresholds.memoryUsage.warning) {
      recommendations.push('Monitor memory leaks and consider increasing server resources');
    }

    if (metrics.dbHealth === 'slow') {
      recommendations.push('Optimize database queries and consider adding indexes');
    } else if (metrics.dbHealth === 'error') {
      recommendations.push('Check database connection and query performance immediately');
    }

    return recommendations;
  }

  /**
   * 最近のメトリクスを取得
   */
  private getRecentMetrics(timeRangeMs: number): PerformanceMetric[] {
    const cutoff = Date.now() - timeRangeMs;
    return this.metrics.filter(m => m.timestamp.getTime() > cutoff);
  }

  /**
   * トレンド分析
   */
  private analyzeTrend(endpoint: string, method: string): TrendAnalysis {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;
    const twoHoursAgo = now - 2 * 60 * 60 * 1000;

    const recentMetrics = this.metrics.filter(m => 
      m.endpoint === endpoint && 
      m.method === method && 
      m.timestamp.getTime() > oneHourAgo
    );

    const previousMetrics = this.metrics.filter(m => 
      m.endpoint === endpoint && 
      m.method === method && 
      m.timestamp.getTime() > twoHoursAgo &&
      m.timestamp.getTime() <= oneHourAgo
    );

    if (recentMetrics.length === 0 || previousMetrics.length === 0) {
      return {
        endpoint,
        trend: 'stable',
        changePercent: 0,
        recommendation: 'Insufficient data for trend analysis'
      };
    }

    const recentAvg = recentMetrics.reduce((sum, m) => sum + m.responseTime, 0) / recentMetrics.length;
    const previousAvg = previousMetrics.reduce((sum, m) => sum + m.responseTime, 0) / previousMetrics.length;

    const changePercent = ((recentAvg - previousAvg) / previousAvg) * 100;

    let trend: 'improving' | 'stable' | 'degrading';
    let recommendation: string;

    if (changePercent > 20) {
      trend = 'degrading';
      recommendation = 'Performance is degrading, investigate immediately';
    } else if (changePercent < -20) {
      trend = 'improving';
      recommendation = 'Performance is improving, good work!';
    } else {
      trend = 'stable';
      recommendation = 'Performance is stable';
    }

    return {
      endpoint,
      trend,
      changePercent: Math.round(changePercent * 100) / 100,
      recommendation
    };
  }

  /**
   * アクティブなアラートを取得
   */
  private getActiveAlerts(): Alert[] {
    return this.alerts.filter(alert => !alert.resolved);
  }

  /**
   * アラートを解決
   */
  async resolveAlert(alertId: string): Promise<boolean> {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert && !alert.resolved) {
      alert.resolved = true;
      alert.resolvedAt = new Date();
      
      // キャッシュも更新
      const cacheKey = `alert_${alertId}`;
      await cacheAdvanced.set(cacheKey, alert, 24 * 60 * 60 * 1000);
      
      return true;
    }
    return false;
  }

  /**
   * パフォーマンスレポートを生成
   */
  generateReport(timeRangeMs: number = 24 * 60 * 60 * 1000): {
    summary: {
      totalRequests: number;
      avgResponseTime: number;
      errorRate: number;
      uptime: number;
    };
    topEndpoints: Array<{
      endpoint: string;
      requests: number;
      avgResponseTime: number;
    }>;
    slowestEndpoints: Array<{
      endpoint: string;
      avgResponseTime: number;
    }>;
    errorSummary: Array<{
      statusCode: number;
      count: number;
      percentage: number;
    }>;
    hourlyMetrics: Array<{
      hour: string;
      requests: number;
      avgResponseTime: number;
      errors: number;
    }>;
  } {
    const metrics = this.getRecentMetrics(timeRangeMs);
    
    // 基本統計
    const totalRequests = metrics.length;
    const avgResponseTime = totalRequests > 0 
      ? metrics.reduce((sum, m) => sum + m.responseTime, 0) / totalRequests 
      : 0;
    const errorCount = metrics.filter(m => m.statusCode >= 400).length;
    const errorRate = totalRequests > 0 ? errorCount / totalRequests : 0;

    // エンドポイント別統計
    const endpointStats = new Map<string, {requests: number; responseTime: number}>();
    metrics.forEach(m => {
      const key = `${m.method} ${m.endpoint}`;
      if (!endpointStats.has(key)) {
        endpointStats.set(key, {requests: 0, responseTime: 0});
      }
      const stat = endpointStats.get(key)!;
      stat.requests++;
      stat.responseTime += m.responseTime;
    });

    const topEndpoints = Array.from(endpointStats.entries())
      .map(([endpoint, stat]) => ({
        endpoint,
        requests: stat.requests,
        avgResponseTime: Math.round(stat.responseTime / stat.requests)
      }))
      .sort((a, b) => b.requests - a.requests)
      .slice(0, 10);

    const slowestEndpoints = Array.from(endpointStats.entries())
      .map(([endpoint, stat]) => ({
        endpoint,
        avgResponseTime: Math.round(stat.responseTime / stat.requests)
      }))
      .sort((a, b) => b.avgResponseTime - a.avgResponseTime)
      .slice(0, 10);

    // エラー統計
    const errorStats = new Map<number, number>();
    metrics.forEach(m => {
      if (m.statusCode >= 400) {
        errorStats.set(m.statusCode, (errorStats.get(m.statusCode) || 0) + 1);
      }
    });

    const errorSummary = Array.from(errorStats.entries())
      .map(([statusCode, count]) => ({
        statusCode,
        count,
        percentage: Math.round((count / errorCount) * 100) / 100
      }))
      .sort((a, b) => b.count - a.count);

    // 時間別メトリクス
    const hourlyStats = new Map<string, {requests: number; responseTime: number; errors: number}>();
    metrics.forEach(m => {
      const hour = new Date(m.timestamp).toISOString().substring(0, 13);
      if (!hourlyStats.has(hour)) {
        hourlyStats.set(hour, {requests: 0, responseTime: 0, errors: 0});
      }
      const stat = hourlyStats.get(hour)!;
      stat.requests++;
      stat.responseTime += m.responseTime;
      if (m.statusCode >= 400) stat.errors++;
    });

    const hourlyMetrics = Array.from(hourlyStats.entries())
      .map(([hour, stat]) => ({
        hour,
        requests: stat.requests,
        avgResponseTime: Math.round(stat.responseTime / stat.requests),
        errors: stat.errors
      }))
      .sort((a, b) => a.hour.localeCompare(b.hour));

    return {
      summary: {
        totalRequests,
        avgResponseTime: Math.round(avgResponseTime),
        errorRate: Math.round(errorRate * 100) / 100,
        uptime: process.uptime()
      },
      topEndpoints,
      slowestEndpoints,
      errorSummary,
      hourlyMetrics
    };
  }
}

// シングルトンインスタンス
const performanceMonitor = new PerformanceMonitor();

export { performanceMonitor, PerformanceMonitor };
export type { PerformanceMetric, SystemHealth, Alert, TrendAnalysis };