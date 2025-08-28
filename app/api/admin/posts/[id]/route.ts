import { NextRequest, NextResponse } from 'next/server';
import { connectDatabase } from '@/lib/db';
import mongoose from 'mongoose';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDatabase();

    const { id: postId } = await params;
    
    if (!postId || !mongoose.Types.ObjectId.isValid(postId)) {
      return NextResponse.json(
        { error: 'Invalid post ID' },
        { status: 400 }
      );
    }

    const postsCollection = mongoose.connection.collection('posts');
    const usersCollection = mongoose.connection.collection('users');
    const commentsCollection = mongoose.connection.collection('comments');
    const reportsCollection = mongoose.connection.collection('reports');
    const auditLogsCollection = mongoose.connection.collection('audit_logs');

    // 投稿を取得
    const post = await postsCollection.findOne({ 
      _id: new mongoose.Types.ObjectId(postId) 
    });

    if (!post) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      );
    }

    // 投稿者情報を取得
    let authorInfo = {
      name: post.authorName || 'Unknown',
      email: post.authorEmail || 'Unknown'
    };

    if (post.authorId || post.author || post.userId) {
      const authorId = post.authorId || post.author || post.userId;
      try {
        const objectId = typeof authorId === 'string' && authorId.length === 24
          ? new mongoose.Types.ObjectId(authorId)
          : authorId;
        
        const author = await usersCollection.findOne({ _id: objectId });
        if (author) {
          authorInfo = {
            name: author.name || authorInfo.name,
            email: author.email || authorInfo.email
          };
        }
      } catch (error) {
        console.error('Error fetching author:', error);
      }
    }

    // コメントを取得
    const comments = await commentsCollection
      .find({ postId: post._id })
      .sort({ createdAt: -1 })
      .toArray();

    // コメント投稿者の情報を取得
    const commentAuthorIds = comments
      .map(c => c.authorId || c.userId)
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

    const commentAuthors = commentAuthorIds.length > 0
      ? await usersCollection.find({ 
          _id: { $in: commentAuthorIds } 
        }).toArray()
      : [];

    const commentAuthorMap = new Map();
    commentAuthors.forEach(author => {
      commentAuthorMap.set(author._id.toString(), author);
    });

    const formattedComments = comments.map(comment => {
      let authorName = comment.authorName || 'Unknown';
      let authorEmail = comment.authorEmail || 'Unknown';
      
      if (comment.authorId || comment.userId) {
        const authorId = (comment.authorId || comment.userId).toString();
        const author = commentAuthorMap.get(authorId);
        if (author) {
          authorName = author.name || authorName;
          authorEmail = author.email || authorEmail;
        }
      }

      return {
        _id: comment._id.toString(),
        authorId: comment.authorId || comment.userId || 'N/A',
        authorName,
        authorEmail,
        content: comment.content || '',
        createdAt: comment.createdAt || new Date()
      };
    });

    // 通報情報を取得
    let reports: any[] = [];
    if (post.reported) {
      reports = await reportsCollection
        .find({ 
          targetId: post._id,
          targetType: 'post'
        })
        .sort({ createdAt: -1 })
        .toArray();

      // 通報者の情報を取得
      const reporterIds = reports
        .map(r => r.reporterId)
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

      const reporters = reporterIds.length > 0
        ? await usersCollection.find({ 
            _id: { $in: reporterIds } 
          }).toArray()
        : [];

      const reporterMap = new Map();
      reporters.forEach(reporter => {
        reporterMap.set(reporter._id.toString(), reporter);
      });

      reports = reports.map(report => {
        let reporterName = 'Unknown';
        let reporterEmail = 'Unknown';
        
        if (report.reporterId) {
          const reporterId = report.reporterId.toString();
          const reporter = reporterMap.get(reporterId);
          if (reporter) {
            reporterName = reporter.name || reporterName;
            reporterEmail = reporter.email || reporterEmail;
          }
        }

        return {
          _id: report._id.toString(),
          reporterId: report.reporterId || 'N/A',
          reporterName,
          reporterEmail,
          reason: report.reason || 'その他',
          description: report.description || '',
          createdAt: report.createdAt || new Date(),
          status: report.status || 'pending'
        };
      });
    }

    // 監査ログを取得
    const auditLogs = await auditLogsCollection
      .find({ 
        targetId: postId,
        targetType: 'post'
      })
      .sort({ timestamp: -1 })
      .limit(20)
      .toArray();

    const formattedAuditLogs = auditLogs.map(log => ({
      _id: log._id.toString(),
      action: log.action,
      adminId: log.adminId,
      targetId: log.targetId,
      details: log.details,
      timestamp: log.timestamp || log.createdAt || new Date()
    }));

    // 投稿データを整形
    const formattedPost = {
      _id: post._id.toString(),
      authorId: post.authorId || post.author || post.userId || 'N/A',
      authorName: authorInfo.name,
      authorEmail: authorInfo.email,
      content: post.content || '',
      likes: post.likes || [],
      comments: formattedComments,
      createdAt: post.createdAt || new Date(),
      updatedAt: post.updatedAt || post.createdAt || new Date(),
      isDeleted: post.isDeleted || false,
      isHidden: post.isHidden || false,
      deletedAt: post.deletedAt || null,
      hiddenAt: post.hiddenAt || null,
      reported: post.reported || false,
      reports: reports,
      reportCount: reports.length
    };

    return NextResponse.json({
      post: formattedPost,
      auditLogs: formattedAuditLogs
    });
  } catch (error) {
    console.error('Post detail API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch post details' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDatabase();

    const { id: postId } = await params;
    const body = await request.json();
    const { content } = body;

    if (!postId || !mongoose.Types.ObjectId.isValid(postId)) {
      return NextResponse.json(
        { error: 'Invalid post ID' },
        { status: 400 }
      );
    }

    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      );
    }

    const postsCollection = mongoose.connection.collection('posts');
    const auditLogsCollection = mongoose.connection.collection('audit_logs');

    // 投稿を更新
    const result = await postsCollection.updateOne(
      { _id: new mongoose.Types.ObjectId(postId) },
      { 
        $set: {
          content: content.trim(),
          updatedAt: new Date(),
          editedAt: new Date(),
          editedBy: 'admin'
        }
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      );
    }

    // 監査ログを記録
    await auditLogsCollection.insertOne({
      action: 'POST_EDITED',
      adminId: 'admin',
      targetId: postId,
      targetType: 'post',
      details: { 
        action: 'content_edited',
        newContent: content.trim()
      },
      timestamp: new Date(),
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    });

    return NextResponse.json({
      success: true,
      message: 'Post updated successfully'
    });
  } catch (error) {
    console.error('Post update error:', error);
    return NextResponse.json(
      { error: 'Failed to update post' },
      { status: 500 }
    );
  }
}