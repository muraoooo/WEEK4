import { NextRequest, NextResponse } from 'next/server';
import { connectDatabase } from '@/lib/db';
import mongoose from 'mongoose';
import { getCached, setCached, generateCacheKey } from '@/lib/cache';

// GET: ユーザー一覧の取得（ページング、検索、フィルタ対応）
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20'); // デフォルトを20件に変更
    const search = searchParams.get('search') || '';
    const role = searchParams.get('role') || '';
    const status = searchParams.get('status') || '';
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') === 'asc' ? 1 : -1;
    
    // キャッシュキーの生成
    const cacheKey = generateCacheKey('users', {
      page, limit, search, role, status, sortBy, sortOrder
    });
    
    // キャッシュチェック（30秒間有効）
    const cached = getCached(cacheKey, 30000);
    if (cached) {
      return NextResponse.json(cached);
    }
    
    await connectDatabase();
    
    const usersCollection = mongoose.connection.collection('users');
    
    // クエリの構築
    const query: any = {};
    
    // 検索条件
    if (search) {
      query.$or = [
        { email: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } },
      ];
    }
    
    // フィルタ条件
    if (role) {
      query.role = role;
    }
    
    if (status) {
      query.status = status;
    }
    
    // ソート条件
    const sortOptions: any = {};
    sortOptions[sortBy] = sortOrder;
    
    // ページング計算
    const skip = (page - 1) * limit;
    
    // ユーザーデータの取得
    const [users, totalCount] = await Promise.all([
      usersCollection
        .find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .toArray(),
      usersCollection.countDocuments(query),
    ]);
    
    // usersがnullまたはundefinedの場合の対処
    if (!users) {
      return NextResponse.json({
        users: [],
        pagination: {
          page,
          limit,
          totalCount: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false,
        },
        filters: {
          search,
          role,
          status,
          sortBy,
          sortOrder: sortOrder === 1 ? 'asc' : 'desc',
        },
      });
    }
    
    // セッションデータを取得して最終ログイン情報を追加
    const sessionsCollection = mongoose.connection.collection('user_sessions');
    const userIds = users.map(user => user._id.toString());
    
    // 各ユーザーの最新セッション情報を取得
    const lastSessions = await Promise.all(
      userIds.map(userId => 
        sessionsCollection
          .findOne(
            { userId },
            { sort: { createdAt: -1 } }
          )
      )
    );
    
    // ユーザーデータの整形
    const formattedUsers = users.map((user, index) => {
      const lastSession = lastSessions[index];
      return {
        _id: user._id,
        email: user.email,
        name: user.name || 'Unknown',
        role: user.role || 'user',
        status: user.status || 'active',
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        lastLogin: lastSession?.createdAt || user.lastLogin || null,
        emailVerified: user.emailVerified || false,
        twoFactorEnabled: user.twoFactorEnabled || false,
        warningCount: user.warningCount || 0,
        suspendedUntil: user.suspendedUntil || null,
        bannedAt: user.bannedAt || null,
      };
    });
    
    // ページング情報
    const totalPages = Math.ceil(totalCount / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;
    
    const responseData = {
      users: formattedUsers,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNext,
        hasPrev,
      },
      filters: {
        search,
        role,
        status,
        sortBy,
        sortOrder: sortOrder === 1 ? 'asc' : 'desc',
      },
    };
    
    // キャッシュに保存
    setCached(cacheKey, responseData);
    
    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Users fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

// POST: 新規ユーザーの作成（管理者による手動作成）
export async function POST(request: NextRequest) {
  try {
    await connectDatabase();
    
    const body = await request.json();
    const { email, name, role, password, adminId } = body;
    
    const usersCollection = mongoose.connection.collection('users');
    const auditLogsCollection = mongoose.connection.collection('audit_logs');
    
    // メールアドレスの重複チェック
    const existingUser = await usersCollection.findOne({ email });
    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      );
    }
    
    // パスワードのハッシュ化
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // 新規ユーザーの作成
    const newUser = {
      email,
      name: name || email.split('@')[0],
      password: hashedPassword,
      role: role || 'user',
      status: 'active',
      emailVerified: true, // 管理者作成の場合は検証済みとする
      twoFactorEnabled: false,
      warningCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: adminId,
    };
    
    const result = await usersCollection.insertOne(newUser);
    
    // 監査ログの記録
    await auditLogsCollection.insertOne({
      timestamp: new Date(),
      action: 'USER_CREATE',
      adminId: adminId || 'system',
      targetUserId: result.insertedId.toString(),
      targetUserEmail: email,
      details: {
        role,
        createdBy: 'admin',
      },
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
    });
    
    return NextResponse.json({
      success: true,
      user: {
        _id: result.insertedId,
        ...newUser,
      },
    });
  } catch (error) {
    console.error('User creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    );
  }
}

// PATCH: 一括操作（複数ユーザーへの一括アクション）
export async function PATCH(request: NextRequest) {
  try {
    await connectDatabase();
    
    const body = await request.json();
    const { userIds, action, data, reason, adminId } = body;
    
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json(
        { error: 'Invalid user IDs' },
        { status: 400 }
      );
    }
    
    const usersCollection = mongoose.connection.collection('users');
    const auditLogsCollection = mongoose.connection.collection('audit_logs');
    
    const objectIds = userIds.map(id => new mongoose.Types.ObjectId(id));
    
    let updateData: any = {};
    let auditAction = '';
    
    switch (action) {
      case 'BULK_ROLE_UPDATE':
        updateData = {
          role: data.role,
          updatedAt: new Date(),
        };
        auditAction = 'BULK_ROLE_CHANGE';
        break;
      
      case 'BULK_SUSPEND':
        updateData = {
          status: 'suspended',
          suspendedAt: new Date(),
          suspendedUntil: data.until || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          updatedAt: new Date(),
        };
        auditAction = 'BULK_SUSPEND';
        break;
      
      case 'BULK_REACTIVATE':
        updateData = {
          status: 'active',
          suspendedAt: null,
          suspendedUntil: null,
          bannedAt: null,
          bannedReason: null,
          updatedAt: new Date(),
        };
        auditAction = 'BULK_REACTIVATE';
        break;
      
      case 'BULK_DELETE':
        updateData = {
          status: 'deleted',
          deletedAt: new Date(),
          deletedReason: reason,
          updatedAt: new Date(),
        };
        auditAction = 'BULK_DELETE';
        break;
      
      default:
        return NextResponse.json(
          { error: 'Invalid bulk action' },
          { status: 400 }
        );
    }
    
    // 一括更新の実行
    const result = await usersCollection.updateMany(
      { _id: { $in: objectIds } },
      { $set: updateData }
    );
    
    // 各ユーザーに対して監査ログを記録
    const auditLogs = userIds.map(userId => ({
      timestamp: new Date(),
      action: auditAction,
      adminId: adminId || 'system',
      targetUserId: userId,
      details: {
        reason,
        bulkOperation: true,
        affectedCount: result.modifiedCount,
        ...data,
      },
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
    }));
    
    if (auditLogs.length > 0) {
      await auditLogsCollection.insertMany(auditLogs);
    }
    
    return NextResponse.json({
      success: true,
      modifiedCount: result.modifiedCount,
      matchedCount: result.matchedCount,
      action: auditAction,
      message: `Bulk ${action} completed for ${result.modifiedCount} users`,
    });
  } catch (error) {
    console.error('Bulk operation error:', error);
    return NextResponse.json(
      { error: 'Failed to perform bulk operation' },
      { status: 500 }
    );
  }
}

// DELETE: ユーザーの一括削除
export async function DELETE(request: NextRequest) {
  try {
    await connectDatabase();
    
    const { searchParams } = new URL(request.url);
    const userIds = searchParams.get('userIds')?.split(',') || [];
    const adminId = searchParams.get('adminId') || 'system';
    const reason = searchParams.get('reason') || 'Bulk deletion';
    
    if (userIds.length === 0) {
      return NextResponse.json(
        { error: 'No user IDs provided' },
        { status: 400 }
      );
    }
    
    const usersCollection = mongoose.connection.collection('users');
    const auditLogsCollection = mongoose.connection.collection('audit_logs');
    
    const objectIds = userIds.map(id => new mongoose.Types.ObjectId(id));
    
    // 論理削除の実行
    const result = await usersCollection.updateMany(
      { _id: { $in: objectIds } },
      {
        $set: {
          status: 'deleted',
          deletedAt: new Date(),
          deletedReason: reason,
          updatedAt: new Date(),
        }
      }
    );
    
    // 監査ログの記録
    const auditLogs = userIds.map(userId => ({
      timestamp: new Date(),
      action: 'BULK_DELETE',
      adminId,
      targetUserId: userId,
      details: {
        reason,
        bulkOperation: true,
      },
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
    }));
    
    if (auditLogs.length > 0) {
      await auditLogsCollection.insertMany(auditLogs);
    }
    
    return NextResponse.json({
      success: true,
      deletedCount: result.modifiedCount,
      message: `${result.modifiedCount} users deleted successfully`,
    });
  } catch (error) {
    console.error('Bulk deletion error:', error);
    return NextResponse.json(
      { error: 'Failed to delete users' },
      { status: 500 }
    );
  }
}