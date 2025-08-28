/**
 * MongoDB インデックス作成スクリプト
 * パフォーマンス最適化のために必要なインデックスを作成
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function createIndexes() {
  try {
    // MongoDBに接続
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/secure_session_db', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ MongoDB接続成功');
    
    const db = mongoose.connection.db;
    
    // ユーザーコレクションのインデックス
    const usersCollection = db.collection('users');
    console.log('\n📚 ユーザーコレクションのインデックス作成中...');
    
    await usersCollection.createIndex({ email: 1 }, { unique: true });
    await usersCollection.createIndex({ status: 1, createdAt: -1 });
    await usersCollection.createIndex({ role: 1 });
    await usersCollection.createIndex({ warningCount: -1 });
    await usersCollection.createIndex({ createdAt: -1 });
    console.log('✅ ユーザーインデックス作成完了');
    
    // 投稿コレクションのインデックス
    const postsCollection = db.collection('posts');
    console.log('\n📚 投稿コレクションのインデックス作成中...');
    
    await postsCollection.createIndex({ createdAt: -1 });
    await postsCollection.createIndex({ authorId: 1 });
    await postsCollection.createIndex({ isDeleted: 1, isHidden: 1 });
    await postsCollection.createIndex({ reported: 1, reportCount: -1 });
    await postsCollection.createIndex({ category: 1 });
    await postsCollection.createIndex({ aiModerationScore: -1 });
    await postsCollection.createIndex({ 
      content: 'text', 
      authorName: 'text', 
      authorEmail: 'text' 
    });
    console.log('✅ 投稿インデックス作成完了');
    
    // 通報コレクションのインデックス
    const reportsCollection = db.collection('reports');
    console.log('\n📚 通報コレクションのインデックス作成中...');
    
    await reportsCollection.createIndex({ status: 1, priority: -1, createdAt: -1 });
    await reportsCollection.createIndex({ reportType: 1 });
    await reportsCollection.createIndex({ targetId: 1 });
    await reportsCollection.createIndex({ reporterId: 1 });
    await reportsCollection.createIndex({ assignedTo: 1 });
    await reportsCollection.createIndex({ createdAt: -1 });
    await reportsCollection.createIndex({ 
      targetId: 1, 
      reporterId: 1, 
      status: 1 
    }, { unique: false });
    console.log('✅ 通報インデックス作成完了');
    
    // コメントコレクションのインデックス
    const commentsCollection = db.collection('comments');
    console.log('\n📚 コメントコレクションのインデックス作成中...');
    
    await commentsCollection.createIndex({ postId: 1, createdAt: -1 });
    await commentsCollection.createIndex({ userId: 1 });
    await commentsCollection.createIndex({ createdAt: -1 });
    console.log('✅ コメントインデックス作成完了');
    
    // セッションコレクションのインデックス
    const sessionsCollection = db.collection('user_sessions');
    console.log('\n📚 セッションコレクションのインデックス作成中...');
    
    await sessionsCollection.createIndex({ userId: 1, createdAt: -1 });
    await sessionsCollection.createIndex({ sessionToken: 1 }, { unique: true });
    await sessionsCollection.createIndex({ isActive: 1 });
    await sessionsCollection.createIndex({ expiresAt: 1 });
    await sessionsCollection.createIndex({ 
      expiresAt: 1 
    }, { 
      expireAfterSeconds: 0 // TTLインデックス
    });
    console.log('✅ セッションインデックス作成完了');
    
    // 監査ログコレクションのインデックス
    const auditLogsCollection = db.collection('audit_logs');
    console.log('\n📚 監査ログコレクションのインデックス作成中...');
    
    await auditLogsCollection.createIndex({ timestamp: -1 });
    await auditLogsCollection.createIndex({ action: 1 });
    await auditLogsCollection.createIndex({ adminId: 1 });
    await auditLogsCollection.createIndex({ targetUserId: 1 });
    await auditLogsCollection.createIndex({ 
      timestamp: -1 
    }, { 
      expireAfterSeconds: 90 * 24 * 60 * 60 // 90日後に自動削除
    });
    console.log('✅ 監査ログインデックス作成完了');
    
    console.log('\n🎉 すべてのインデックスが正常に作成されました！');
    
    // 作成されたインデックスを確認
    console.log('\n📋 作成済みインデックス一覧:');
    const collections = ['users', 'posts', 'reports', 'comments', 'user_sessions', 'audit_logs'];
    
    for (const collName of collections) {
      const coll = db.collection(collName);
      const indexes = await coll.indexes();
      console.log(`\n${collName}:`);
      indexes.forEach(index => {
        if (index.name !== '_id_') {
          console.log(`  - ${index.name}: ${JSON.stringify(index.key)}`);
        }
      });
    }
    
  } catch (error) {
    console.error('❌ エラー:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n👋 MongoDB接続を終了しました');
  }
}

// スクリプトを実行
createIndexes();