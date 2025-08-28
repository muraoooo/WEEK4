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
    const search = url.searchParams.get('search') || '';
    const status = url.searchParams.get('status') || 'all';
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    const postsCollection = mongoose.connection.collection('posts');
    const usersCollection = mongoose.connection.collection('users');
    
    // クエリを構築
    const query: any = {};
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (status === 'active') {
      query.isDeleted = { $ne: true };
      query.isHidden = { $ne: true };
    } else if (status === 'hidden') {
      query.isHidden = true;
    } else if (status === 'deleted') {
      query.isDeleted = true;
    }

    // 投稿を取得
    const posts = await postsCollection
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();
    
    // 総数を取得
    const total = await postsCollection.countDocuments(query);
    
    // ユーザー情報を追加
    const enrichedPosts = await Promise.all(posts.map(async (post) => {
      const author = await usersCollection.findOne({ _id: new mongoose.Types.ObjectId(post.authorId) });
      return {
        ...post,
        _id: post._id.toString(),
        authorName: author?.name || 'Unknown',
        authorEmail: author?.email || 'unknown@example.com',
        commentCount: post.comments?.length || 0,
        views: post.views || 0,
        createdAt: post.createdAt || new Date(),
        updatedAt: post.updatedAt || new Date()
      };
    }));

    return NextResponse.json({
      posts: enrichedPosts,
      total,
      page,
      limit
    });
  } catch (error) {
    console.error('Error fetching posts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch posts' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Admin認証チェック（開発環境用）
    const adminSecret = request.headers.get('x-admin-secret');
    if (adminSecret !== 'admin-development-secret-key') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { postId, action } = body;

    if (!postId || !action) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    await connectDatabase();
    const postsCollection = mongoose.connection.collection('posts');
    
    let update = {};
    switch (action) {
      case 'hide':
        update = { $set: { isHidden: true, updatedAt: new Date() } };
        break;
      case 'unhide':
        update = { $set: { isHidden: false, updatedAt: new Date() } };
        break;
      case 'delete':
        update = { $set: { isDeleted: true, updatedAt: new Date() } };
        break;
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    await postsCollection.updateOne(
      { _id: new mongoose.Types.ObjectId(postId) },
      update
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating post:', error);
    return NextResponse.json(
      { error: 'Failed to update post' },
      { status: 500 }
    );
  }
}