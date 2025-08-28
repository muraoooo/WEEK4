import { NextRequest, NextResponse } from 'next/server';
import { connectDatabase } from '@/lib/db';
import { logAuditEvent } from '@/middleware/auditLog';

// GET: ログのエクスポート
export async function GET(request: NextRequest) {
  try {
    // 管理者権限確認
    const isAdmin = request.headers.get('x-admin-secret') === process.env.ADMIN_SECRET_KEY;
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDatabase();
    const AuditLog = require('@/models/AuditLog');

    // クエリパラメータ取得
    const searchParams = request.nextUrl.searchParams;
    const format = searchParams.get('format') || 'json'; // json or csv
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // フィルタ条件
    const filter: any = {};
    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) filter.timestamp.$gte = new Date(startDate);
      if (endDate) filter.timestamp.$lte = new Date(endDate);
    }

    // データ取得
    const logs = await AuditLog.find(filter)
      .sort({ timestamp: -1 })
      .lean();

    // エクスポートをログに記録
    await logAuditEvent('DATA_EXPORT', 'Audit logs exported', {
      resource: 'audit_logs',
      resourceType: 'system',
      format,
      recordCount: logs.length,
      startDate,
      endDate,
      severity: 'medium'
    }, request);

    if (format === 'csv') {
      // CSV形式で出力
      const csv = convertToCSV(logs);
      
      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="audit_logs_${Date.now()}.csv"`
        }
      });
    } else {
      // JSON形式で出力
      return NextResponse.json({
        exportDate: new Date(),
        recordCount: logs.length,
        startDate: startDate || 'all',
        endDate: endDate || 'all',
        logs
      });
    }

  } catch (error) {
    console.error('Error exporting audit logs:', error);
    return NextResponse.json(
      { error: 'Failed to export audit logs' },
      { status: 500 }
    );
  }
}

// CSVに変換
function convertToCSV(logs: any[]): string {
  if (logs.length === 0) return '';

  // ヘッダー
  const headers = [
    'Timestamp',
    'Event Type',
    'Category',
    'Severity',
    'User ID',
    'User Email',
    'Action',
    'Resource',
    'IP Address',
    'Status Code',
    'Duration (ms)'
  ];

  // データ行
  const rows = logs.map(log => [
    log.timestamp ? new Date(log.timestamp).toISOString() : '',
    log.eventType || '',
    log.eventCategory || '',
    log.severity || '',
    log.userId || '',
    log.userEmail || '',
    log.action || '',
    log.resource || '',
    log.ipAddress || '',
    log.statusCode || '',
    log.duration || ''
  ]);

  // CSV文字列を生成
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => {
      // セル内のカンマや改行をエスケープ
      const str = String(cell);
      if (str.includes(',') || str.includes('\n') || str.includes('"')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    }).join(','))
  ].join('\n');

  return csvContent;
}