import { NextRequest, NextResponse } from 'next/server';
import { connectDatabase } from '@/lib/db';

// GET: 特定の通報の詳細取得
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // 管理者権限確認
    const isAdmin = request.headers.get('x-admin-secret') === process.env.ADMIN_SECRET_KEY;
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // paramsをawaitで取得
    const params = await context.params;
    const reportId = params.id;

    await connectDatabase();
    const mongoose = require('mongoose');
    const ObjectId = mongoose.Types.ObjectId;
    const reportsCollection = mongoose.connection.collection('reports');
    const usersCollection = mongoose.connection.collection('users');
    const postsCollection = mongoose.connection.collection('posts');

    // IDの妥当性チェック
    if (!ObjectId.isValid(reportId)) {
      return NextResponse.json(
        { error: 'Invalid report ID' },
        { status: 404 }
      );
    }

    // 通報詳細取得
    const report = await reportsCollection.findOne({
      _id: new ObjectId(reportId)
    });

    if (!report) {
      return NextResponse.json(
        { error: 'Report not found' },
        { status: 404 }
      );
    }

    // 通報者の情報取得
    let reporter = null;
    if (report.reporterId && ObjectId.isValid(report.reporterId)) {
      try {
        reporter = await usersCollection.findOne({
          _id: new ObjectId(report.reporterId)
        });
      } catch (err) {
        console.log('Could not find reporter');
      }
    }

    // ターゲットの情報取得
    let targetDetails = null;
    if (report.targetId && ObjectId.isValid(report.targetId)) {
      try {
        if (report.reportType === 'post') {
          targetDetails = await postsCollection.findOne({
            _id: new ObjectId(report.targetId)
          });
        } else if (report.reportType === 'user') {
          targetDetails = await usersCollection.findOne({
            _id: new ObjectId(report.targetId)
          });
        }
      } catch (err) {
        console.log('Could not find target details');
      }
    }

    // ターゲットユーザーの情報取得
    let targetUser = null;
    if (report.targetUserId && ObjectId.isValid(report.targetUserId)) {
      try {
        targetUser = await usersCollection.findOne({
          _id: new ObjectId(report.targetUserId)
        });
      } catch (err) {
        console.log('Could not find target user');
      }
    }

    // 同じターゲットへの他の通報取得
    const relatedReports = await reportsCollection
      .find({
        targetId: report.targetId,
        _id: { $ne: report._id }
      })
      .sort({ createdAt: -1 })
      .limit(10)
      .toArray();

    // レビューアーの情報取得
    let reviewer = null;
    if (report.reviewedBy && ObjectId.isValid(report.reviewedBy)) {
      try {
        reviewer = await usersCollection.findOne({
          _id: new ObjectId(report.reviewedBy)
        });
      } catch (err) {
        console.log('Could not find reviewer');
      }
    }

    // アサイン担当者の情報取得
    let assignee = null;
    if (report.assignedTo && ObjectId.isValid(report.assignedTo)) {
      try {
        assignee = await usersCollection.findOne({
          _id: new ObjectId(report.assignedTo)
        });
      } catch (err) {
        console.log('Could not find assignee');
      }
    }

    return NextResponse.json({
      report: {
        _id: report._id.toString(),
        reportType: report.reportType,
        targetId: report.targetId,
        targetContent: report.targetContent,
        reason: report.reason,
        reasonDetails: report.reasonDetails,
        status: report.status,
        priority: report.priority,
        resolution: report.resolution,
        internalNotes: report.internalNotes || [],
        evidence: report.evidence || [],
        createdAt: report.createdAt,
        updatedAt: report.updatedAt,
        assignedAt: report.assignedAt,
        reviewedAt: report.reviewedAt
      },
      reporter: reporter ? {
        _id: reporter._id.toString(),
        email: reporter.email,
        name: reporter.name,
        status: reporter.status,
        warningCount: reporter.warningCount || 0
      } : null,
      targetUser: targetUser ? {
        _id: targetUser._id.toString(),
        email: targetUser.email,
        name: targetUser.name,
        status: targetUser.status,
        warningCount: targetUser.warningCount || 0,
        createdAt: targetUser.createdAt
      } : null,
      targetDetails,
      reviewer: reviewer ? {
        _id: reviewer._id.toString(),
        email: reviewer.email,
        name: reviewer.name
      } : null,
      assignee: assignee ? {
        _id: assignee._id.toString(),
        email: assignee.email,
        name: assignee.name
      } : null,
      relatedReports: relatedReports.map((r: any) => ({
        _id: r._id.toString(),
        reason: r.reason,
        status: r.status,
        createdAt: r.createdAt
      }))
    });
  } catch (error) {
    console.error('Error fetching report details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch report details' },
      { status: 500 }
    );
  }
}