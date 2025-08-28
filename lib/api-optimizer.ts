/**
 * API最適化ライブラリ
 * クエリキャッシュ + 集約最適化 + レスポンス圧縮
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectDatabase } from '@/lib/database';
import { cacheAdvanced } from '@/lib/cache-advanced';
import mongoose from 'mongoose';
import { gzip } from 'zlib';
import { promisify } from 'util';

const gzipAsync = promisify(gzip);

interface OptimizedQueryOptions {
  cacheKey?: string;
  cacheTTL?: number;
  enableCompression?: boolean;
  enablePagination?: boolean;
  maxLimit?: number;
  enableAggregation?: boolean;
}

interface QueryPlanStats {
  executionTime: number;
  documentsExamined: number;
  documentsReturned: number;
  indexesUsed: string[];
  cacheHit: boolean;
  compressionRatio?: number;
}

class APIOptimizer {
  private queryStats: Array<{
    endpoint: string;
    executionTime: number;
    cacheHit: boolean;
    timestamp: Date;
  }> = [];

  /**
   * 最適化されたデータベースクエリ実行
   */
  async executeOptimizedQuery<T>(
    collection: any,
    query: any,
    options: OptimizedQueryOptions = {}
  ): Promise<{ data: T[]; stats: QueryPlanStats }> {
    const startTime = Date.now();
    
    const {
      cacheKey,
      cacheTTL = 300000, // 5分
      enableCompression = true,
      enablePagination = true,
      maxLimit = 1000,
      enableAggregation = false
    } = options;

    // キャッシュから取得を試行
    if (cacheKey) {
      const cachedResult = await cacheAdvanced.get<{ data: T[]; stats: QueryPlanStats }>(cacheKey);
      if (cachedResult) {
        return {
          ...cachedResult,
          stats: { ...cachedResult.stats, cacheHit: true }
        };
      }
    }

    let queryResult;
    let documentsExamined = 0;
    let indexesUsed: string[] = [];

    try {
      await connectDatabase();

      if (enableAggregation) {
        // 集約パイプラインを使用した高速クエリ
        queryResult = await this.executeAggregationQuery(collection, query, options);
      } else {
        // 通常のfindクエリに最適化を適用
        const findQuery = collection.find(query.filter || {});

        // ソート最適化
        if (query.sort) {
          findQuery.sort(query.sort);
        }

        // ページネーション最適化
        if (enablePagination && query.skip !== undefined) {
          findQuery.skip(query.skip);
        }

        if (enablePagination && query.limit !== undefined) {
          const limit = Math.min(query.limit, maxLimit);
          findQuery.limit(limit);
        }

        // プロジェクション（必要なフィールドのみ取得）
        if (query.projection) {
          findQuery.select(query.projection);
        }

        // インデックスヒントの使用
        if (query.hint) {
          findQuery.hint(query.hint);
        }

        // クエリプランを取得
        const explainResult = await findQuery.clone().explain('executionStats');
        documentsExamined = explainResult.executionStats?.totalDocsExamined || 0;
        indexesUsed = this.extractUsedIndexes(explainResult);

        queryResult = await findQuery.exec();
      }

      const executionTime = Date.now() - startTime;
      
      const stats: QueryPlanStats = {
        executionTime,
        documentsExamined,
        documentsReturned: Array.isArray(queryResult) ? queryResult.length : 1,
        indexesUsed,
        cacheHit: false
      };

      const result = { data: queryResult, stats };

      // 結果をキャッシュに保存
      if (cacheKey && executionTime < 10000) { // 10秒以内の場合のみキャッシュ
        await cacheAdvanced.set(cacheKey, result, cacheTTL);
      }

      return result;

    } catch (error) {
      console.error('Optimized query execution failed:', error);
      throw error;
    }
  }

  /**
   * 集約パイプラインクエリの実行
   */
  private async executeAggregationQuery(
    collection: any,
    query: any,
    options: OptimizedQueryOptions
  ): Promise<any[]> {
    const pipeline = [];

    // $match ステージ（早期フィルタリング）
    if (query.filter && Object.keys(query.filter).length > 0) {
      pipeline.push({ $match: query.filter });
    }

    // $lookup ステージ（JOIN最適化）
    if (query.lookup) {
      query.lookup.forEach((lookup: any) => {
        pipeline.push({ $lookup: lookup });
      });
    }

    // $unwind ステージ
    if (query.unwind) {
      query.unwind.forEach((unwind: string) => {
        pipeline.push({ $unwind: unwind });
      });
    }

    // $group ステージ（集約）
    if (query.group) {
      pipeline.push({ $group: query.group });
    }

    // $sort ステージ
    if (query.sort) {
      pipeline.push({ $sort: query.sort });
    }

    // $skip と $limit（ページネーション）
    if (options.enablePagination) {
      if (query.skip) {
        pipeline.push({ $skip: query.skip });
      }
      if (query.limit) {
        const limit = Math.min(query.limit, options.maxLimit || 1000);
        pipeline.push({ $limit: limit });
      }
    }

    // $project ステージ（プロジェクション）
    if (query.projection) {
      pipeline.push({ $project: query.projection });
    }

    // インデックス使用のヒント
    const aggregateQuery = collection.aggregate(pipeline);
    if (query.hint) {
      aggregateQuery.hint(query.hint);
    }

    return await aggregateQuery.exec();
  }

  /**
   * 使用されたインデックスを抽出
   */
  private extractUsedIndexes(explainResult: any): string[] {
    const indexes: string[] = [];
    
    function traverse(obj: any) {
      if (obj.indexName) {
        indexes.push(obj.indexName);
      }
      if (obj.inputStage) {
        traverse(obj.inputStage);
      }
      if (obj.inputStages) {
        obj.inputStages.forEach(traverse);
      }
      if (obj.executionStages) {
        traverse(obj.executionStages);
      }
    }
    
    traverse(explainResult);
    return [...new Set(indexes)];
  }

  /**
   * APIレスポンスの最適化
   */
  async optimizeResponse(
    data: any,
    options: {
      enableCompression?: boolean;
      compressionThreshold?: number;
    } = {}
  ): Promise<NextResponse> {
    const {
      enableCompression = true,
      compressionThreshold = 1024 // 1KB
    } = options;

    const jsonString = JSON.stringify(data);
    const originalSize = Buffer.byteLength(jsonString, 'utf8');

    // 小さなレスポンスはそのまま返す
    if (!enableCompression || originalSize < compressionThreshold) {
      return NextResponse.json(data, {
        headers: {
          'X-Response-Size': originalSize.toString(),
          'X-Cache-Status': 'uncompressed'
        }
      });
    }

    try {
      // gzip圧縮を適用
      const compressed = await gzipAsync(jsonString);
      const compressionRatio = (1 - compressed.length / originalSize) * 100;

      return new NextResponse(compressed as any, {
        headers: {
          'Content-Type': 'application/json',
          'Content-Encoding': 'gzip',
          'X-Original-Size': originalSize.toString(),
          'X-Compressed-Size': compressed.length.toString(),
          'X-Compression-Ratio': `${compressionRatio.toFixed(1)}%`,
          'X-Cache-Status': 'compressed'
        }
      });
    } catch (error) {
      console.error('Compression failed:', error);
      return NextResponse.json(data, {
        headers: {
          'X-Response-Size': originalSize.toString(),
          'X-Cache-Status': 'compression-failed'
        }
      });
    }
  }

  /**
   * 最適化されたページネーション
   */
  async optimizedPagination<T>(
    collection: any,
    query: any,
    page: number = 1,
    limit: number = 50,
    maxLimit: number = 1000
  ): Promise<{
    data: T[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
    stats: QueryPlanStats;
  }> {
    const safeLimit = Math.min(limit, maxLimit);
    const skip = (page - 1) * safeLimit;

    // 並列でデータと総数を取得
    const [dataResult, totalCount] = await Promise.all([
      this.executeOptimizedQuery<T>(collection, {
        filter: query,
        skip,
        limit: safeLimit
      }, {
        cacheKey: `paginated_${JSON.stringify(query)}_${page}_${safeLimit}`,
        cacheTTL: 180000, // 3分
        enablePagination: true,
        maxLimit
      }),
      this.getCachedCount(collection, query)
    ]);

    const totalPages = Math.ceil(totalCount / safeLimit);

    return {
      data: dataResult.data,
      pagination: {
        page,
        limit: safeLimit,
        total: totalCount,
        pages: totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      },
      stats: dataResult.stats
    };
  }

  /**
   * キャッシュされたカウント取得
   */
  private async getCachedCount(collection: any, query: any): Promise<number> {
    const cacheKey = `count_${JSON.stringify(query)}`;
    
    let count = await cacheAdvanced.get<number>(cacheKey);
    if (count === null) {
      count = await collection.countDocuments(query);
      await cacheAdvanced.set(cacheKey, count, 600000); // 10分
    }
    
    return count as number;
  }

  /**
   * 推奨インデックスの生成
   */
  async generateIndexRecommendations(
    collection: any,
    recentQueries: Array<{ filter: any; sort?: any }>
  ): Promise<Array<{
    fields: any;
    reason: string;
    impact: 'high' | 'medium' | 'low';
  }>> {
    const recommendations = [];
    const fieldUsage = new Map<string, number>();
    const sortFieldUsage = new Map<string, number>();

    // クエリパターンを分析
    for (const query of recentQueries) {
      // フィルターフィールドの使用頻度
      if (query.filter) {
        Object.keys(query.filter).forEach(field => {
          fieldUsage.set(field, (fieldUsage.get(field) || 0) + 1);
        });
      }

      // ソートフィールドの使用頻度
      if (query.sort) {
        Object.keys(query.sort).forEach(field => {
          sortFieldUsage.set(field, (sortFieldUsage.get(field) || 0) + 1);
        });
      }
    }

    // 単一フィールドインデックスの推奨
    for (const [field, usage] of fieldUsage.entries()) {
      if (usage >= recentQueries.length * 0.3) { // 30%以上で使用
        recommendations.push({
          fields: { [field]: 1 },
          reason: `Field '${field}' is used in ${usage} out of ${recentQueries.length} queries`,
          impact: (usage >= recentQueries.length * 0.7 ? 'high' : 'medium') as 'high' | 'medium'
        });
      }
    }

    // 複合インデックスの推奨
    const frequentFilterSort = [];
    for (const query of recentQueries) {
      if (query.filter && query.sort) {
        const filterFields = Object.keys(query.filter);
        const sortFields = Object.keys(query.sort);
        if (filterFields.length > 0 && sortFields.length > 0) {
          frequentFilterSort.push({
            filter: filterFields,
            sort: sortFields
          });
        }
      }
    }

    // 複合インデックスのパターンを検出
    if (frequentFilterSort.length >= 3) {
      const commonPattern = this.findCommonPattern(frequentFilterSort);
      if (commonPattern) {
        recommendations.push({
          fields: commonPattern,
          reason: 'Composite index for frequent filter+sort pattern',
          impact: 'high' as 'high'
        });
      }
    }

    return recommendations;
  }

  private findCommonPattern(patterns: Array<{ filter: string[]; sort: string[] }>): any | null {
    // 簡単な実装：最初のパターンを基準とする
    if (patterns.length === 0) return null;
    
    const basePattern = patterns[0];
    const index: any = {};
    
    // フィルターフィールドを追加
    basePattern.filter.forEach(field => {
      index[field] = 1;
    });
    
    // ソートフィールドを追加
    basePattern.sort.forEach(field => {
      index[field] = 1;
    });
    
    return index;
  }

  /**
   * パフォーマンス統計の取得
   */
  getPerformanceStats(): {
    averageResponseTime: number;
    cacheHitRate: number;
    slowQueries: Array<{
      endpoint: string;
      executionTime: number;
      timestamp: Date;
    }>;
    recommendations: string[];
  } {
    const recentStats = this.queryStats.slice(-1000); // 最新1000件
    
    const avgResponseTime = recentStats.reduce((sum, stat) => sum + stat.executionTime, 0) / recentStats.length;
    const cacheHits = recentStats.filter(stat => stat.cacheHit).length;
    const cacheHitRate = (cacheHits / recentStats.length) * 100;
    
    const slowQueries = recentStats
      .filter(stat => stat.executionTime > 1000) // 1秒以上
      .sort((a, b) => b.executionTime - a.executionTime)
      .slice(0, 10);

    const recommendations = [];
    if (cacheHitRate < 50) {
      recommendations.push('Consider increasing cache TTL or cache size');
    }
    if (avgResponseTime > 500) {
      recommendations.push('Review database indexes and query optimization');
    }
    if (slowQueries.length > recentStats.length * 0.1) {
      recommendations.push('Investigate slow queries and add appropriate indexes');
    }

    return {
      averageResponseTime: Math.round(avgResponseTime),
      cacheHitRate: Math.round(cacheHitRate),
      slowQueries,
      recommendations
    };
  }

  /**
   * クエリ統計を追加
   */
  addQueryStat(endpoint: string, executionTime: number, cacheHit: boolean): void {
    this.queryStats.push({
      endpoint,
      executionTime,
      cacheHit,
      timestamp: new Date()
    });

    // 古い統計を削除（メモリ制限）
    if (this.queryStats.length > 10000) {
      this.queryStats = this.queryStats.slice(-5000);
    }
  }
}

// シングルトンインスタンス
const apiOptimizer = new APIOptimizer();

export { apiOptimizer, APIOptimizer };
export type { OptimizedQueryOptions, QueryPlanStats };