/**
 * 高性能キャッシュシステム
 * メモリキャッシュ + 永続化 + 圧縮 + TTL
 */

import LRU from 'lru-cache';
import { promisify } from 'util';
import { gzip, gunzip } from 'zlib';

const gzipAsync = promisify(gzip);
const gunzipAsync = promisify(gunzip);

interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number;
  compressed: boolean;
  size: number;
  accessCount: number;
  lastAccessed: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  totalSize: number;
  entryCount: number;
  compressionRatio: number;
  averageResponseTime: number;
}

class AdvancedCacheManager {
  private memoryCache: LRU<string, CacheEntry>;
  private stats: CacheStats;
  private compressionThreshold: number = 1024; // 1KB以上で圧縮
  private performanceLog: Array<{ key: string; time: number; hit: boolean }> = [];

  constructor() {
    this.memoryCache = new LRU({
      max: 1000, // 最大1000エントリ
      maxSize: 100 * 1024 * 1024, // 100MB
      sizeCalculation: (value: CacheEntry) => value.size,
      dispose: (value: CacheEntry, key: string) => {
        console.log(`Cache evicted: ${key} (${value.size} bytes, ${value.accessCount} accesses)`);
      }
    });

    this.stats = {
      hits: 0,
      misses: 0,
      hitRate: 0,
      totalSize: 0,
      entryCount: 0,
      compressionRatio: 0,
      averageResponseTime: 0
    };

    // 統計情報を定期更新
    setInterval(() => this.updateStats(), 60000); // 1分毎
  }

  /**
   * データをキャッシュに保存
   */
  async set(key: string, data: any, ttl: number = 3600000): Promise<void> {
    const startTime = Date.now();
    
    try {
      const serialized = JSON.stringify(data);
      const originalSize = Buffer.byteLength(serialized, 'utf8');
      
      let finalData = serialized;
      let compressed = false;
      let finalSize = originalSize;

      // サイズが閾値を超える場合は圧縮
      if (originalSize > this.compressionThreshold) {
        const compressedBuffer = await gzipAsync(serialized);
        finalData = compressedBuffer.toString('base64');
        compressed = true;
        finalSize = compressedBuffer.length;
        
        console.log(`Compressed cache entry: ${key} (${originalSize} → ${finalSize} bytes, ${Math.round((1 - finalSize/originalSize) * 100)}% reduction)`);
      }

      const cacheEntry: CacheEntry = {
        data: finalData,
        timestamp: Date.now(),
        ttl,
        compressed,
        size: finalSize,
        accessCount: 0,
        lastAccessed: Date.now()
      };

      this.memoryCache.set(key, cacheEntry);
      
      // パフォーマンスログ
      this.performanceLog.push({
        key,
        time: Date.now() - startTime,
        hit: false
      });

      // ログサイズ制限
      if (this.performanceLog.length > 10000) {
        this.performanceLog = this.performanceLog.slice(-5000);
      }

    } catch (error) {
      console.error(`Cache set error for key ${key}:`, error);
    }
  }

  /**
   * キャッシュからデータを取得
   */
  async get<T>(key: string): Promise<T | null> {
    const startTime = Date.now();
    
    try {
      const cacheEntry = this.memoryCache.get(key);
      
      if (!cacheEntry) {
        this.stats.misses++;
        this.performanceLog.push({
          key,
          time: Date.now() - startTime,
          hit: false
        });
        return null;
      }

      // TTL チェック
      if (Date.now() - cacheEntry.timestamp > cacheEntry.ttl) {
        this.memoryCache.delete(key);
        this.stats.misses++;
        this.performanceLog.push({
          key,
          time: Date.now() - startTime,
          hit: false
        });
        return null;
      }

      // アクセス統計更新
      cacheEntry.accessCount++;
      cacheEntry.lastAccessed = Date.now();

      let data = cacheEntry.data;

      // 圧縮されている場合は展開
      if (cacheEntry.compressed) {
        const compressedBuffer = Buffer.from(data, 'base64');
        const decompressedBuffer = await gunzipAsync(compressedBuffer);
        data = decompressedBuffer.toString();
      }

      const result = JSON.parse(data);
      
      this.stats.hits++;
      this.performanceLog.push({
        key,
        time: Date.now() - startTime,
        hit: true
      });

      return result;

    } catch (error) {
      console.error(`Cache get error for key ${key}:`, error);
      this.stats.misses++;
      return null;
    }
  }

  /**
   * 複数のキーを一括取得
   */
  async mget<T>(keys: string[]): Promise<Array<{ key: string; value: T | null }>> {
    const results = await Promise.all(
      keys.map(async (key) => ({
        key,
        value: await this.get<T>(key)
      }))
    );

    return results;
  }

  /**
   * パターンに一致するキーを削除
   */
  deletePattern(pattern: RegExp): number {
    let deletedCount = 0;
    
    for (const key of this.memoryCache.keys()) {
      if (pattern.test(key)) {
        this.memoryCache.delete(key);
        deletedCount++;
      }
    }

    console.log(`Deleted ${deletedCount} cache entries matching pattern: ${pattern}`);
    return deletedCount;
  }

  /**
   * キャッシュをクリア
   */
  clear(): void {
    this.memoryCache.clear();
    this.stats = {
      hits: 0,
      misses: 0,
      hitRate: 0,
      totalSize: 0,
      entryCount: 0,
      compressionRatio: 0,
      averageResponseTime: 0
    };
    console.log('Cache cleared');
  }

  /**
   * 統計情報を更新
   */
  private updateStats(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;
    this.stats.entryCount = this.memoryCache.size;
    
    // 総サイズを計算
    let totalSize = 0;
    let compressedSize = 0;
    let uncompressedSize = 0;
    
    for (const entry of this.memoryCache.values()) {
      totalSize += entry.size;
      if (entry.compressed) {
        compressedSize += entry.size;
      } else {
        uncompressedSize += entry.size;
      }
    }
    
    this.stats.totalSize = totalSize;
    this.stats.compressionRatio = compressedSize > 0 ? 
      (compressedSize / (compressedSize + uncompressedSize)) * 100 : 0;

    // 平均レスポンス時間
    if (this.performanceLog.length > 0) {
      const recentLogs = this.performanceLog.slice(-1000); // 最新1000件
      const avgTime = recentLogs.reduce((sum, log) => sum + log.time, 0) / recentLogs.length;
      this.stats.averageResponseTime = Math.round(avgTime * 100) / 100;
    }
  }

  /**
   * 統計情報を取得
   */
  getStats(): CacheStats & {
    topKeys: Array<{ key: string; hits: number; size: number }>;
    performanceMetrics: {
      hitResponseTime: number;
      missResponseTime: number;
      compressionSavings: number;
    };
  } {
    this.updateStats();
    
    // 最もアクセスされるキーTop10
    const keyStats = Array.from(this.memoryCache.entries())
      .map(([key, entry]) => ({
        key: key.length > 50 ? key.substring(0, 47) + '...' : key,
        hits: entry.accessCount,
        size: entry.size
      }))
      .sort((a, b) => b.hits - a.hits)
      .slice(0, 10);

    // パフォーマンス指標
    const recentLogs = this.performanceLog.slice(-1000);
    const hitLogs = recentLogs.filter(log => log.hit);
    const missLogs = recentLogs.filter(log => !log.hit);
    
    const hitResponseTime = hitLogs.length > 0 ? 
      hitLogs.reduce((sum, log) => sum + log.time, 0) / hitLogs.length : 0;
    
    const missResponseTime = missLogs.length > 0 ? 
      missLogs.reduce((sum, log) => sum + log.time, 0) / missLogs.length : 0;

    return {
      ...this.stats,
      topKeys: keyStats,
      performanceMetrics: {
        hitResponseTime: Math.round(hitResponseTime * 100) / 100,
        missResponseTime: Math.round(missResponseTime * 100) / 100,
        compressionSavings: this.stats.compressionRatio
      }
    };
  }

  /**
   * キャッシュの健全性チェック
   */
  healthCheck(): {
    status: 'healthy' | 'warning' | 'critical';
    issues: string[];
    recommendations: string[];
  } {
    const stats = this.getStats();
    const issues: string[] = [];
    const recommendations: string[] = [];
    
    // ヒット率チェック
    if (stats.hitRate < 70) {
      issues.push(`Low hit rate: ${stats.hitRate.toFixed(1)}%`);
      recommendations.push('Consider increasing TTL or cache size');
    }
    
    // メモリ使用量チェック
    const memoryUsagePercent = (stats.totalSize / (100 * 1024 * 1024)) * 100;
    if (memoryUsagePercent > 90) {
      issues.push(`High memory usage: ${memoryUsagePercent.toFixed(1)}%`);
      recommendations.push('Consider increasing max cache size or reducing TTL');
    }
    
    // レスポンス時間チェック
    if (stats.averageResponseTime > 10) {
      issues.push(`Slow response time: ${stats.averageResponseTime}ms`);
      recommendations.push('Check for large cached objects or network issues');
    }

    const status = issues.length === 0 ? 'healthy' : 
                  issues.length <= 2 ? 'warning' : 'critical';

    return { status, issues, recommendations };
  }
}

// シングルトンインスタンス
const cacheManager = new AdvancedCacheManager();

// エクスポート関数
export const cacheAdvanced = {
  set: (key: string, data: any, ttl?: number) => cacheManager.set(key, data, ttl),
  get: <T>(key: string) => cacheManager.get<T>(key),
  mget: <T>(keys: string[]) => cacheManager.mget<T>(keys),
  delete: (key: string) => cacheManager.deletePattern(new RegExp(`^${key}$`)),
  deletePattern: (pattern: RegExp) => cacheManager.deletePattern(pattern),
  clear: () => cacheManager.clear(),
  getStats: () => cacheManager.getStats(),
  healthCheck: () => cacheManager.healthCheck()
};

export default cacheAdvanced;