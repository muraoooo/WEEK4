import { NextRequest, NextResponse } from 'next/server';
import connectDatabase from '@/lib/database';
import mongoose from 'mongoose';
import { getCached, setCached, generateCacheKey } from '@/lib/cache';

export async function GET(request: NextRequest) {
  try {
    await connectDatabase();

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || 'all';
    const dateFilter = searchParams.get('dateFilter') || 'all';
    const category = searchParams.get('category') || 'all';
    const reportFilter = searchParams.get('reportFilter') || 'all';
    
    // キャッシュキーの生成
    const cacheKey = generateCacheKey('posts', {
      search, status, dateFilter, category, reportFilter
    });
    
    // キャッシュチェック（20秒間有効）
    const cached = getCached(cacheKey, 20000);
    if (cached) {
      return NextResponse.json(cached);
    }

    const postsCollection = mongoose.connection.collection('posts');
    const usersCollection = mongoose.connection.collection('users');
    const commentsCollection = mongoose.connection.collection('comments');

    // フィルタークエリを構築
    const query: any = {};
    
    // ステータスフィルター
    if (status !== 'all') {
      switch (status) {
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

    // 日付フィルター
    if (dateFilter !== 'all') {
      const now = new Date();
      switch (dateFilter) {
        case 'today':
          const todayStart = new Date(now.setHours(0, 0, 0, 0));
          query.createdAt = { $gte: todayStart };
          break;
        case 'week':
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          query.createdAt = { $gte: weekAgo };
          break;
        case 'month':
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          query.createdAt = { $gte: monthAgo };
          break;
      }
    }

    // カテゴリフィルター
    if (category !== 'all') {
      query.category = category;
    }

    // 通報フィルター
    if (reportFilter !== 'all') {
      switch (reportFilter) {
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

    // 検索条件
    if (search) {
      query.$or = [
        { content: { $regex: search, $options: 'i' } },
        { authorName: { $regex: search, $options: 'i' } },
        { authorEmail: { $regex: search, $options: 'i' } }
      ];
    }

    // 投稿データを取得（最新100件に制限）
    const posts = await postsCollection
      .find(query)
      .sort({ createdAt: -1 })
      .limit(100)
      .toArray();

    // コメント数を取得
    const postIds = posts.map(p => p._id);
    const commentCounts = await commentsCollection.aggregate([
      { $match: { postId: { $in: postIds } } },
      { $group: { _id: '$postId', count: { $sum: 1 } } }
    ]).toArray();
    
    const commentCountMap = new Map();
    commentCounts.forEach(item => {
      commentCountMap.set(item._id.toString(), item.count);
    });

    // ユーザー情報を一括取得（パフォーマンス最適化）
    const userIds = posts
      .filter(post => post.authorId || post.author || post.userId)
      .map(post => {
        const id = post.authorId || post.author || post.userId;
        try {
          // 文字列IDまたはObjectIDの場合
          if (typeof id === 'string' && id.length === 24) {
            return new mongoose.Types.ObjectId(id);
          }
          return id; // すでにObjectIDの場合
        } catch {
          return null;
        }
      })
      .filter(id => id !== null);

    // ユーザー情報を取得（データベースから最新情報を取得）
    const users = userIds.length > 0 
      ? await usersCollection.find({ 
          _id: { $in: userIds } 
        }).toArray()
      : [];

    const userMap = new Map();
    users.forEach(user => {
      userMap.set(user._id.toString(), user);
    });

    // 投稿データを整形
    const formattedPosts = posts.map(post => {
      // ユーザー情報を取得（投稿に保存されている情報を優先、なければDBから取得）
      let userName = post.authorName || 'Unknown';
      let userEmail = post.authorEmail || 'Unknown';
      
      // 投稿にユーザー情報がない場合、DBから取得した情報を使用
      if ((!post.authorName || !post.authorEmail) && (post.authorId || post.author || post.userId)) {
        const userId = (post.authorId || post.author || post.userId).toString();
        const user = userMap.get(userId);
        if (user) {
          userName = userName === 'Unknown' ? (user.name || 'Unknown') : userName;
          userEmail = userEmail === 'Unknown' ? (user.email || 'Unknown') : userEmail;
        }
      }

      // コメント数を取得（commentsコレクションから集計した実数）
      const commentCount = commentCountMap.get(post._id.toString()) || post.commentCount || 0;

      return {
        _id: post._id.toString(),
        userId: post.userId || 'N/A',
        userName,
        userEmail,
        content: post.content || '',
        likes: post.likes || [],
        likeCount: (post.likes || []).length,
        commentCount,
        createdAt: post.createdAt || post.updatedAt || new Date(),
        updatedAt: post.updatedAt || post.createdAt || new Date(),
        status: post.isDeleted ? 'deleted' : post.isHidden ? 'hidden' : 'active',
        reported: post.reported || false,
        reportCount: post.reportCount || 0,
        category: post.category || null,
        aiModerationScore: post.aiModerationScore || null,
        aiModerationFlags: post.aiModerationFlags || [],
      };
    });

    // 作成日順にソート（新しい順）
    formattedPosts.sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    const responseData = {
      posts: formattedPosts,
      total: formattedPosts.length,
      active: formattedPosts.filter(p => p.status === 'active').length,
      hidden: formattedPosts.filter(p => p.status === 'hidden').length,
      deleted: formattedPosts.filter(p => p.status === 'deleted').length,
    };
    
    // キャッシュに保存
    setCached(cacheKey, responseData);
    
    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Posts API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch posts' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await connectDatabase();
    
    const { searchParams } = new URL(request.url);
    const postId = searchParams.get('id');

    if (!postId) {
      return NextResponse.json(
        { error: 'Post ID is required' },
        { status: 400 }
      );
    }

    const postsCollection = mongoose.connection.collection('posts');
    
    // 投稿を論理削除
    const result = await postsCollection.updateOne(
      { _id: new mongoose.Types.ObjectId(postId) },
      { 
        $set: {
          isDeleted: true,
          deletedAt: new Date(),
          deletedBy: 'admin',
        }
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Post deleted successfully',
    });
  } catch (error) {
    console.error('Post delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete post' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    await connectDatabase();
    
    const body = await request.json();
    const { postId, action } = body;

    if (!postId || !action) {
      return NextResponse.json(
        { error: 'Post ID and action are required' },
        { status: 400 }
      );
    }

    const postsCollection = mongoose.connection.collection('posts');
    
    let update = {};
    switch (action) {
      case 'hide':
        update = { isHidden: true, hiddenAt: new Date() };
        break;
      case 'unhide':
        update = { isHidden: false, hiddenAt: null };
        break;
      case 'restore':
        update = { isDeleted: false, deletedAt: null };
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

    const result = await postsCollection.updateOne(
      { _id: new mongoose.Types.ObjectId(postId) },
      { $set: { ...update, updatedAt: new Date() } }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Post ${action} successfully`,
    });
  } catch (error) {
    console.error('Post update error:', error);
    return NextResponse.json(
      { error: 'Failed to update post' },
      { status: 500 }
    );
  }
}