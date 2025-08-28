import { NextRequest, NextResponse } from 'next/server';
import { MongoClient, ObjectId } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';

// PUT: 通報を更新（権限チェックなし）
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    const reportId = params.id;
    
    if (!reportId || !ObjectId.isValid(reportId)) {
      return NextResponse.json(
        { error: 'Invalid report ID' },
        { status: 400 }
      );
    }
    
    const body = await request.json();
    const { status, resolution } = body;
    
    await client.connect();
    const db = client.db('embrocal');
    const collection = db.collection('reports');
    
    // 現在のレポートを取得
    const currentReport = await collection.findOne({ _id: new ObjectId(reportId) });
    
    if (!currentReport) {
      await client.close();
      return NextResponse.json(
        { error: 'Report not found' },
        { status: 404 }
      );
    }
    
    // 更新データを準備
    const updateData: any = {
      status,
      updatedAt: new Date()
    };
    
    if (resolution) {
      updateData.resolution = {
        ...resolution,
        resolvedAt: resolution.resolvedAt || new Date().toISOString()
      };
    }
    
    // レポートを更新
    const result = await collection.updateOne(
      { _id: new ObjectId(reportId) },
      { $set: updateData }
    );
    
    // 監査ログに記録
    const auditLogsCollection = db.collection('audit_logs');
    await auditLogsCollection.insertOne({
      timestamp: new Date(),
      action: 'REPORT_UPDATED',
      eventType: 'REPORT_UPDATE',
      eventCategory: 'moderation',
      severity: 'medium',
      userId: resolution?.resolvedBy || 'system',
      targetId: reportId,
      details: {
        previousStatus: currentReport.status,
        newStatus: status,
        resolution: resolution || null
      },
      ipAddress: request.headers.get('x-forwarded-for') || 
                request.headers.get('x-real-ip') || 
                'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    });
    
    // 解決済みの場合、対象コンテンツの非表示を解除する可能性を検討
    if (status === 'rejected' && currentReport.priority >= 8) {
      const postsCollection = db.collection('posts');
      if (currentReport.targetType === 'post') {
        await postsCollection.updateOne(
          { 
            _id: new ObjectId(currentReport.targetId),
            hiddenReason: 'high_priority_report'
          },
          { 
            $unset: { 
              isHidden: '',
              hiddenReason: '',
              hiddenAt: ''
            }
          }
        );
      }
    }
    
    await client.close();
    
    return NextResponse.json({
      success: true,
      message: 'Report updated successfully',
      updatedCount: result.modifiedCount
    });
    
  } catch (error) {
    console.error('Error updating report:', error);
    await client.close();
    return NextResponse.json(
      { error: 'Failed to update report' },
      { status: 500 }
    );
  }
}

// GET: 特定の通報を取得（権限チェックなし）
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    const reportId = params.id;
    
    if (!reportId || !ObjectId.isValid(reportId)) {
      return NextResponse.json(
        { error: 'Invalid report ID' },
        { status: 400 }
      );
    }
    
    await client.connect();
    const db = client.db('embrocal');
    const collection = db.collection('reports');
    
    const report = await collection.findOne({ _id: new ObjectId(reportId) });
    
    if (!report) {
      await client.close();
      return NextResponse.json(
        { error: 'Report not found' },
        { status: 404 }
      );
    }
    
    await client.close();
    
    return NextResponse.json({
      success: true,
      report
    });
    
  } catch (error) {
    console.error('Error fetching report:', error);
    await client.close();
    return NextResponse.json(
      { error: 'Failed to fetch report' },
      { status: 500 }
    );
  }
}