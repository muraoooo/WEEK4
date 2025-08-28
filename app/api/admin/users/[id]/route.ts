import { NextRequest, NextResponse } from 'next/server';
import connectDatabase from '@/lib/database';
import mongoose from 'mongoose';

// GET: ユーザー詳細の取得
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDatabase();
    
    const resolvedParams = await params;
    const userId = resolvedParams.id;
    const usersCollection = mongoose.connection.collection('users');
    const auditLogsCollection = mongoose.connection.collection('audit_logs');
    const sessionsCollection = mongoose.connection.collection('user_sessions');
    
    // ユーザー情報の取得（ObjectIdか文字列IDの両方に対応）
    let user = null;
    
    // まず文字列IDで検索
    user = await usersCollection.findOne({ _id: userId });
    
    // 見つからない場合、ObjectIdとして検索（24文字の16進数の場合のみ）
    if (!user && /^[0-9a-fA-F]{24}$/.test(userId)) {
      user = await usersCollection.findOne({
        _id: new mongoose.Types.ObjectId(userId)
      });
    }
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    // アクティビティ履歴の取得
    const activities = await sessionsCollection
      .find({ userId: userId })
      .sort({ createdAt: -1 })
      .limit(10)
      .toArray();
    
    // 監査ログの取得（このユーザーに関する操作）
    const auditLogs = await auditLogsCollection
      .find({ targetUserId: userId })
      .sort({ timestamp: -1 })
      .limit(20)
      .toArray();
    
    // 権限履歴の取得
    const roleHistory = await auditLogsCollection
      .find({
        targetUserId: userId,
        action: { $in: ['ROLE_CHANGE', 'PERMISSION_UPDATE'] }
      })
      .sort({ timestamp: -1 })
      .limit(10)
      .toArray();
    
    // 制裁履歴の取得
    const sanctionHistory = await auditLogsCollection
      .find({
        targetUserId: userId,
        action: { $in: ['WARNING', 'SUSPEND', 'BAN', 'REACTIVATE'] }
      })
      .sort({ timestamp: -1 })
      .limit(10)
      .toArray();
    
    // 統計情報の計算
    const stats = {
      totalSessions: await sessionsCollection.countDocuments({ userId: userId }),
      lastLogin: user.lastLogin || user.updatedAt,
      warningCount: await auditLogsCollection.countDocuments({
        targetUserId: userId,
        action: 'WARNING'
      }),
      suspensionCount: await auditLogsCollection.countDocuments({
        targetUserId: userId,
        action: 'SUSPEND'
      }),
    };
    
    return NextResponse.json({
      user: {
        _id: user._id,
        email: user.email,
        name: user.name || 'Unknown',
        role: user.role || 'user',
        status: user.status || 'active',
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        lastLogin: user.lastLogin,
        emailVerified: user.emailVerified || false,
        twoFactorEnabled: user.twoFactorEnabled || false,
        metadata: user.metadata || {},
      },
      activities,
      auditLogs,
      roleHistory,
      sanctionHistory,
      stats,
    });
  } catch (error) {
    console.error('User detail fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user details' },
      { status: 500 }
    );
  }
}

// PUT: ユーザー情報の更新
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDatabase();
    
    const resolvedParams = await params;
    const userId = resolvedParams.id;
    const body = await request.json();
    const { action, data, reason, adminId } = body;
    
    console.log('PUT request received:', { userId, action, data, reason, adminId });
    
    const usersCollection = mongoose.connection.collection('users');
    const auditLogsCollection = mongoose.connection.collection('audit_logs');
    
    // 現在のユーザー情報を取得（ObjectIdか文字列IDの両方に対応）
    let currentUser = null;
    
    console.log('Looking for user with ID:', userId);
    
    // ObjectIdとして検索を試みる（24文字の16進数の場合）
    if (/^[0-9a-fA-F]{24}$/.test(userId)) {
      try {
        currentUser = await usersCollection.findOne({
          _id: new mongoose.Types.ObjectId(userId)
        });
        console.log('Found user with ObjectId:', currentUser ? 'Yes' : 'No');
      } catch (err) {
        console.log('ObjectId conversion failed:', err);
      }
    }
    
    // それでも見つからない場合、文字列IDで検索
    if (!currentUser) {
      currentUser = await usersCollection.findOne({ _id: userId });
      console.log('Found user with string ID:', currentUser ? 'Yes' : 'No');
    }
    
    if (!currentUser) {
      console.log('User not found with ID:', userId);
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    console.log('Current user found:', { 
      id: currentUser._id, 
      email: currentUser.email,
      status: currentUser.status,
      warningCount: currentUser.warningCount 
    });
    
    let updateData: any = {};
    let auditAction = '';
    let auditDetails: any = {};
    
    switch (action) {
      case 'UPDATE_ROLE':
        // 権限の更新
        updateData = {
          role: data.role,
          updatedAt: new Date(),
        };
        auditAction = 'ROLE_CHANGE';
        auditDetails = {
          oldRole: currentUser.role,
          newRole: data.role,
          reason,
        };
        break;
      
      case 'WARNING':
        // 警告
        updateData = {
          warningCount: (currentUser.warningCount || 0) + 1,
          lastWarning: new Date(),
          updatedAt: new Date(),
        };
        auditAction = 'WARNING';
        auditDetails = {
          reason,
          warningNumber: (currentUser.warningCount || 0) + 1,
        };
        break;
      
      case 'SUSPEND':
        // 一時停止
        updateData = {
          status: 'suspended',
          suspendedAt: new Date(),
          suspendedUntil: data.until || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // デフォルト7日間
          updatedAt: new Date(),
        };
        auditAction = 'SUSPEND';
        auditDetails = {
          reason,
          until: data.until,
          duration: data.duration || '7 days',
        };
        break;
      
      case 'BAN':
        // 永久BAN
        updateData = {
          status: 'banned',
          bannedAt: new Date(),
          bannedReason: reason,
          updatedAt: new Date(),
        };
        auditAction = 'BAN';
        auditDetails = {
          reason,
          permanent: true,
        };
        break;
      
      case 'REACTIVATE':
        // アカウント復活
        updateData = {
          status: 'active',
          suspendedAt: null,
          suspendedUntil: null,
          bannedAt: null,
          bannedReason: null,
          updatedAt: new Date(),
        };
        auditAction = 'REACTIVATE';
        auditDetails = {
          reason,
          previousStatus: currentUser.status,
        };
        break;
      
      case 'UPDATE_INFO':
        // 基本情報の更新
        updateData = {
          ...data,
          updatedAt: new Date(),
        };
        auditAction = 'INFO_UPDATE';
        auditDetails = {
          updatedFields: Object.keys(data),
          reason,
        };
        break;
      
      default:
        console.error('Invalid action received:', action);
        return NextResponse.json(
          { error: `Invalid action: ${action}` },
          { status: 400 }
        );
    }
    
    // ユーザー情報を更新（currentUser._idをそのまま使用）
    console.log('Updating user with filter:', currentUser._id);
    console.log('Update data:', updateData);
    
    const result = await usersCollection.updateOne(
      { _id: currentUser._id },
      { $set: updateData }
    );
    
    console.log('Update result:', { 
      matchedCount: result.matchedCount, 
      modifiedCount: result.modifiedCount,
      acknowledged: result.acknowledged 
    });
    
    if (!result.acknowledged || result.matchedCount === 0) {
      console.error('Update failed - no documents matched');
      return NextResponse.json(
        { error: 'Failed to update user - no matching documents' },
        { status: 500 }
      );
    }
    
    // 監査ログを記録
    await auditLogsCollection.insertOne({
      timestamp: new Date(),
      action: auditAction,
      adminId: adminId || 'system',
      targetUserId: userId,
      targetUserEmail: currentUser.email,
      details: auditDetails,
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
    });
    
    // 更新後のユーザー情報を取得
    const updatedUser = await usersCollection.findOne({ _id: currentUser._id });
    
    return NextResponse.json({
      success: true,
      user: updatedUser,
      action: auditAction,
      message: `User ${action} completed successfully`,
    });
  } catch (error) {
    console.error('User update error:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to update user',
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

// DELETE: ユーザーの削除（論理削除）
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDatabase();
    
    const resolvedParams = await params;
    const userId = resolvedParams.id;
    const { reason, adminId } = await request.json();
    
    const usersCollection = mongoose.connection.collection('users');
    const auditLogsCollection = mongoose.connection.collection('audit_logs');
    
    // ユーザー情報を取得
    let user = await usersCollection.findOne({ _id: userId });
    if (!user && /^[0-9a-fA-F]{24}$/.test(userId)) {
      user = await usersCollection.findOne({
        _id: new mongoose.Types.ObjectId(userId)
      });
    }
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    // ユーザーを論理削除
    let filter: any = { _id: userId };
    if (!user._id.toString || user._id.toString() !== userId) {
      filter = { _id: user._id };
    }
    
    const result = await usersCollection.updateOne(
      filter,
      {
        $set: {
          status: 'deleted',
          deletedAt: new Date(),
          deletedReason: reason,
          updatedAt: new Date(),
        }
      }
    );
    
    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    // 監査ログを記録
    await auditLogsCollection.insertOne({
      timestamp: new Date(),
      action: 'USER_DELETE',
      adminId: adminId || 'system',
      targetUserId: userId,
      details: { reason },
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
    });
    
    return NextResponse.json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    console.error('User deletion error:', error);
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    );
  }
}