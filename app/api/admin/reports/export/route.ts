import { NextRequest, NextResponse } from 'next/server';
import connectDatabase from '@/lib/database';
import mongoose from 'mongoose';

export async function GET(request: NextRequest) {
  try {
    await connectDatabase();
    
    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status');
    const priorityFilter = searchParams.get('priority');
    const typeFilter = searchParams.get('type');
    const dateFilter = searchParams.get('dateFilter');
    
    const reportsCollection = mongoose.connection.collection('reports');
    
    // フィルタークエリを構築
    const query: any = {};
    
    if (statusFilter) {
      query.status = statusFilter;
    }
    
    if (priorityFilter) {
      query.priority = priorityFilter;
    }
    
    if (typeFilter) {
      query.reportType = typeFilter;
    }
    
    if (dateFilter) {
      const now = new Date();
      switch (dateFilter) {
        case 'today':
          query.createdAt = { 
            $gte: new Date(now.setHours(0, 0, 0, 0)) 
          };
          break;
        case 'week':
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          query.createdAt = { $gte: weekAgo };
          break;
        case 'month':
          const monthAgo = new Date();
          monthAgo.setMonth(monthAgo.getMonth() - 1);
          query.createdAt = { $gte: monthAgo };
          break;
      }
    }
    
    // レポートを取得
    const reports = await reportsCollection
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();
    
    // CSVデータを作成
    const csvRows: string[] = [];
    
    // ヘッダー
    csvRows.push([
      'ID',
      '種類',
      '対象ID',
      '理由',
      '詳細',
      '通報者名',
      '通報者メール',
      'ステータス',
      '優先度',
      '担当者',
      'レビュー者',
      '作成日時',
      '更新日時',
      '解決内容'
    ].join(','));
    
    // データ行
    reports.forEach(report => {
      const row = [
        report._id.toString(),
        report.reportType || '',
        report.targetId || '',
        escapeCSV(getReasonLabel(report.reason)),
        escapeCSV(report.reasonDetails || ''),
        escapeCSV(report.reporterName || 'Unknown'),
        escapeCSV(report.reporterEmail || ''),
        report.status || '',
        report.priority || '',
        report.assignedTo || '未割り当て',
        report.reviewedBy || '',
        formatDate(report.createdAt),
        formatDate(report.updatedAt || report.createdAt),
        escapeCSV(report.resolution?.notes || '')
      ].join(',');
      
      csvRows.push(row);
    });
    
    // 統計情報を追加
    csvRows.push('');
    csvRows.push('--- 統計情報 ---');
    csvRows.push(`総レポート数,${reports.length}`);
    csvRows.push(`未処理,${reports.filter(r => r.status === 'pending').length}`);
    csvRows.push(`レビュー中,${reports.filter(r => r.status === 'reviewing').length}`);
    csvRows.push(`解決済み,${reports.filter(r => r.status === 'resolved').length}`);
    csvRows.push(`承認済み,${reports.filter(r => r.status === 'approved').length}`);
    csvRows.push(`却下済み,${reports.filter(r => r.status === 'rejected').length}`);
    
    // 理由別統計
    csvRows.push('');
    csvRows.push('--- 理由別統計 ---');
    const reasonCounts: { [key: string]: number } = {};
    reports.forEach(report => {
      const reason = report.reason || 'その他';
      reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
    });
    
    Object.entries(reasonCounts).forEach(([reason, count]) => {
      csvRows.push(`${getReasonLabel(reason)},${count}`);
    });
    
    // CSVファイルとして返す
    const csvContent = csvRows.join('\n');
    const buffer = Buffer.from('\uFEFF' + csvContent, 'utf-8'); // BOM付きUTF-8
    
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="reports-export-${new Date().toISOString()}.csv"`,
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json(
      { error: 'Failed to export reports' },
      { status: 500 }
    );
  }
}

// CSV用のエスケープ処理
function escapeCSV(str: string): string {
  if (!str) return '';
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

// 日付フォーマット
function formatDate(date: Date | string | null): string {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

// 理由のラベル変換
function getReasonLabel(reason: string): string {
  const reasonMap: { [key: string]: string } = {
    spam: 'スパム',
    harassment: 'ハラスメント',
    inappropriate_content: '不適切なコンテンツ',
    hate_speech: 'ヘイトスピーチ',
    violence: '暴力的な内容',
    misinformation: '誤情報',
    copyright: '著作権侵害',
    other: 'その他'
  };
  return reasonMap[reason] || reason;
}