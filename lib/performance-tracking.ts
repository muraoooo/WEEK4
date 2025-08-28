/**
 * パフォーマンス追跡ミドルウェア
 * すべてのAPI リクエストを自動的に監視
 */

import { NextRequest, NextResponse } from 'next/server';
import { performanceMonitor } from '@/lib/performance-monitor';

interface RequestTracking {
  startTime: number;
  endpoint: string;
  method: string;
  ip: string;
  userAgent: string;
}

class PerformanceTracker {
  private activeRequests = new Map<string, RequestTracking>();

  /**
   * リクエスト開始時に呼び出し
   */
  async startTracking(request: NextRequest): Promise<string> {
    const requestId = this.generateRequestId();
    const tracking: RequestTracking = {
      startTime: Date.now(),
      endpoint: request.nextUrl.pathname,
      method: request.method,
      ip: this.getClientIP(request),
      userAgent: request.headers.get('user-agent') || 'unknown'
    };

    this.activeRequests.set(requestId, tracking);
    
    // アクティブリクエスト数の制限
    if (this.activeRequests.size > 10000) {
      const oldestEntries = Array.from(this.activeRequests.entries())
        .sort(([, a], [, b]) => a.startTime - b.startTime)
        .slice(0, 5000);
      
      oldestEntries.forEach(([id]) => this.activeRequests.delete(id));
    }

    return requestId;
  }

  /**
   * リクエスト完了時に呼び出し
   */
  async endTracking(
    requestId: string, 
    response: NextResponse,
    options: {
      dbResponseTime?: number;
      cacheHit?: boolean;
      errorMessage?: string;
    } = {}
  ): Promise<void> {
    const tracking = this.activeRequests.get(requestId);
    if (!tracking) {
      return; // トラッキングが見つからない場合は何もしない
    }

    const responseTime = Date.now() - tracking.startTime;
    const statusCode = response.status;

    // パフォーマンスメトリクスを記録
    await performanceMonitor.recordMetric(
      tracking.endpoint,
      tracking.method,
      responseTime,
      statusCode,
      {
        ip: tracking.ip,
        userAgent: tracking.userAgent,
        dbResponseTime: options.dbResponseTime,
        cacheHit: options.cacheHit,
        errorMessage: options.errorMessage
      }
    );

    // レスポンスヘッダーに追加情報を設定
    response.headers.set('X-Response-Time', `${responseTime}ms`);
    response.headers.set('X-Request-ID', requestId);
    
    if (options.cacheHit !== undefined) {
      response.headers.set('X-Cache-Status', options.cacheHit ? 'HIT' : 'MISS');
    }

    // トラッキング情報を削除
    this.activeRequests.delete(requestId);
  }

  /**
   * リクエスト ID 生成
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * クライアントIPアドレス取得
   */
  private getClientIP(request: NextRequest): string {
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

  /**
   * アクティブなリクエスト統計を取得
   */
  getActiveRequestStats(): {
    totalActive: number;
    byEndpoint: Record<string, number>;
    byMethod: Record<string, number>;
    averageProcessingTime: number;
    oldestRequest: {
      endpoint: string;
      method: string;
      processingTime: number;
    } | null;
  } {
    const now = Date.now();
    const byEndpoint: Record<string, number> = {};
    const byMethod: Record<string, number> = {};
    let totalProcessingTime = 0;
    let oldestRequest: { endpoint: string; method: string; processingTime: number } | null = null;
    let oldestTime = now;

    for (const [, tracking] of this.activeRequests.entries()) {
      // エンドポイント別
      byEndpoint[tracking.endpoint] = (byEndpoint[tracking.endpoint] || 0) + 1;
      
      // メソッド別
      byMethod[tracking.method] = (byMethod[tracking.method] || 0) + 1;
      
      // 処理時間
      const processingTime = now - tracking.startTime;
      totalProcessingTime += processingTime;
      
      // 最古のリクエスト
      if (tracking.startTime < oldestTime) {
        oldestTime = tracking.startTime;
        oldestRequest = {
          endpoint: tracking.endpoint,
          method: tracking.method,
          processingTime
        };
      }
    }

    return {
      totalActive: this.activeRequests.size,
      byEndpoint,
      byMethod,
      averageProcessingTime: this.activeRequests.size > 0 
        ? Math.round(totalProcessingTime / this.activeRequests.size) 
        : 0,
      oldestRequest
    };
  }

  /**
   * 長時間実行中のリクエストを検出
   */
  getLongRunningRequests(thresholdMs: number = 30000): Array<{
    requestId: string;
    endpoint: string;
    method: string;
    ip: string;
    processingTime: number;
    startTime: Date;
  }> {
    const now = Date.now();
    const longRunning: Array<{
      requestId: string;
      endpoint: string;
      method: string;
      ip: string;
      processingTime: number;
      startTime: Date;
    }> = [];

    for (const [requestId, tracking] of this.activeRequests.entries()) {
      const processingTime = now - tracking.startTime;
      if (processingTime > thresholdMs) {
        longRunning.push({
          requestId,
          endpoint: tracking.endpoint,
          method: tracking.method,
          ip: tracking.ip,
          processingTime,
          startTime: new Date(tracking.startTime)
        });
      }
    }

    return longRunning.sort((a, b) => b.processingTime - a.processingTime);
  }

  /**
   * エラー監視付きのラッパー関数
   */
  async trackRequest<T>(
    request: NextRequest,
    handler: (requestId: string) => Promise<T>,
    options: {
      expectedDuration?: number;
      criticalThreshold?: number;
    } = {}
  ): Promise<T> {
    const requestId = await this.startTracking(request);
    const startTime = Date.now();

    try {
      const result = await handler(requestId);
      const responseTime = Date.now() - startTime;

      // 期待される処理時間を超えた場合の警告
      if (options.expectedDuration && responseTime > options.expectedDuration) {
        console.warn(
          `⚠️ Request exceeded expected duration: ${request.method} ${request.nextUrl.pathname} ` +
          `took ${responseTime}ms (expected: ${options.expectedDuration}ms)`
        );
      }

      // クリティカルな処理時間を超えた場合のアラート
      if (options.criticalThreshold && responseTime > options.criticalThreshold) {
        console.error(
          `🚨 CRITICAL: Request took too long: ${request.method} ${request.nextUrl.pathname} ` +
          `took ${responseTime}ms (threshold: ${options.criticalThreshold}ms)`
        );
      }

      return result;

    } catch (error) {
      const responseTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // エラーメトリクスを記録
      await performanceMonitor.recordMetric(
        request.nextUrl.pathname,
        request.method,
        responseTime,
        500,
        {
          ip: this.getClientIP(request),
          userAgent: request.headers.get('user-agent') || 'unknown',
          errorMessage,
          cacheHit: false
        }
      );

      // エラーを再スロー
      throw error;

    } finally {
      // トラッキング情報をクリーンアップ
      this.activeRequests.delete(requestId);
    }
  }
}

// シングルトンインスタンス
const performanceTracker = new PerformanceTracker();

/**
 * API ルートでの使用を簡単にするヘルパー関数
 */
export async function withPerformanceTracking<T>(
  request: NextRequest,
  handler: () => Promise<NextResponse>,
  options: {
    dbResponseTime?: number;
    cacheHit?: boolean;
    expectedDuration?: number;
    criticalThreshold?: number;
  } = {}
): Promise<NextResponse> {
  const requestId = await performanceTracker.startTracking(request);
  
  try {
    const response = await handler();
    
    await performanceTracker.endTracking(requestId, response, {
      dbResponseTime: options.dbResponseTime,
      cacheHit: options.cacheHit
    });
    
    return response;

  } catch (error) {
    const errorResponse = NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );

    await performanceTracker.endTracking(requestId, errorResponse, {
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      cacheHit: false
    });

    throw error;
  }
}

export { performanceTracker, PerformanceTracker };
export type { RequestTracking };