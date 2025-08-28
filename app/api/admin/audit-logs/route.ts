import { NextRequest, NextResponse } from 'next/server';
import { connectDatabase } from '@/lib/db';
import { logAuditEvent } from '@/middleware/auditLog';

// GET: 監査ログ一覧取得
export async function GET(request: NextRequest) {
  try {
    // 管理者権限確認
    const isAdmin = request.headers.get('x-admin-secret') === process.env.ADMIN_SECRET_KEY;
    if (!isAdmin) {
      await logAuditEvent('AUTH_UNAUTHORIZED_ACCESS', 'Attempted to access audit logs', {
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip')
      });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDatabase();
    const mongoose = require('mongoose');
    const AuditLog = require('@/models/AuditLog');

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

    // アーカイブ済みを除外（デフォルト）
    if (searchParams.get('includeArchived') !== 'true') {
      filter.isArchived = { $ne: true };
    }

    // ソート条件
    const sortField = searchParams.get('sortBy') || 'timestamp';
    const sortOrder = searchParams.get('order') === 'asc' ? 1 : -1;
    const sort = { [sortField]: sortOrder };

    // データ取得
    const [logs, total, stats] = await Promise.all([
      AuditLog.find(filter)
        .sort(sort)
        .limit(limit)
        .skip(skip)
        .lean(),
      AuditLog.countDocuments(filter),
      AuditLog.getStats(
        startDate ? new Date(startDate) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        endDate ? new Date(endDate) : new Date()
      )
    ]);

    // 異常検出
    const anomalies = await AuditLog.detectAnomalies();

    // 自身のアクセスログを記録
    await logAuditEvent('DATA_READ', 'Viewed audit logs', {
      resource: 'audit_logs',
      resourceType: 'system',
      query: Object.fromEntries(searchParams),
      resultCount: logs.length
    }, request);

    return NextResponse.json({
      logs,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
      stats,
      anomalies
    });

  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch audit logs' },
      { status: 500 }
    );
  }
}

// POST: 監査ログの手動記録
export async function POST(request: NextRequest) {
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

    await connectDatabase();
    const AuditLog = require('@/models/AuditLog');

    // ログを記録
    const log = await AuditLog.logEvent({
      eventType,
      eventCategory: details.category || 'system',
      severity: details.severity || 'info',
      action,
      userId: details.userId || 'manual',
      userEmail: details.userEmail,
      userName: details.userName,
      userRole: details.userRole || 'admin',
      resource: details.resource,
      resourceId: details.resourceId,
      resourceType: details.resourceType,
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
      userAgent: request.headers.get('user-agent'),
      ...details
    });

    return NextResponse.json({
      success: true,
      logId: log._id
    });

  } catch (error) {
    console.error('Error creating audit log:', error);
    return NextResponse.json(
      { error: 'Failed to create audit log' },
      { status: 500 }
    );
  }
}