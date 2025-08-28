const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function updateUserStatus() {
  const client = new MongoClient(process.env.MONGODB_URI);

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db('embrocal');
    const usersCollection = db.collection('users');

    // 全ユーザーを取得
    const users = await usersCollection.find({}).toArray();
    console.log(`Found ${users.length} users`);

    // 異なるステータスを設定するためにユーザーを選択
    if (users.length >= 10) {
      // 1-3人目: 通常のアクティブユーザー（すでに設定済み）
      
      // 4人目: 警告回数2
      await usersCollection.updateOne(
        { _id: users[3]._id },
        { 
          $set: { 
            warningCount: 2,
            lastLogin: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) // 2日前
          } 
        }
      );
      console.log(`Set warning count for: ${users[3].email}`);

      // 5人目: 警告回数1
      await usersCollection.updateOne(
        { _id: users[4]._id },
        { 
          $set: { 
            warningCount: 1,
            lastLogin: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) // 5日前
          } 
        }
      );
      console.log(`Set warning count for: ${users[4].email}`);

      // 6人目: 停止中
      await usersCollection.updateOne(
        { _id: users[5]._id },
        { 
          $set: { 
            status: 'suspended',
            suspendedUntil: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3日後まで
            lastLogin: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) // 10日前
          } 
        }
      );
      console.log(`Suspended: ${users[5].email}`);

      // 7人目: BAN
      await usersCollection.updateOne(
        { _id: users[6]._id },
        { 
          $set: { 
            status: 'banned',
            bannedAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1日前にBAN
            lastLogin: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 30日前
          } 
        }
      );
      console.log(`Banned: ${users[6].email}`);

      // 8人目: 削除済み
      await usersCollection.updateOne(
        { _id: users[7]._id },
        { 
          $set: { 
            status: 'deleted',
            deletedAt: new Date(),
            lastLogin: null
          } 
        }
      );
      console.log(`Marked as deleted: ${users[7].email}`);

      // 9-10人目: 最近ログインしたアクティブユーザー
      for (let i = 8; i < 10 && i < users.length; i++) {
        await usersCollection.updateOne(
          { _id: users[i]._id },
          { 
            $set: { 
              lastLogin: new Date(Date.now() - Math.random() * 3 * 60 * 60 * 1000) // 0-3時間前
            } 
          }
        );
        console.log(`Updated recent login for: ${users[i].email}`);
      }
    }

    // ログイン試行データを作成（login_attemptsコレクション用）
    const loginAttemptsCollection = db.collection('login_attempts');
    
    // 既存のログイン試行データをクリア
    await loginAttemptsCollection.deleteMany({});
    
    // サンプルログイン試行データを挿入
    const loginAttempts = [];
    for (let i = 0; i < Math.min(5, users.length); i++) {
      const user = users[i];
      loginAttempts.push({
        userId: user._id,
        email: user.email,
        ipAddress: `192.168.1.${100 + i}`,
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        success: true,
        timestamp: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000), // 過去7日間のランダムな時刻
      });
      
      // いくつか失敗したログイン試行も追加
      if (i % 2 === 0) {
        loginAttempts.push({
          userId: user._id,
          email: user.email,
          ipAddress: `192.168.1.${200 + i}`,
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          success: false,
          timestamp: new Date(Date.now() - Math.random() * 3 * 24 * 60 * 60 * 1000),
          reason: 'Invalid password'
        });
      }
    }
    
    if (loginAttempts.length > 0) {
      await loginAttemptsCollection.insertMany(loginAttempts);
      console.log(`\nInserted ${loginAttempts.length} login attempts`);
    }

    // ユーザーセッションデータも作成
    const sessionsCollection = db.collection('user_sessions');
    
    // 既存のセッションをクリア
    await sessionsCollection.deleteMany({});
    
    // アクティブなユーザーにセッションを作成
    const sessions = [];
    const activeUsers = users.filter(u => u.status === 'active' || !u.status).slice(0, 20);
    
    const userAgents = [
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1',
      'Mozilla/5.0 (iPad; CPU OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/92.0.4515.90 Mobile/15E148 Safari/604.1',
      'Mozilla/5.0 (Android 11; Mobile; rv:90.0) Gecko/90.0 Firefox/90.0',
    ];
    
    for (let i = 0; i < activeUsers.length; i++) {
      const user = activeUsers[i];
      const now = Date.now();
      
      // さまざまな時間帯のセッションを作成
      const createdOffset = i < 5 ? Math.random() * 60 * 60 * 1000 : // 1時間以内
                           i < 10 ? Math.random() * 6 * 60 * 60 * 1000 : // 6時間以内
                           i < 15 ? Math.random() * 24 * 60 * 60 * 1000 : // 24時間以内
                           Math.random() * 3 * 24 * 60 * 60 * 1000; // 3日以内
      
      const createdAt = new Date(now - createdOffset);
      const lastActivity = new Date(createdAt.getTime() + Math.random() * createdOffset * 0.5);
      
      // 一部のセッションは期限切れに
      const expiresOffset = i < 15 ? 7 * 24 * 60 * 60 * 1000 : // 7日後（アクティブ）
                           i < 18 ? -60 * 60 * 1000 : // 1時間前（期限切れ）
                           -24 * 60 * 60 * 1000; // 1日前（期限切れ）
      
      sessions.push({
        sessionId: `session_${user._id}_${now}_${i}`,
        userId: user._id.toString(),
        token: `token_${user._id}_${now}_${i}`,
        createdAt: createdAt,
        lastActivity: lastActivity,
        expiresAt: new Date(now + expiresOffset),
        ipAddress: `192.168.${Math.floor(i / 10)}.${Math.floor(Math.random() * 255)}`,
        userAgent: userAgents[i % userAgents.length],
        isActive: i < 15, // 最初の15セッションはアクティブ
      });
    }
    
    if (sessions.length > 0) {
      await sessionsCollection.insertMany(sessions);
      console.log(`Inserted ${sessions.length} user sessions`);
    }

    console.log('\nUser status update completed!');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

updateUserStatus();