import { NextRequest, NextResponse } from 'next/server';
import connectDatabase from '@/lib/database';
import mongoose from 'mongoose';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDatabase();

    const { id: postId } = await params;
    const body = await request.json();
    const { reportId, action } = body;

    if (!postId || !mongoose.Types.ObjectId.isValid(postId)) {
      return NextResponse.json(
        { error: 'Invalid post ID' },
        { status: 400 }
      );
    }

    if (!reportId || !action) {
      return NextResponse.json(
        { error: 'Report ID and action are required' },
        { status: 400 }
      );
    }

    if (!['reviewed', 'resolved'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      );
    }

    const reportsCollection = mongoose.connection.collection('reports');
    const auditLogsCollection = mongoose.connection.collection('audit_logs');

    // Update report status
    const result = await reportsCollection.updateOne(
      { 
        _id: new mongoose.Types.ObjectId(reportId),
        targetId: new mongoose.Types.ObjectId(postId),
        targetType: 'post'
      },
      { 
        $set: {
          status: action,
          updatedAt: new Date(),
          reviewedAt: new Date(),
          reviewedBy: 'admin'
        }
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: 'Report not found' },
        { status: 404 }
      );
    }

    // Create audit log
    await auditLogsCollection.insertOne({
      action: `REPORT_${action.toUpperCase()}`,
      adminId: 'admin',
      targetId: postId,
      targetType: 'post',
      details: {
        reportId,
        action,
        status: action
      },
      timestamp: new Date(),
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    });

    return NextResponse.json({
      success: true,
      message: `Report ${action} successfully`
    });
  } catch (error) {
    console.error('Report update error:', error);
    return NextResponse.json(
      { error: 'Failed to update report' },
      { status: 500 }
    );
  }
}