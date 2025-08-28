/**
 * 最適化された通報管理API
 * キャッシュ + クエリ最適化 + レスポンス圧縮
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectDatabase } from '@/lib/database';
import { apiOptimizer } from '@/lib/api-optimizer';
import { cacheAdvanced } from '@/lib/cache-advanced';
import mongoose from 'mongoose';

// レスポンス型定義
interface OptimizedReportResponse {
  reports: any[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  stats: {
    byStatus: Array<{ _id: string; count: number }>;
    byPriority: Array<{ _id: string; count: number }>;
    byCategory: Array<{ _id: string; count: number }>;
    recentTrends: Array<{ _id: string; count: number }>;
  };
  performance: {
    executionTime: number;
    cacheHit: boolean;
    documentsExamined: number;
    indexesUsed: string[];
  };
}

// GET: 最適化された通報一覧取得
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // 管理者権限確認
    const isAdmin = request.headers.get('x-admin-secret') === process.env.ADMIN_SECRET_KEY;
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDatabase();
    const reportsCollection = mongoose.connection.collection('reports');

    // パラメータ取得
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'all';
    const priority = searchParams.get('priority') || 'all';
    const category = searchParams.get('category') || 'all';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // フィルタ条件構築
    const filter: any = {};
    if (status !== 'all') filter.status = status;
    if (priority !== 'all') filter.priority = priority;
    if (category !== 'all') filter.category = category;

    // ソート条件
    const sort: any = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // キャッシュキー生成
    const cacheKey = `reports_optimized_${JSON.stringify({ filter, sort, page, limit })}`;

    // 最適化されたページネーション実行
    const paginatedResult = await apiOptimizer.optimizedPagination(
      reportsCollection,
      filter,
      page,
      limit,
      100 // maxLimit
    );

    // 統計情報を並列取得（キャッシュ付き）
    const statsPromises = [
      // ステータス別統計
      apiOptimizer.executeOptimizedQuery(
        reportsCollection,
        {
          filter: {},
          group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        },
        {
          cacheKey: 'reports_stats_by_status',
          cacheTTL: 300000, // 5分
          enableAggregation: true
        }
      ),
      
      // 優先度別統計
      apiOptimizer.executeOptimizedQuery(
        reportsCollection,
        {
          filter: {},
          group: {
            _id: '$priority',
            count: { $sum: 1 }
          }
        },
        {
          cacheKey: 'reports_stats_by_priority',
          cacheTTL: 300000,
          enableAggregation: true
        }
      ),
      
      // カテゴリ別統計
      apiOptimizer.executeOptimizedQuery(
        reportsCollection,
        {
          filter: {},
          group: {
            _id: '$category',
            count: { $sum: 1 }
          }
        },
        {
          cacheKey: 'reports_stats_by_category',
          cacheTTL: 300000,
          enableAggregation: true
        }
      ),
      
      // 最近のトレンド（過去7日間）
      apiOptimizer.executeOptimizedQuery(
        reportsCollection,
        {
          filter: {
            createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
          },
          group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
            },
            count: { $sum: 1 }
          },
          sort: { _id: 1 }
        },
        {
          cacheKey: 'reports_trends_7days',
          cacheTTL: 600000, // 10分
          enableAggregation: true
        }
      )
    ];

    const [byStatusResult, byPriorityResult, byCategoryResult, trendsResult] = 
      await Promise.all(statsPromises);

    // レスポンスデータ構築
    const responseData: OptimizedReportResponse = {
      reports: paginatedResult.data,
      pagination: paginatedResult.pagination,
      stats: {
        byStatus: byStatusResult.data,
        byPriority: byPriorityResult.data,
        byCategory: byCategoryResult.data,
        recentTrends: trendsResult.data
      },
      performance: {
        executionTime: Date.now() - startTime,
        cacheHit: paginatedResult.stats.cacheHit,
        documentsExamined: paginatedResult.stats.documentsExamined,
        indexesUsed: paginatedResult.stats.indexesUsed
      }
    };

    // パフォーマンス統計を記録
    apiOptimizer.addQueryStat(
      'GET /admin/reports-optimized',
      responseData.performance.executionTime,
      paginatedResult.stats.cacheHit
    );

    // 最適化されたレスポンス返却（圧縮含む）
    return await apiOptimizer.optimizeResponse(responseData, {
      enableCompression: true,
      compressionThreshold: 2048 // 2KB以上で圧縮
    });

  } catch (error) {
    console.error('Optimized reports API error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        performance: {
          executionTime: Date.now() - startTime,
          cacheHit: false,
          documentsExamined: 0,
          indexesUsed: []
        }
      },
      { status: 500 }
    );
  }
}

// POST: 新規通報作成（最適化版）
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const body = await request.json();
    const {
      targetType,
      targetId,
      category,
      description,
      reporterId,
      targetAuthorId,
    } = body;

    // バリデーション
    if (!targetType || !targetId || !category || !reporterId) {
      return NextResponse.json(
        { error: '必須項目が不足しています' },
        { status: 400 }
      );
    }

    await connectDatabase();
    const reportsCollection = mongoose.connection.collection('reports');

    // 重複チェック（キャッシュ活用）
    const duplicateCheckKey = `duplicate_check_${reporterId}_${targetId}_${targetType}`;
    const existingReport = await apiOptimizer.executeOptimizedQuery(
      reportsCollection,
      {
        filter: {
          reporterId,
          targetId,
          targetType,
          createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        },
        limit: 1
      },
      {
        cacheKey: duplicateCheckKey,
        cacheTTL: 300000, // 5分
        maxLimit: 1
      }
    );

    if (existingReport.data.length > 0) {
      return NextResponse.json(
        { error: 'すでに通報済みです。24時間以内に同じ対象を複数回通報することはできません。' },
        { status: 400 }
      );
    }

    // 通報者履歴の取得（並列処理）
    const [reporterHistoryResult, targetHistoryResult, previousReportsResult] = await Promise.all([
      // 通報者の履歴
      apiOptimizer.executeOptimizedQuery(
        reportsCollection,
        {
          filter: { reporterId },
          group: {
            _id: null,
            totalReports: { $sum: 1 },
            validReports: {
              $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] }
            },
            falseReports: {
              $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] }
            }
          }
        },
        {
          cacheKey: `reporter_history_${reporterId}`,
          cacheTTL: 600000, // 10分
          enableAggregation: true
        }
      ),

      // 対象者の履歴
      targetAuthorId ? apiOptimizer.executeOptimizedQuery(
        reportsCollection,
        {
          filter: { targetAuthorId },
          group: {
            _id: null,
            violationCount: {
              $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] }
            },
            reportedCount: { $sum: 1 }
          }
        },
        {
          cacheKey: `target_history_${targetAuthorId}`,
          cacheTTL: 600000,
          enableAggregation: true
        }
      ) : Promise.resolve({ data: [], stats: { executionTime: 0, documentsExamined: 0, documentsReturned: 0, indexesUsed: [], cacheHit: false } }),

      // 同じ対象への過去の通報
      apiOptimizer.executeOptimizedQuery(
        reportsCollection,
        {
          filter: { targetId, targetType },
          sort: { createdAt: -1 },
          limit: 10
        },
        {
          cacheKey: `target_reports_${targetId}_${targetType}`,
          cacheTTL: 300000,
          maxLimit: 10
        }
      )
    ]);

    // 優先順位計算
    const { score, priority, falseReportProbability } = calculatePriorityScore(
      category,
      reporterHistoryResult.data[0] || null,
      targetHistoryResult.data[0] || null,
      previousReportsResult.data
    );

    // 通報データの作成
    const reportData = {
      reporterId,
      targetType,
      targetId,
      targetAuthorId,
      category,
      description: description || '',
      priority,
      priorityScore: score,
      falseReportScore: falseReportProbability,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await reportsCollection.insertOne(reportData);

    // 関連キャッシュを無効化
    await cacheAdvanced.deletePattern(/^reports_/);

    // パフォーマンス統計を記録
    apiOptimizer.addQueryStat(
      'POST /admin/reports-optimized',
      Date.now() - startTime,
      false
    );

    return NextResponse.json({
      success: true,
      reportId: result.insertedId.toString(),
      priority,
      performance: {
        executionTime: Date.now() - startTime,
        cacheInvalidated: true
      }
    });

  } catch (error) {
    console.error('Optimized report creation error:', error);
    return NextResponse.json(
      { 
        error: '通報の処理中にエラーが発生しました',
        performance: {
          executionTime: Date.now() - startTime
        }
      },
      { status: 500 }
    );
  }
}

// 優先順位計算関数（最適化版）
function calculatePriorityScore(
  category: string,
  reporterHistory: any,
  targetHistory: any,
  previousReports: any[]
): { score: number; priority: 'critical' | 'high' | 'medium' | 'low'; falseReportProbability: number } {
  let score = 0;
  let falseReportProbability = 0;

  // カテゴリ別の基本スコア（最適化済み定数）
  const categoryScores: Record<string, number> = {
    violence: 90,
    hate_speech: 85,
    child_safety: 100,
    fraud: 95,
    harassment: 75,
    inappropriate: 60,
    misinformation: 50,
    spam: 30,
    copyright: 40,
    other: 20,
  };

  score = categoryScores[category] || 20;

  // 通報者の信頼度による調整
  if (reporterHistory) {
    const { totalReports, validReports, falseReports } = reporterHistory;
    const validRate = totalReports > 0 ? validReports / totalReports : 0.5;
    const trustMultiplier = 0.5 + validRate;
    score *= trustMultiplier;

    if (totalReports >= 5) {
      falseReportProbability = falseReports / totalReports;
      if (falseReportProbability > 0.5) score *= 0.3;
      else if (falseReportProbability > 0.3) score *= 0.6;
    }
  }

  // 対象の違反履歴による調整
  if (targetHistory) {
    const { violationCount, reportedCount } = targetHistory;
    if (violationCount > 0) {
      score += Math.min(violationCount * 10, 30);
    }
    if (reportedCount > 5) {
      score += 15;
    }
  }

  // 重複通報による重要度上昇
  const recentDuplicates = previousReports.filter(r => {
    const hoursSinceReport = (Date.now() - new Date(r.createdAt).getTime()) / (1000 * 60 * 60);
    return hoursSinceReport < 24;
  });
  
  if (recentDuplicates.length > 0) {
    score += Math.min(recentDuplicates.length * 15, 45);
  }

  // 優先順位判定
  let priority: 'critical' | 'high' | 'medium' | 'low';
  if (score >= 85) priority = 'critical';
  else if (score >= 60) priority = 'high';
  else if (score >= 35) priority = 'medium';
  else priority = 'low';

  if (falseReportProbability > 0.7 && priority !== 'critical') {
    priority = 'low';
  }

  return { score, priority, falseReportProbability };
}