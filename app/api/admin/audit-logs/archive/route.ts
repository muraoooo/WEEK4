import { NextRequest, NextResponse } from 'next/server';
import { connectDatabase } from '@/lib/db';
import { logAuditEvent } from '@/middleware/auditLog';

// POST: 古いログのアーカイブ
export async function POST(request: NextRequest) {
  try {
    // 管理者権限確認
    const isAdmin = request.headers.get('x-admin-secret') === process.env.ADMIN_SECRET_KEY;
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const daysOld = body.daysOld || 90;

    await connectDatabase();
    const AuditLog = require('@/models/AuditLog');

    // アーカイブ処理を実行
    const result = await AuditLog.archiveOldLogs(daysOld);

    // アーカイブ処理をログに記録
    await logAuditEvent('SYSTEM_BACKUP', 'Audit logs archived', {
      resource: 'audit_logs',
      resourceType: 'system',
      daysOld,
      archivedCount: result.modifiedCount,
      severity: 'info'
    }, request);

    return NextResponse.json({
      success: true,
      archivedCount: result.modifiedCount,
      message: `Successfully archived ${result.modifiedCount} logs older than ${daysOld} days`
    });

  } catch (error) {
    console.error('Error archiving audit logs:', error);
    
    await logAuditEvent('SYSTEM_ERROR', 'Failed to archive audit logs', {
      resource: 'audit_logs',
      resourceType: 'system',
      error: error instanceof Error ? error.message : 'Unknown error',
      severity: 'high'
    }, request);

    return NextResponse.json(
      { error: 'Failed to archive audit logs' },
      { status: 500 }
    );
  }
}