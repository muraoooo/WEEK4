import { NextRequest, NextResponse } from 'next/server';
import { connectDatabase } from '@/lib/db';
import mongoose from 'mongoose';

export async function GET(request: NextRequest) {
  try {
    // Admin認証チェック（開発環境用）
    const adminSecret = request.headers.get('x-admin-secret');
    if (adminSecret !== 'admin-development-secret-key') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDatabase();
    
    const url = new URL(request.url);
    const status = url.searchParams.get('status') || 'all';
    const category = url.searchParams.get('category') || 'all';

    const reportsCollection = mongoose.connection.collection('reports');
    const postsCollection = mongoose.connection.collection('posts');
    const usersCollection = mongoose.connection.collection('users');
    
    // クエリを構築
    const query: any = {};
    if (status !== 'all') {
      query.status = status;
    }
    if (category !== 'all') {
      query.reason = category;
    }

    // 通報を取得
    const reports = await reportsCollection
      .find(query)
      .sort({ createdAt: -1 })
      .limit(100)
      .toArray();
    
    // 統計情報を計算
    const totalReports = await reportsCollection.countDocuments({});
    const pendingReports = await reportsCollection.countDocuments({ status: 'pending' });
    const resolvedReports = await reportsCollection.countDocuments({ status: 'resolved' });
    const highRiskPosts = await reportsCollection.countDocuments({ 
      status: 'pending',
      reason: { $in: ['harassment', 'inappropriate'] }
    });
    
    // カテゴリ別の統計
    const reportsByCategory = {
      spam: await reportsCollection.countDocuments({ reason: 'spam' }),
      inappropriate: await reportsCollection.countDocuments({ reason: 'inappropriate' }),
      harassment: await reportsCollection.countDocuments({ reason: 'harassment' }),
      misinformation: await reportsCollection.countDocuments({ reason: 'misinformation' }),
      other: await reportsCollection.countDocuments({ reason: 'other' })
    };
    
    // 通報データを拡充
    const enrichedReports = await Promise.all(reports.map(async (report) => {
      let reporter = null;
      let post = null;
      let postAuthor = null;
      
      // reporterIdが有効なObjectIdか確認
      if (report.reporterId && mongoose.Types.ObjectId.isValid(report.reporterId)) {
        reporter = await usersCollection.findOne({ _id: new mongoose.Types.ObjectId(report.reporterId) });
      }
      
      // postIdが有効なObjectIdか確認
      if (report.postId && mongoose.Types.ObjectId.isValid(report.postId)) {
        post = await postsCollection.findOne({ _id: new mongoose.Types.ObjectId(report.postId) });
        if (post && post.authorId && mongoose.Types.ObjectId.isValid(post.authorId)) {
          postAuthor = await usersCollection.findOne({ _id: new mongoose.Types.ObjectId(post.authorId) });
        }
      }
      
      return {
        ...report,
        _id: report._id.toString(),
        reporterName: reporter?.name || 'Unknown',
        reporterEmail: reporter?.email || 'unknown@example.com',
        postTitle: post?.title || 'Unknown Post',
        postContent: post?.content || '',
        postAuthor: postAuthor?.name || 'Unknown',
        createdAt: report.createdAt || new Date()
      };
    }));

    const statistics = {
      totalReports,
      pendingReports,
      resolvedReports,
      highRiskPosts,
      reportsByCategory,
      recentTrend: pendingReports > resolvedReports ? 'increasing' : 'stable'
    };

    return NextResponse.json({
      reports: enrichedReports,
      statistics
    });
  } catch (error) {
    console.error('Error fetching reports:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reports' },
      { status: 500 }
    );
  }
}