import { NextRequest, NextResponse } from 'next/server';
import connectDatabase from '@/lib/database';
import mongoose from 'mongoose';

export async function POST(request: NextRequest) {
  try {
    await connectDatabase();
    
    const body = await request.json();
    const { filters = {} } = body;
    
    const postsCollection = mongoose.connection.collection('posts');
    const usersCollection = mongoose.connection.collection('users');
    
    // フィルタークエリを構築
    const query: any = {};
    
    if (filters.status) {
      switch (filters.status) {
        case 'active':
          query.isDeleted = { $ne: true };
          query.isHidden = { $ne: true };
          break;
        case 'hidden':
          query.isHidden = true;
          break;
        case 'deleted':
          query.isDeleted = true;
          break;
      }
    }
    
    if (filters.dateFilter) {
      const now = new Date();
      switch (filters.dateFilter) {
        case 'today':
          query.createdAt = { 
            $gte: new Date(now.setHours(0, 0, 0, 0)) 
          };
          break;
        case 'week':
          const weekAgo = new Date(now.setDate(now.getDate() - 7));
          query.createdAt = { $gte: weekAgo };
          break;
        case 'month':
          const monthAgo = new Date(now.setMonth(now.getMonth() - 1));
          query.createdAt = { $gte: monthAgo };
          break;
      }
    }
    
    if (filters.category && filters.category !== 'all') {
      query.category = filters.category;
    }
    
    if (filters.reportFilter) {
      switch (filters.reportFilter) {
        case 'reported':
          query.reported = true;
          break;
        case 'highRisk':
          query.aiModerationScore = { $gte: 0.7 };
          break;
        case 'resolved':
          query.reported = false;
          query.wasReported = true;
          break;
      }
    }
    
    // 投稿を取得
    const posts = await postsCollection
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();
    
    // ユーザー情報を一括取得
    const userIds = posts
      .map(post => post.authorId || post.author || post.userId)
      .filter(id => id)
      .map(id => {
        try {
          return typeof id === 'string' && id.length === 24
            ? new mongoose.Types.ObjectId(id)
            : id;
        } catch {
          return null;
        }
      })
      .filter(id => id !== null);
    
    const users = userIds.length > 0
      ? await usersCollection.find({ 
          _id: { $in: userIds } 
        }).toArray()
      : [];
    
    const userMap = new Map();
    users.forEach(user => {
      userMap.set(user._id.toString(), user);
    });
    
    // CSVデータを作成
    const csvRows: string[] = [];
    
    // ヘッダー
    csvRows.push([
      'ID',
      '投稿者名',
      '投稿者メール',
      'コンテンツ',
      'カテゴリ',
      'いいね数',
      'コメント数',
      '通報数',
      'ステータス',
      'AIリスクスコア',
      '作成日時',
      '更新日時',
    ].join(','));
    
    // データ行
    posts.forEach(post => {
      let authorName = post.authorName || 'Unknown';
      let authorEmail = post.authorEmail || 'Unknown';
      
      if (post.authorId || post.author || post.userId) {
        const userId = (post.authorId || post.author || post.userId).toString();
        const user = userMap.get(userId);
        if (user) {
          authorName = user.name || authorName;
          authorEmail = user.email || authorEmail;
        }
      }
      
      const status = post.isDeleted ? 'deleted' : post.isHidden ? 'hidden' : 'active';
      const aiScore = post.aiModerationScore ? Math.round(post.aiModerationScore * 100) + '%' : 'N/A';
      
      const row = [
        post._id.toString(),
        escapeCSV(authorName),
        escapeCSV(authorEmail),
        escapeCSV(post.content || ''),
        post.category || '未分類',
        (post.likes || []).length,
        post.commentCount || 0,
        post.reportCount || 0,
        status,
        aiScore,
        formatDate(post.createdAt),
        formatDate(post.updatedAt || post.createdAt),
      ].join(',');
      
      csvRows.push(row);
    });
    
    // CSVファイルとして返す
    const csvContent = csvRows.join('\n');
    const buffer = Buffer.from('\uFEFF' + csvContent, 'utf-8'); // BOM付きUTF-8
    
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="posts-export-${new Date().toISOString()}.csv"`,
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json(
      { error: 'Failed to export posts' },
      { status: 500 }
    );
  }
}

// CSV用のエスケープ処理
function escapeCSV(str: string): string {
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

// 日付フォーマット
function formatDate(date: Date | string | null): string {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}