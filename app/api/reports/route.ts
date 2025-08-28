import { NextRequest, NextResponse } from 'next/server';
import { connectDatabase } from '@/lib/database';
import mongoose from 'mongoose';

// 優先順位スコア計算
function calculatePriorityScore(
  category: string,
  reporterHistory: any,
  targetHistory: any,
  previousReports: any[]
): { score: number; priority: 'critical' | 'high' | 'medium' | 'low'; falseReportProbability: number } {
  let score = 0;
  let falseReportProbability = 0;

  // カテゴリ別の基本スコア
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
    
    // 信頼度による乗数（0.5〜1.5）
    const trustMultiplier = 0.5 + validRate;
    score *= trustMultiplier;

    // 虚偽通報確率の計算
    if (totalReports >= 5) {
      falseReportProbability = falseReports / totalReports;
      
      // 虚偽通報が多い場合はスコアを大幅に下げる
      if (falseReportProbability > 0.5) {
        score *= 0.3;
      } else if (falseReportProbability > 0.3) {
        score *= 0.6;
      }
    }
  }

  // 対象の過去の違反履歴による調整
  if (targetHistory) {
    const { violationCount, reportedCount, lastViolation } = targetHistory;
    
    if (violationCount > 0) {
      // 違反履歴がある場合はスコアアップ
      score += Math.min(violationCount * 10, 30);
    }

    if (reportedCount > 5) {
      // 頻繁に報告される対象
      score += 15;
    }

    // 最近の違反があるか
    if (lastViolation) {
      const daysSinceViolation = (Date.now() - new Date(lastViolation).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceViolation < 7) {
        score += 20;
      } else if (daysSinceViolation < 30) {
        score += 10;
      }
    }
  }

  // 同じ対象への重複通報チェック
  const recentDuplicates = previousReports.filter(r => {
    const hoursSinceReport = (Date.now() - new Date(r.createdAt).getTime()) / (1000 * 60 * 60);
    return hoursSinceReport < 24;
  });

  if (recentDuplicates.length > 0) {
    // 複数人から通報されている場合は重要度アップ
    score += Math.min(recentDuplicates.length * 15, 45);
  }

  // 最終的な優先順位の判定
  let priority: 'critical' | 'high' | 'medium' | 'low';
  if (score >= 85) {
    priority = 'critical';
  } else if (score >= 60) {
    priority = 'high';
  } else if (score >= 35) {
    priority = 'medium';
  } else {
    priority = 'low';
  }

  // 虚偽通報の可能性が高い場合は優先度を下げる
  if (falseReportProbability > 0.7 && priority !== 'critical') {
    priority = 'low';
  }

  return { score, priority, falseReportProbability };
}

// 通報者へのフィードバックメッセージ生成
function generateFeedbackMessage(
  priority: string,
  category: string,
  falseReportProbability: number
): { message: string; estimatedTime: string; autoAction?: string } {
  let message = '';
  let estimatedTime = '';
  let autoAction;

  if (falseReportProbability > 0.7) {
    message = '通報を受け付けました。内容を慎重に確認させていただきます。';
    estimatedTime = '5-7営業日';
  } else if (priority === 'critical') {
    message = '重要な通報として優先的に対処いたします。';
    estimatedTime = '24時間以内';
    
    // 危険なカテゴリは自動的に一時非表示
    if (['violence', 'child_safety', 'fraud'].includes(category)) {
      autoAction = 'temporary_hide';
    }
  } else if (priority === 'high') {
    message = 'ご報告ありがとうございます。速やかに確認し対処いたします。';
    estimatedTime = '1-2営業日';
  } else if (priority === 'medium') {
    message = '通報を受け付けました。順次確認させていただきます。';
    estimatedTime = '3-5営業日';
  } else {
    message = '通報を受け付けました。内容を確認させていただきます。';
    estimatedTime = '5-7営業日';
  }

  return { message, estimatedTime, autoAction };
}

// POST: 新規通報作成
export async function POST(request: NextRequest) {
  try {
    await connectDatabase();
    
    const body = await request.json();
    const {
      targetType,
      targetId,
      category,
      description,
      reporterId,
      targetAuthorId,
    } = body;

    // 必須項目のバリデーション
    if (!targetType || !targetId || !category || !reporterId) {
      return NextResponse.json(
        { error: '必須項目が不足しています' },
        { status: 400 }
      );
    }

    const reportsCollection = mongoose.connection.collection('reports');
    const usersCollection = mongoose.connection.collection('users');

    // 同一ユーザーからの重複通報チェック（24時間以内）
    const existingReport = await reportsCollection.findOne({
      reporterId,
      targetId,
      targetType,
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    });

    if (existingReport) {
      return NextResponse.json(
        { error: 'すでに通報済みです。24時間以内に同じ対象を複数回通報することはできません。' },
        { status: 400 }
      );
    }

    // 通報者の履歴を取得
    const reporterHistory = await reportsCollection.aggregate([
      { $match: { reporterId } },
      {
        $group: {
          _id: null,
          totalReports: { $sum: 1 },
          validReports: {
            $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] }
          },
          falseReports: {
            $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] }
          }
        }
      }
    ]).toArray();

    // 対象の違反履歴を取得
    let targetHistory = null;
    if (targetAuthorId) {
      const targetUser = await usersCollection.findOne(
        { _id: new mongoose.Types.ObjectId(targetAuthorId) }
      );
      
      if (targetUser) {
        const targetReports = await reportsCollection.aggregate([
          { 
            $match: { 
              targetAuthorId,
              status: { $in: ['resolved', 'reviewing'] }
            }
          },
          {
            $group: {
              _id: null,
              violationCount: {
                $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] }
              },
              reportedCount: { $sum: 1 }
            }
          }
        ]).toArray();

        targetHistory = {
          violationCount: targetReports[0]?.violationCount || 0,
          reportedCount: targetReports[0]?.reportedCount || 0,
          lastViolation: targetUser.lastViolation || null,
          warningCount: targetUser.warningCount || 0,
        };
      }
    }

    // 同じ対象への過去の通報を取得
    const previousReports = await reportsCollection
      .find({ targetId, targetType })
      .sort({ createdAt: -1 })
      .limit(10)
      .toArray();

    // 優先順位とスコアの計算
    const { score, priority, falseReportProbability } = calculatePriorityScore(
      category,
      reporterHistory[0] || null,
      targetHistory,
      previousReports
    );

    // フィードバックメッセージの生成
    const feedback = generateFeedbackMessage(priority, category, falseReportProbability);

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
      feedback: feedback.message,
      estimatedReviewTime: feedback.estimatedTime,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // 通報を保存
    const result = await reportsCollection.insertOne(reportData);

    // 自動アクションの実行（重大な違反の場合）
    if (feedback.autoAction === 'temporary_hide') {
      // コンテンツを一時的に非表示にする
      if (targetType === 'post') {
        const postsCollection = mongoose.connection.collection('posts');
        await postsCollection.updateOne(
          { _id: new mongoose.Types.ObjectId(targetId) },
          { 
            $set: { 
              isHidden: true,
              hiddenReason: 'auto_report',
              hiddenAt: new Date()
            }
          }
        );
      }
    }

    // 監査ログの記録
    const auditLogsCollection = mongoose.connection.collection('audit_logs');
    await auditLogsCollection.insertOne({
      action: 'REPORT_SUBMITTED',
      reporterId,
      targetId,
      targetType,
      category,
      priority,
      timestamp: new Date(),
      details: {
        priorityScore: score,
        falseReportProbability,
        autoAction: feedback.autoAction,
      }
    });

    // 統計情報の更新
    const statsCollection = mongoose.connection.collection('report_stats');
    await statsCollection.updateOne(
      { date: new Date().toISOString().split('T')[0] },
      {
        $inc: {
          totalReports: 1,
          [`categories.${category}`]: 1,
          [`priorities.${priority}`]: 1,
        }
      },
      { upsert: true }
    );

    return NextResponse.json({
      success: true,
      reportId: result.insertedId.toString(),
      message: feedback.message,
      estimatedTime: feedback.estimatedTime,
      priority,
    });

  } catch (error) {
    console.error('Report submission error:', error);
    return NextResponse.json(
      { error: '通報の処理中にエラーが発生しました' },
      { status: 500 }
    );
  }
}

// GET: 通報一覧取得（管理者用）
export async function GET(request: NextRequest) {
  try {
    await connectDatabase();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'all';
    const priority = searchParams.get('priority') || 'all';
    const category = searchParams.get('category') || 'all';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    const reportsCollection = mongoose.connection.collection('reports');

    // フィルタ条件の構築
    const filter: any = {};
    if (status !== 'all') filter.status = status;
    if (priority !== 'all') filter.priority = priority;
    if (category !== 'all') filter.category = category;

    // ソート条件
    const sort: any = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // データ取得
    const skip = (page - 1) * limit;
    const [reports, totalCount] = await Promise.all([
      reportsCollection
        .find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .toArray(),
      reportsCollection.countDocuments(filter)
    ]);

    // 統計情報の取得
    const stats = await reportsCollection.aggregate([
      {
        $facet: {
          byStatus: [
            { $group: { _id: '$status', count: { $sum: 1 } } }
          ],
          byPriority: [
            { $group: { _id: '$priority', count: { $sum: 1 } } }
          ],
          byCategory: [
            { $group: { _id: '$category', count: { $sum: 1 } } }
          ],
          recentTrends: [
            {
              $match: {
                createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
              }
            },
            {
              $group: {
                _id: {
                  $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
                },
                count: { $sum: 1 }
              }
            },
            { $sort: { _id: 1 } }
          ]
        }
      }
    ]).toArray();

    return NextResponse.json({
      reports,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit)
      },
      stats: stats[0]
    });

  } catch (error) {
    console.error('Get reports error:', error);
    return NextResponse.json(
      { error: '通報データの取得に失敗しました' },
      { status: 500 }
    );
  }
}