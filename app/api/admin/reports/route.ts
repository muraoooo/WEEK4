import { NextRequest, NextResponse } from 'next/server';
import { connectDatabase } from '@/lib/db';
import { getCached, setCached, generateCacheKey } from '@/lib/cache';

// GET: 通報一覧取得
export async function GET(request: NextRequest) {
  try {
    // 管理者権限確認
    const isAdmin = request.headers.get('x-admin-secret') === process.env.ADMIN_SECRET_KEY;
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDatabase();
    const mongoose = require('mongoose');
    const reportsCollection = mongoose.connection.collection('reports');

    // クエリパラメータ取得
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '25'); // デフォルトを25件に変更
    const status = searchParams.get('status') || '';
    const priority = searchParams.get('priority') || '';
    const reportType = searchParams.get('type') || '';
    const skip = (page - 1) * limit;
    
    // キャッシュキーの生成
    const cacheKey = generateCacheKey('reports', {
      page, limit, status, priority, reportType
    });
    
    // キャッシュチェック（15秒間有効）
    const cached = getCached(cacheKey, 15000);
    if (cached) {
      return NextResponse.json(cached);
    }

    // フィルタ条件構築
    const filter: any = {};
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (reportType) filter.reportType = reportType;

    // 通報データ取得
    const reports = await reportsCollection
      .find(filter)
      .sort({ priority: -1, createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .toArray();

    // 総件数取得
    const total = await reportsCollection.countDocuments(filter);

    // ステータス別件数取得
    const statusCounts = await reportsCollection.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]).toArray();

    const stats = {
      pending: 0,
      reviewing: 0,
      resolved: 0,
      total: total
    };

    statusCounts.forEach((item: any) => {
      if (item._id === 'pending') stats.pending = item.count;
      if (item._id === 'reviewing') stats.reviewing = item.count;
      if (item._id === 'resolved' || item._id === 'approved' || item._id === 'rejected') {
        stats.resolved += item.count;
      }
    });

    return NextResponse.json({
      reports: reports.map((report: any) => ({
        _id: report._id.toString(),
        reportType: report.reportType,
        targetId: report.targetId,
        targetContent: report.targetContent,
        reporterEmail: report.reporterEmail,
        reporterName: report.reporterName,
        reason: report.reason,
        reasonDetails: report.reasonDetails,
        status: report.status,
        priority: report.priority,
        assignedTo: report.assignedTo,
        reviewedBy: report.reviewedBy,
        resolution: report.resolution,
        createdAt: report.createdAt,
        updatedAt: report.updatedAt
      })),
      total,
      page,
      limit,
      stats
    });
  } catch (error) {
    console.error('Error fetching reports:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reports' },
      { status: 500 }
    );
  }
}

// POST: 新規通報作成
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      reportType,
      targetId,
      targetUserId,
      targetContent,
      reporterId,
      reporterEmail,
      reporterName,
      reason,
      reasonDetails,
      priority
    } = body;

    await connectDatabase();
    const mongoose = require('mongoose');
    const reportsCollection = mongoose.connection.collection('reports');
    const usersCollection = mongoose.connection.collection('users');
    const postsCollection = mongoose.connection.collection('posts');

    // 既存の通報をチェック
    const existingReport = await reportsCollection.findOne({
      targetId: targetId,
      reporterId: reporterId,
      status: { $in: ['pending', 'reviewing'] }
    });

    if (existingReport) {
      return NextResponse.json(
        { error: 'You have already reported this content' },
        { status: 400 }
      );
    }

    // 通報作成
    const report = {
      reportType,
      targetId,
      targetUserId,
      targetContent,
      reporterId,
      reporterEmail,
      reporterName,
      reason,
      reasonDetails,
      priority: priority || 'medium',
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
      userAgent: request.headers.get('user-agent')
    };

    const result = await reportsCollection.insertOne(report);

    // 投稿の通報カウントを増やす
    if (reportType === 'post') {
      try {
        const ObjectId = mongoose.Types.ObjectId;
        await postsCollection.updateOne(
          { _id: new ObjectId(targetId) },
          { 
            $inc: { reportCount: 1 },
            $set: { reported: true }
          }
        );
      } catch (err) {
        console.log('Could not update post report count:', err);
      }
    }

    // 監査ログに記録
    const auditLogsCollection = mongoose.connection.collection('audit_logs');
    await auditLogsCollection.insertOne({
      timestamp: new Date(),
      action: 'REPORT_CREATED',
      targetId: result.insertedId.toString(),
      reporterId: reporterId,
      details: {
        reportType,
        targetId,
        reason
      },
      ipAddress: report.ipAddress,
      userAgent: report.userAgent
    });

    // 管理者に通知メールを送信
    try {
      const { sendReportNotificationToAdmin } = await import('@/lib/email');
      await sendReportNotificationToAdmin(
        reportType,
        reason,
        reporterName || 'Unknown',
        targetContent
      );
    } catch (emailError) {
      console.error('Failed to send notification email:', emailError);
      // メール送信失敗してもレポート作成は成功とする
    }

    return NextResponse.json({
      success: true,
      message: 'Report created successfully',
      reportId: result.insertedId.toString()
    });
  } catch (error) {
    console.error('Error creating report:', error);
    return NextResponse.json(
      { error: 'Failed to create report' },
      { status: 500 }
    );
  }
}

// PUT: 通報の更新
export async function PUT(request: NextRequest) {
  try {
    // 管理者権限確認
    const isAdmin = request.headers.get('x-admin-secret') === process.env.ADMIN_SECRET_KEY;
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { reportId, action, status, adminId, notes, reviewNotes, assignedTo, resolution, internalNote } = body;

    await connectDatabase();
    const mongoose = require('mongoose');
    const reportsCollection = mongoose.connection.collection('reports');
    const usersCollection = mongoose.connection.collection('users');
    const postsCollection = mongoose.connection.collection('posts');
    const auditLogsCollection = mongoose.connection.collection('audit_logs');

    // 通報を取得
    const ObjectId = mongoose.Types.ObjectId;
    const report = await reportsCollection.findOne({
      _id: new ObjectId(reportId)
    });

    if (!report) {
      return NextResponse.json(
        { error: 'Report not found' },
        { status: 404 }
      );
    }

    let updateData: any = {
      updatedAt: new Date()
    };

    // ステータス更新の処理
    if (status) {
      updateData.status = status;
      if (reviewNotes) updateData.reviewNotes = reviewNotes;
      if (assignedTo) updateData.assignedTo = assignedTo;
      if (resolution) updateData.resolution = resolution;
      if (status === 'resolved' || status === 'approved' || status === 'rejected') {
        updateData.resolvedAt = new Date();
      }
    }

    // 内部メモ追加
    if (internalNote) {
      // $pushは別の更新操作として実行
      await reportsCollection.updateOne(
        { _id: new ObjectId(reportId) },
        {
          $push: {
            internalNotes: {
              note: internalNote,
              createdBy: adminId || 'admin@example.com',
              createdAt: new Date()
            }
          },
          $set: { updatedAt: new Date() }
        }
      );
      
      // updateDataから$pushを削除
      delete updateData.$push;
    }

    // アクションに応じた処理
    if (action) {
      switch (action) {
        case 'assign':
          updateData.assignedTo = adminId;
          updateData.assignedAt = new Date();
          updateData.status = 'reviewing';
          break;

          case 'approve':
          updateData.status = 'approved';
          updateData.reviewedBy = adminId;
          updateData.reviewedAt = new Date();
          updateData.resolution = {
            action: body.resolutionAction || 'warning_issued',
            notes: notes,
            resolvedAt: new Date()
          };

          // ユーザーへの処置
          if (body.resolutionAction === 'warning_issued') {
          const targetUser = await usersCollection.findOneAndUpdate(
            { _id: new ObjectId(report.targetUserId) },
            { $inc: { warningCount: 1 } },
            { returnDocument: 'after' }
          );
          
          // 警告メール送信
          try {
            const { sendWarningEmail } = await import('@/lib/email');
            await sendWarningEmail(
              targetUser.value.email,
              targetUser.value.name || 'User',
              report.reason,
              targetUser.value.warningCount
            );
          } catch (emailError) {
            console.error('Failed to send warning email:', emailError);
          }
        } else if (body.resolutionAction === 'user_suspended') {
          await usersCollection.updateOne(
            { _id: new ObjectId(report.targetUserId) },
            { $set: { status: 'suspended' } }
          );
        } else if (body.resolutionAction === 'user_banned') {
          await usersCollection.updateOne(
            { _id: new ObjectId(report.targetUserId) },
            { $set: { status: 'banned' } }
          );
        } else if (body.resolutionAction === 'content_removed') {
          if (report.reportType === 'post') {
            await postsCollection.updateOne(
              { _id: new ObjectId(report.targetId) },
              { $set: { isDeleted: true, isHidden: true } }
            );
          }
        }
        
          // 通報者に処理完了通知
          try {
          const reporter = await usersCollection.findOne({
            _id: new ObjectId(report.reporterId)
          });
          if (reporter) {
            const { sendReportProcessedEmail } = await import('@/lib/email');
            await sendReportProcessedEmail(
              reporter.email,
              reporter.name || 'User',
              'approved',
              notes
            );
          }
        } catch (emailError) {
          console.error('Failed to send processed email:', emailError);
        }
          break;

        case 'reject':
          updateData.status = 'rejected';
          updateData.reviewedBy = adminId;
          updateData.reviewedAt = new Date();
          updateData.resolution = {
            action: 'no_action',
            notes: notes,
            resolvedAt: new Date()
          };
        
          // 通報者に処理完了通知
          try {
          const reporter = await usersCollection.findOne({
            _id: new ObjectId(report.reporterId)
          });
          if (reporter) {
            const { sendReportProcessedEmail } = await import('@/lib/email');
            await sendReportProcessedEmail(
              reporter.email,
              reporter.name || 'User',
              'rejected',
              notes
            );
          }
        } catch (emailError) {
          console.error('Failed to send processed email:', emailError);
        }
          break;

        case 'warn':
          // 警告アクションの実装
          if (!report.targetUserId || !ObjectId.isValid(report.targetUserId)) {
            return NextResponse.json({ 
              success: false, 
              message: 'Target user not found' 
            });
          }
          
          const targetUser = await usersCollection.findOneAndUpdate(
            { _id: new ObjectId(report.targetUserId) },
            { $inc: { warningCount: 1 } },
            { returnDocument: 'after' }
          );
          
          updateData.status = 'resolved';
          updateData.resolution = 'Warning issued';
          
          // 警告メール送信
          try {
            const { sendWarningEmail } = await import('@/lib/email');
            if (targetUser.value) {
              await sendWarningEmail(
                targetUser.value.email,
                targetUser.value.name || 'User',
                report.reason,
                targetUser.value.warningCount
              );
            }
          } catch (emailError) {
            console.error('Failed to send warning email:', emailError);
          }
          break;

        case 'add_note':
          await reportsCollection.updateOne(
            { _id: new ObjectId(reportId) },
            {
              $push: {
                internalNotes: {
                  note: notes,
                  addedBy: adminId,
                  addedAt: new Date()
                }
              },
              $set: { updatedAt: new Date() }
            }
          );
          
          return NextResponse.json({
            success: true,
            message: 'Note added successfully'
          });
      }
    }

    // 通報を更新
    await reportsCollection.updateOne(
      { _id: new ObjectId(reportId) },
      { $set: updateData }
    );

    // 監査ログに記録
    if (action) {
      await auditLogsCollection.insertOne({
        timestamp: new Date(),
        action: `REPORT_${action.toUpperCase()}`,
        adminId: adminId,
        targetId: reportId,
        details: {
          action,
          notes,
          resolutionAction: body.resolutionAction
        },
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        userAgent: request.headers.get('user-agent')
      });
    }

    return NextResponse.json({
      success: true,
      message: action ? `Report ${action} successfully` : 'Report updated successfully'
    });
  } catch (error) {
    console.error('Error updating report:', error);
    return NextResponse.json(
      { error: 'Failed to update report' },
      { status: 500 }
    );
  }
}