import { NextRequest, NextResponse } from 'next/server';
import { connectDatabase } from '@/lib/db';
import mongoose from 'mongoose';

export async function POST(request: NextRequest) {
  try {
    await connectDatabase();
    
    const body = await request.json();
    const { action, postIds, category } = body;
    
    if (!action || !postIds || !Array.isArray(postIds) || postIds.length === 0) {
      return NextResponse.json(
        { error: 'Invalid request parameters' },
        { status: 400 }
      );
    }
    
    const postsCollection = mongoose.connection.collection('posts');
    const auditLogsCollection = mongoose.connection.collection('audit_logs');
    
    // ObjectIDに変換
    const objectIds = postIds.map(id => {
      try {
        return new mongoose.Types.ObjectId(id);
      } catch {
        return null;
      }
    }).filter(id => id !== null);
    
    if (objectIds.length === 0) {
      return NextResponse.json(
        { error: 'Invalid post IDs' },
        { status: 400 }
      );
    }
    
    let updateOperation: any = {};
    let auditAction = '';
    
    switch (action) {
      case 'delete':
        updateOperation = {
          $set: {
            isDeleted: true,
            deletedAt: new Date(),
            deletedBy: 'admin_bulk_action',
          }
        };
        auditAction = 'BULK_DELETE';
        break;
        
      case 'hide':
        updateOperation = {
          $set: {
            isHidden: true,
            hiddenAt: new Date(),
            hiddenBy: 'admin_bulk_action',
          }
        };
        auditAction = 'BULK_HIDE';
        break;
        
      case 'unhide':
        updateOperation = {
          $set: {
            isHidden: false,
            hiddenAt: null,
          }
        };
        auditAction = 'BULK_UNHIDE';
        break;
        
      case 'restore':
        updateOperation = {
          $set: {
            isDeleted: false,
            deletedAt: null,
          }
        };
        auditAction = 'BULK_RESTORE';
        break;
        
      case 'categorize':
        if (!category) {
          return NextResponse.json(
            { error: 'Category is required for categorize action' },
            { status: 400 }
          );
        }
        updateOperation = {
          $set: {
            category: category,
            categorizedAt: new Date(),
          }
        };
        auditAction = 'BULK_CATEGORIZE';
        break;
        
      case 'clear_reports':
        updateOperation = {
          $set: {
            reported: false,
            reportCount: 0,
            reports: [],
          }
        };
        auditAction = 'BULK_CLEAR_REPORTS';
        break;
        
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
    
    // 一括更新を実行
    const result = await postsCollection.updateMany(
      { _id: { $in: objectIds } },
      { 
        ...updateOperation,
        $set: {
          ...updateOperation.$set,
          updatedAt: new Date(),
        }
      }
    );
    
    // 監査ログを記録
    await auditLogsCollection.insertOne({
      action: auditAction,
      adminId: 'admin',
      targetIds: postIds,
      targetType: 'posts',
      details: {
        action,
        affectedCount: result.modifiedCount,
        category: category || null,
      },
      timestamp: new Date(),
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
    });
    
    return NextResponse.json({
      success: true,
      message: `Successfully performed ${action} on ${result.modifiedCount} posts`,
      affectedCount: result.modifiedCount,
      matchedCount: result.matchedCount,
    });
  } catch (error) {
    console.error('Bulk action error:', error);
    return NextResponse.json(
      { error: 'Failed to perform bulk action' },
      { status: 500 }
    );
  }
}