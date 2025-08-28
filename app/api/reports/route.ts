import { NextRequest, NextResponse } from 'next/server';
import { MongoClient, ObjectId } from 'mongodb';
import { config } from '@/lib/config';

const MONGODB_URI = config.mongodbUri;

// 危険なキーワードリスト（優先度を上げるため）
const DANGER_KEYWORDS = [
  '殺', '死', '自殺', '暴力', '爆破', '薬物', 'ドラッグ',
  'kill', 'suicide', 'violence', 'bomb', 'drug'
];

// 通報カテゴリの基本優先度
const CATEGORY_PRIORITY: { [key: string]: number } = {
  'SPAM': 1,
  'HARASSMENT': 4,
  'VIOLENCE': 5,
  'HATE_SPEECH': 5,
  'MISINFORMATION': 2,
  'INAPPROPRIATE': 3,
  'COPYRIGHT': 2,
  'OTHER': 1
};

interface Report {
  _id?: ObjectId;
  targetId: string;
  targetType: 'post' | 'comment' | 'user';
  category: string;
  description: string;
  reporterId: string;
  status: 'pending' | 'reviewing' | 'resolved' | 'rejected';
  priority: number;
  metadata: {
    targetContent?: string;
    timestamp: string;
    [key: string]: any;
  };
  createdAt: Date;
  updatedAt: Date;
  resolution?: {
    action: string;
    resolvedBy: string;
    resolvedAt: Date;
    notes: string;
  };
  falseReportScore?: number;
}

// 優先度の計算
async function calculatePriority(
  category: string,
  targetId: string,
  reporterId: string,
  description: string,
  client: MongoClient
): Promise<number> {
  const db = client.db('embrocal');
  const reportsCollection = db.collection('reports');
  
  let priority = CATEGORY_PRIORITY[category] || 1;
  
  // 修飾子を計算
  const modifiers: number[] = [];
  
  // 1. 同一ターゲットへの通報数をチェック
  const reportCount = await reportsCollection.countDocuments({
    targetId,
    status: { $in: ['pending', 'reviewing'] }
  });
  if (reportCount >= 3) {
    modifiers.push(2); // 複数通報があれば優先度+2
  }
  
  // 2. 通報者の信頼度をチェック（過去の通報履歴から）
  const reporterHistory = await reportsCollection.find({
    reporterId,
    status: 'resolved'
  }).limit(10).toArray();
  
  const validReports = reporterHistory.filter(r => r.resolution?.action !== 'rejected').length;
  const totalReports = reporterHistory.length;
  
  if (totalReports > 0) {
    const trustScore = validReports / totalReports;
    if (trustScore >= 0.8) {
      modifiers.push(1); // 信頼度高い通報者なら+1
    } else if (trustScore < 0.3) {
      modifiers.push(-2); // 信頼度低い通報者なら-2
    }
  }
  
  // 3. 危険なキーワードをチェック
  const contentToCheck = (description || '').toLowerCase();
  const hasDangerKeywords = DANGER_KEYWORDS.some(keyword => 
    contentToCheck.includes(keyword.toLowerCase())
  );
  if (hasDangerKeywords) {
    modifiers.push(2); // 危険なキーワードがあれば+2
  }
  
  // 最終優先度を計算（1-10の範囲に収める）
  const totalPriority = Math.min(10, Math.max(1, priority + modifiers.reduce((a, b) => a + b, 0)));
  
  return totalPriority;
}

// 虚偽通報の検出
async function detectFalseReport(
  reporterId: string,
  targetId: string,
  client: MongoClient
): Promise<number> {
  const db = client.db('embrocal');
  const reportsCollection = db.collection('reports');
  
  let falseReportScore = 0;
  
  // 1. 頻繁な通報をチェック（過去24時間）
  const recentReports = await reportsCollection.countDocuments({
    reporterId,
    createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
  });
  if (recentReports > 5) {
    falseReportScore += 30; // 1日に5件以上は疑わしい
  }
  
  // 2. 同一ユーザーへの繰り返し通報をチェック
  const targetReports = await reportsCollection.countDocuments({
    reporterId,
    targetId,
    status: { $in: ['rejected', 'pending'] }
  });
  if (targetReports > 2) {
    falseReportScore += 40; // 同じターゲットへの繰り返し通報は疑わしい
  }
  
  // 3. 過去の却下率をチェック
  const rejectedCount = await reportsCollection.countDocuments({
    reporterId,
    status: 'rejected'
  });
  const totalCount = await reportsCollection.countDocuments({ reporterId });
  
  if (totalCount > 5) {
    const rejectionRate = rejectedCount / totalCount;
    if (rejectionRate > 0.7) {
      falseReportScore += 30; // 70%以上却下されていれば疑わしい
    }
  }
  
  return Math.min(100, falseReportScore); // 0-100のスコアに収める
}

// POST: 新規通報を作成
export async function POST(request: NextRequest) {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    const body = await request.json();
    const {
      targetId,
      targetType,
      category,
      description,
      reporterId,
      metadata
    } = body;
    
    // バリデーション
    if (!targetId || !targetType || !category || !reporterId) {
      return NextResponse.json(
        { error: '必須項目が不足しています' },
        { status: 400 }
      );
    }
    
    if (!['post', 'comment', 'user'].includes(targetType)) {
      return NextResponse.json(
        { error: '無効なターゲットタイプです' },
        { status: 400 }
      );
    }
    
    if (!CATEGORY_PRIORITY[category]) {
      return NextResponse.json(
        { error: '無効なカテゴリです' },
        { status: 400 }
      );
    }
    
    await client.connect();
    const db = client.db('embrocal');
    const reportsCollection = db.collection('reports');
    
    // 重複通報をチェック
    const existingReport = await reportsCollection.findOne({
      targetId,
      reporterId,
      status: { $in: ['pending', 'reviewing'] }
    });
    
    if (existingReport) {
      await client.close();
      return NextResponse.json(
        { error: 'この内容はすでに通報済みです' },
        { status: 409 }
      );
    }
    
    // 優先度を計算
    const priority = await calculatePriority(
      category,
      targetId,
      reporterId,
      description,
      client
    );
    
    // 虚偽通報スコアを計算
    const falseReportScore = await detectFalseReport(reporterId, targetId, client);
    
    // 新しい通報を作成
    const report: Report = {
      targetId,
      targetType,
      category,
      description: description || '',
      reporterId,
      status: 'pending',
      priority,
      falseReportScore,
      metadata: {
        ...metadata,
        timestamp: metadata?.timestamp || new Date().toISOString(),
        ipAddress: request.headers.get('x-forwarded-for') || 
                  request.headers.get('x-real-ip') || 
                  'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const result = await reportsCollection.insertOne(report);
    
    // 高優先度の通報の場合、即座にターゲットを非表示にする
    if (priority >= 8) {
      const postsCollection = db.collection('posts');
      if (targetType === 'post') {
        await postsCollection.updateOne(
          { _id: new ObjectId(targetId) },
          { 
            $set: { 
              isHidden: true,
              hiddenReason: 'high_priority_report',
              hiddenAt: new Date()
            }
          }
        );
      }
    }
    
    // 監査ログに記録
    const auditLogsCollection = db.collection('audit_logs');
    await auditLogsCollection.insertOne({
      timestamp: new Date(),
      action: 'REPORT_CREATED',
      eventType: 'REPORT_CREATE',
      eventCategory: 'moderation',
      severity: priority >= 7 ? 'high' : priority >= 4 ? 'medium' : 'low',
      userId: reporterId,
      targetId,
      details: {
        reportId: result.insertedId,
        category,
        priority,
        falseReportScore,
        targetType
      },
      ipAddress: report.metadata.ipAddress,
      userAgent: report.metadata.userAgent
    });
    
    await client.close();
    
    return NextResponse.json({
      success: true,
      reportId: result.insertedId,
      message: '通報を受け付けました。内容を確認し、適切な対応を行います。',
      priority,
      estimatedResponseTime: priority >= 7 ? '1時間以内' : priority >= 4 ? '24時間以内' : '3営業日以内'
    });
    
  } catch (error) {
    console.error('Report creation error:', error);
    await client.close();
    return NextResponse.json(
      { error: '通報の処理中にエラーが発生しました' },
      { status: 500 }
    );
  }
}

// GET: 通報一覧を取得（公開版 - 権限チェックなし）
export async function GET(request: NextRequest) {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    // 権限チェックを削除 - 誰でもアクセス可能
    
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const status = searchParams.get('status');
    const category = searchParams.get('category');
    const sortBy = searchParams.get('sortBy') || 'priority';
    const order = searchParams.get('order') === 'asc' ? 1 : -1;
    
    const skip = (page - 1) * limit;
    
    await client.connect();
    const db = client.db('embrocal');
    const reportsCollection = db.collection('reports');
    
    // フィルタ条件を構築
    const filter: any = {};
    if (status) filter.status = status;
    if (category) filter.category = category;
    
    // ソート条件
    const sort: any = {};
    if (sortBy === 'priority') {
      sort.priority = -1; // 優先度は高い順
      sort.createdAt = -1;
    } else {
      sort[sortBy] = order;
    }
    
    // データを取得
    const [reports, total] = await Promise.all([
      reportsCollection
        .find(filter)
        .sort(sort)
        .limit(limit)
        .skip(skip)
        .toArray(),
      reportsCollection.countDocuments(filter)
    ]);
    
    // 統計情報を計算
    const stats = await reportsCollection.aggregate([
      {
        $group: {
          _id: null,
          totalReports: { $sum: 1 },
          pendingCount: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
          },
          reviewingCount: {
            $sum: { $cond: [{ $eq: ['$status', 'reviewing'] }, 1, 0] }
          },
          resolvedCount: {
            $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] }
          },
          rejectedCount: {
            $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] }
          },
          avgPriority: { $avg: '$priority' },
          avgFalseReportScore: { $avg: '$falseReportScore' }
        }
      }
    ]).toArray();
    
    await client.close();
    
    return NextResponse.json({
      reports,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
      stats: stats[0] || {
        totalReports: 0,
        pendingCount: 0,
        reviewingCount: 0,
        resolvedCount: 0,
        rejectedCount: 0,
        avgPriority: 0,
        avgFalseReportScore: 0
      }
    });
    
  } catch (error) {
    console.error('Error fetching reports:', error);
    await client.close();
    return NextResponse.json(
      { error: 'Failed to fetch reports' },
      { status: 500 }
    );
  }
}