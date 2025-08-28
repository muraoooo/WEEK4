import { NextRequest, NextResponse } from 'next/server';
import { connectDatabase } from '@/lib/db';
import mongoose from 'mongoose';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Admin認証チェック（開発環境用）
    const adminSecret = request.headers.get('x-admin-secret');
    if (adminSecret !== 'admin-development-secret-key') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body;
    const { id: reportId } = await params;

    if (!reportId || !action) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    await connectDatabase();
    const reportsCollection = mongoose.connection.collection('reports');
    const postsCollection = mongoose.connection.collection('posts');
    
    switch (action) {
      case 'resolve':
        await reportsCollection.updateOne(
          { _id: new mongoose.Types.ObjectId(reportId) },
          { $set: { status: 'resolved', resolvedAt: new Date() } }
        );
        break;
        
      case 'dismiss':
        await reportsCollection.updateOne(
          { _id: new mongoose.Types.ObjectId(reportId) },
          { $set: { status: 'dismissed', dismissedAt: new Date() } }
        );
        break;
        
      case 'delete_post':
        const report = await reportsCollection.findOne({ _id: new mongoose.Types.ObjectId(reportId) });
        if (report) {
          // 投稿を削除
          await postsCollection.updateOne(
            { _id: new mongoose.Types.ObjectId(report.postId) },
            { $set: { isDeleted: true, deletedAt: new Date() } }
          );
          // 通報を解決済みにする
          await reportsCollection.updateOne(
            { _id: new mongoose.Types.ObjectId(reportId) },
            { $set: { status: 'resolved', resolvedAt: new Date(), action: 'post_deleted' } }
          );
        }
        break;
        
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating report:', error);
    return NextResponse.json(
      { error: 'Failed to update report' },
      { status: 500 }
    );
  }
}