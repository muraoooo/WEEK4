const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function createAuditLogs() {
  const client = new MongoClient(process.env.MONGODB_URI);

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db('embrocal');
    const usersCollection = db.collection('users');
    const auditLogsCollection = db.collection('audit_logs');
    const sessionsCollection = db.collection('user_sessions');

    // テスト用のユーザーIDを取得
    const testUser = await usersCollection.findOne({ email: 'muraooo0302+test004@gmail.com' });
    
    if (!testUser) {
      console.log('Test user not found. Please create muraooo0302+test004@gmail.com first.');
      return;
    }

    const userId = testUser._id.toString();
    console.log(`Creating audit logs for user: ${testUser.email} (${userId})`);

    // 既存の監査ログをクリア（このユーザーに関するもののみ）
    await auditLogsCollection.deleteMany({ targetUserId: userId });
    console.log('Cleared existing audit logs for this user');

    // 1. 権限変更履歴を作成
    const roleHistory = [
      {
        _id: new ObjectId(),
        timestamp: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30日前
        action: 'ROLE_CHANGE',
        adminId: 'admin-001',
        targetUserId: userId,
        targetUserEmail: testUser.email,
        details: {
          oldRole: 'user',
          newRole: 'moderator',
          reason: '優秀なコミュニティ貢献により昇格'
        },
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Macintosh)'
      },
      {
        _id: new ObjectId(),
        timestamp: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15日前
        action: 'PERMISSION_UPDATE',
        adminId: 'admin-002',
        targetUserId: userId,
        targetUserEmail: testUser.email,
        details: {
          permissions: ['content_moderation', 'user_support'],
          added: ['content_moderation'],
          removed: [],
          reason: 'モデレーター権限の付与'
        },
        ipAddress: '192.168.1.101',
        userAgent: 'Mozilla/5.0 (Windows NT)'
      },
      {
        _id: new ObjectId(),
        timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7日前
        action: 'ROLE_CHANGE',
        adminId: 'admin-001',
        targetUserId: userId,
        targetUserEmail: testUser.email,
        details: {
          oldRole: 'moderator',
          newRole: 'user',
          reason: 'テスト期間終了'
        },
        ipAddress: '192.168.1.102',
        userAgent: 'Mozilla/5.0 (Macintosh)'
      }
    ];

    // 2. 制裁履歴を作成
    const sanctionHistory = [
      {
        _id: new ObjectId(),
        timestamp: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), // 60日前
        action: 'WARNING',
        adminId: 'admin-003',
        targetUserId: userId,
        targetUserEmail: testUser.email,
        details: {
          reason: 'スパム投稿の疑い',
          warningLevel: 1,
          message: '利用規約に違反する可能性のある投稿を確認しました。'
        },
        ipAddress: '192.168.1.103',
        userAgent: 'Mozilla/5.0 (iPhone)'
      },
      {
        _id: new ObjectId(),
        timestamp: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000), // 45日前
        action: 'WARNING',
        adminId: 'admin-001',
        targetUserId: userId,
        targetUserEmail: testUser.email,
        details: {
          reason: '不適切な言語の使用',
          warningLevel: 2,
          message: '他のユーザーに対する不適切な言語の使用を確認しました。'
        },
        ipAddress: '192.168.1.104',
        userAgent: 'Mozilla/5.0 (iPad)'
      },
      {
        _id: new ObjectId(),
        timestamp: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000), // 25日前
        action: 'SUSPEND',
        adminId: 'admin-002',
        targetUserId: userId,
        targetUserEmail: testUser.email,
        details: {
          reason: '繰り返しの規約違反',
          duration: 3 * 24 * 60 * 60 * 1000, // 3日間
          suspendedUntil: new Date(Date.now() - 22 * 24 * 60 * 60 * 1000),
          message: '複数回の警告にもかかわらず、規約違反が続いたため一時停止処分とします。'
        },
        ipAddress: '192.168.1.105',
        userAgent: 'Mozilla/5.0 (Android)'
      },
      {
        _id: new ObjectId(),
        timestamp: new Date(Date.now() - 22 * 24 * 60 * 60 * 1000), // 22日前
        action: 'REACTIVATE',
        adminId: 'admin-001',
        targetUserId: userId,
        targetUserEmail: testUser.email,
        details: {
          reason: '停止期間終了',
          message: 'アカウントの停止期間が終了しました。今後は利用規約を遵守してください。'
        },
        ipAddress: '192.168.1.106',
        userAgent: 'Mozilla/5.0 (Linux)'
      }
    ];

    // 3. その他の監査ログ
    const otherLogs = [
      {
        _id: new ObjectId(),
        timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5日前
        action: 'PASSWORD_RESET',
        adminId: 'admin-001',
        targetUserId: userId,
        targetUserEmail: testUser.email,
        details: {
          requestedBy: 'admin',
          reason: 'ユーザーからのリクエスト'
        },
        ipAddress: '192.168.1.107',
        userAgent: 'Mozilla/5.0'
      },
      {
        _id: new ObjectId(),
        timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3日前
        action: 'EMAIL_VERIFICATION',
        adminId: 'system',
        targetUserId: userId,
        targetUserEmail: testUser.email,
        details: {
          verified: true,
          method: 'email_link'
        },
        ipAddress: '192.168.1.108',
        userAgent: 'Mozilla/5.0'
      },
      {
        _id: new ObjectId(),
        timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1日前
        action: 'PROFILE_UPDATE',
        adminId: 'admin-002',
        targetUserId: userId,
        targetUserEmail: testUser.email,
        details: {
          fields: ['name', 'bio'],
          oldValues: { name: 'だいち４', bio: '' },
          newValues: { name: 'だいち４', bio: 'テストユーザーです' }
        },
        ipAddress: '192.168.1.109',
        userAgent: 'Mozilla/5.0'
      }
    ];

    // 4. アクティビティ（セッション）履歴を作成
    const activities = [];
    for (let i = 0; i < 10; i++) {
      const daysAgo = i * 2; // 2日おき
      activities.push({
        _id: new ObjectId(),
        sessionId: `session_${userId}_${Date.now() - i}`,
        userId: userId,
        token: `token_${userId}_${Date.now() - i}`,
        createdAt: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000),
        lastActivity: new Date(Date.now() - (daysAgo * 24 - 2) * 60 * 60 * 1000), // 2時間活動
        expiresAt: new Date(Date.now() - (daysAgo - 1) * 24 * 60 * 60 * 1000),
        ipAddress: `192.168.1.${110 + i}`,
        userAgent: i % 2 === 0 
          ? 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
          : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        isActive: i === 0, // 最新のセッションのみアクティブ
        deviceType: i % 3 === 0 ? 'mobile' : i % 3 === 1 ? 'tablet' : 'desktop',
        location: ['東京', '大阪', '名古屋', '福岡', '札幌'][i % 5]
      });
    }

    // データベースに挿入
    console.log('Inserting role history...');
    await auditLogsCollection.insertMany(roleHistory);
    console.log(`Inserted ${roleHistory.length} role history records`);

    console.log('Inserting sanction history...');
    await auditLogsCollection.insertMany(sanctionHistory);
    console.log(`Inserted ${sanctionHistory.length} sanction history records`);

    console.log('Inserting other audit logs...');
    await auditLogsCollection.insertMany(otherLogs);
    console.log(`Inserted ${otherLogs.length} other audit logs`);

    console.log('Inserting activity sessions...');
    await sessionsCollection.insertMany(activities);
    console.log(`Inserted ${activities.length} activity sessions`);

    // 統計情報の確認
    const stats = {
      totalAuditLogs: await auditLogsCollection.countDocuments({ targetUserId: userId }),
      warnings: await auditLogsCollection.countDocuments({ targetUserId: userId, action: 'WARNING' }),
      suspensions: await auditLogsCollection.countDocuments({ targetUserId: userId, action: 'SUSPEND' }),
      roleChanges: await auditLogsCollection.countDocuments({ targetUserId: userId, action: 'ROLE_CHANGE' }),
      sessions: await sessionsCollection.countDocuments({ userId: userId })
    };

    console.log('\n=== Statistics ===');
    console.log(`Total audit logs: ${stats.totalAuditLogs}`);
    console.log(`Warnings: ${stats.warnings}`);
    console.log(`Suspensions: ${stats.suspensions}`);
    console.log(`Role changes: ${stats.roleChanges}`);
    console.log(`Sessions: ${stats.sessions}`);

    console.log('\nAudit logs and activities created successfully!');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

createAuditLogs();