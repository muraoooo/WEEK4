import { NextRequest, NextResponse } from 'next/server';
import { connectDatabase } from '@/lib/db';
import { logAuditEvent } from '@/middleware/auditLog';

// GET: ログの整合性検証
export async function GET(request: NextRequest) {
  try {
    // 管理者権限確認
    const isAdmin = request.headers.get('x-admin-secret') === process.env.ADMIN_SECRET_KEY;
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDatabase();
    const AuditLog = require('@/models/AuditLog');

    // クエリパラメータから期間を取得
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('startDate') ? 
      new Date(searchParams.get('startDate')!) : 
      new Date(Date.now() - 24 * 60 * 60 * 1000); // デフォルト: 過去24時間
    const endDate = searchParams.get('endDate') ? 
      new Date(searchParams.get('endDate')!) : 
      new Date();

    // チェーン検証を実行
    const verificationResult = await AuditLog.verifyChain(startDate, endDate);

    // 検証アクションをログに記録
    await logAuditEvent('SECURITY_SCAN_COMPLETED', 'Audit log verification performed', {
      resource: 'audit_logs',
      resourceType: 'system',
      startDate,
      endDate,
      result: verificationResult
    }, request);

    // 改ざんが検出された場合はアラート
    if (verificationResult.invalid > 0 || verificationResult.broken.length > 0) {
      await logAuditEvent('SECURITY_ALERT', 'Audit log tampering detected', {
        severity: 'critical',
        resource: 'audit_logs',
        details: verificationResult
      }, request);

      return NextResponse.json({
        ...verificationResult,
        status: 'TAMPERING_DETECTED',
        message: 'Warning: Audit log integrity compromised'
      }, { status: 200 }); // 200を返すが、内容でエラーを示す
    }

    return NextResponse.json({
      ...verificationResult,
      status: 'VERIFIED',
      message: 'All audit logs are valid'
    });

  } catch (error) {
    console.error('Error verifying audit logs:', error);
    return NextResponse.json(
      { error: 'Failed to verify audit logs' },
      { status: 500 }
    );
  }
}