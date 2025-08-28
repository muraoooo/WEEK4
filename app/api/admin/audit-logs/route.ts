import { NextRequest, NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://adimin:gpt5love@cluster0.zu4p8ot.mongodb.net/embrocal?retryWrites=true&w=majority&appName=Cluster0';

// GET: 監査ログ一覧取得
export async function GET(request: NextRequest) {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    // 管理者権限確認
    const isAdmin = request.headers.get('x-admin-secret') === process.env.ADMIN_SECRET_KEY;
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await client.connect();
    const db = client.db('embrocal');
    const auditLogsCollection = db.collection('audit_logs');

    // クエリパラメータ取得
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = (page - 1) * limit;

    // フィルタ条件構築
    const filter: any = {};

    // 期間フィルタ
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) filter.timestamp.$gte = new Date(startDate);
      if (endDate) filter.timestamp.$lte = new Date(endDate);
    }

    // その他のフィルタ
    const userId = searchParams.get('userId');
    const eventType = searchParams.get('eventType');
    const eventCategory = searchParams.get('category');
    const severity = searchParams.get('severity');
    const ipAddress = searchParams.get('ipAddress');

    if (userId) filter.userId = userId;
    if (eventType) filter.eventType = eventType;
    if (eventCategory) filter.eventCategory = eventCategory;
    if (severity) filter.severity = severity;
    if (ipAddress) filter.ipAddress = ipAddress;

    // ソート条件
    const sortField = searchParams.get('sortBy') || 'timestamp';
    const sortOrder = searchParams.get('order') === 'asc' ? 1 : -1;
    const sort: any = { [sortField]: sortOrder };

    // データ取得
    const [logs, total] = await Promise.all([
      auditLogsCollection
        .find(filter)
        .sort(sort)
        .limit(limit)
        .skip(skip)
        .toArray(),
      auditLogsCollection.countDocuments(filter)
    ]);

    // 統計情報の計算
    const statsStartDate = startDate ? new Date(startDate) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const statsEndDate = endDate ? new Date(endDate) : new Date();
    
    const statsFilter = {
      timestamp: {
        $gte: statsStartDate,
        $lte: statsEndDate
      }
    };

    const stats = await auditLogsCollection.aggregate([
      { $match: statsFilter },
      { 
        $group: {
          _id: null,
          totalEvents: { $sum: 1 },
          uniqueUsers: { $addToSet: '$userId' },
          eventTypes: { 
            $push: '$eventType'
          },
          severityCount: {
            $push: '$severity'
          }
        }
      }
    ]).toArray();

    const processedStats = stats.length > 0 ? {
      totalEvents: stats[0].totalEvents,
      uniqueUsers: stats[0].uniqueUsers.length,
      eventTypeDistribution: stats[0].eventTypes.reduce((acc: any, type: string) => {
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {}),
      severityDistribution: stats[0].severityCount.reduce((acc: any, severity: string) => {
        acc[severity || 'info'] = (acc[severity || 'info'] || 0) + 1;
        return acc;
      }, {})
    } : {
      totalEvents: 0,
      uniqueUsers: 0,
      eventTypeDistribution: {},
      severityDistribution: {}
    };

    // 異常検出の簡易実装
    const recentFailedLogins = await auditLogsCollection.countDocuments({
      eventType: 'AUTH_LOGIN_FAILED',
      timestamp: { $gte: new Date(Date.now() - 60 * 60 * 1000) } // 過去1時間
    });

    const anomalies = recentFailedLogins > 10 ? [{
      type: 'HIGH_FAILED_LOGIN_RATE',
      severity: 'warning',
      message: `${recentFailedLogins} failed login attempts in the last hour`,
      timestamp: new Date()
    }] : [];

    await client.close();

    return NextResponse.json({
      logs,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
      stats: processedStats,
      anomalies
    });

  } catch (error) {
    console.error('Error fetching audit logs:', error);
    await client.close();
    return NextResponse.json(
      { error: 'Failed to fetch audit logs' },
      { status: 500 }
    );
  }
}

// POST: 監査ログの手動記録
export async function POST(request: NextRequest) {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    // 管理者権限確認
    const isAdmin = request.headers.get('x-admin-secret') === process.env.ADMIN_SECRET_KEY;
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { eventType, action, details } = body;

    if (!eventType || !action) {
      return NextResponse.json(
        { error: 'Event type and action are required' },
        { status: 400 }
      );
    }

    await client.connect();
    const db = client.db('embrocal');
    const auditLogsCollection = db.collection('audit_logs');

    // ログを記録
    const log = {
      timestamp: new Date(),
      eventType,
      eventCategory: details?.category || 'system',
      severity: details?.severity || 'info',
      action,
      userId: details?.userId || 'manual',
      userEmail: details?.userEmail,
      userName: details?.userName,
      userRole: details?.userRole || 'admin',
      resource: details?.resource,
      resourceId: details?.resourceId,
      resourceType: details?.resourceType,
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      details: details || {}
    };

    const result = await auditLogsCollection.insertOne(log);
    
    await client.close();

    return NextResponse.json({
      success: true,
      logId: result.insertedId
    });

  } catch (error) {
    console.error('Error creating audit log:', error);
    await client.close();
    return NextResponse.json(
      { error: 'Failed to create audit log' },
      { status: 500 }
    );
  }
}