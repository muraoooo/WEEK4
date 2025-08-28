const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function updateUsers() {
  const client = new MongoClient(process.env.MONGODB_URI);

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db('embrocal');
    const usersCollection = db.collection('users');

    // すべてのユーザーを取得
    const users = await usersCollection.find({}).toArray();
    console.log(`Found ${users.length} users`);

    // 各ユーザーを更新
    for (const user of users) {
      const updateData = {};

      // roleフィールドがない場合は追加
      if (!user.role) {
        updateData.role = 'user'; // デフォルトでuserロールに設定
      }

      // statusフィールドがない場合は追加
      if (!user.status) {
        updateData.status = 'active';
      }

      // lastLoginフィールドがない場合は追加
      if (!user.lastLogin) {
        updateData.lastLogin = null;
      }

      // warningCountフィールドがない場合は追加
      if (user.warningCount === undefined) {
        updateData.warningCount = 0;
      }

      // emailVerifiedフィールドがない場合は追加
      if (user.emailVerified === undefined) {
        updateData.emailVerified = true; // デフォルトでtrueに設定
      }

      // twoFactorEnabledフィールドがない場合は追加
      if (user.twoFactorEnabled === undefined) {
        updateData.twoFactorEnabled = false;
      }

      // suspendedUntilフィールドがない場合は追加
      if (user.suspendedUntil === undefined) {
        updateData.suspendedUntil = null;
      }

      // bannedAtフィールドがない場合は追加
      if (user.bannedAt === undefined) {
        updateData.bannedAt = null;
      }

      // updatedAtを更新
      updateData.updatedAt = new Date();

      // 更新が必要な場合のみ実行
      if (Object.keys(updateData).length > 1) { // updatedAtは常に含まれるため
        await usersCollection.updateOne(
          { _id: user._id },
          { $set: updateData }
        );
        console.log(`Updated user: ${user.email}`);
      }
    }

    // ランダムにいくつかのユーザーのロールとステータスを変更（デモ用）
    const allUsers = await usersCollection.find({}).toArray();
    
    // いくつかのユーザーをadminやmoderatorに設定
    if (allUsers.length >= 5) {
      // 1人目をadminに
      await usersCollection.updateOne(
        { _id: allUsers[0]._id },
        { 
          $set: { 
            role: 'admin',
            email: allUsers[0].email // メールはそのまま
          } 
        }
      );
      console.log(`Set admin role for: ${allUsers[0].email}`);
      
      // 2-3人目をmoderatorに
      for (let i = 1; i <= 2 && i < allUsers.length; i++) {
        await usersCollection.updateOne(
          { _id: allUsers[i]._id },
          { 
            $set: { 
              role: 'moderator'
            } 
          }
        );
        console.log(`Set moderator role for: ${allUsers[i].email}`);
      }
    }
    
    const randomUsers = await usersCollection.find({}).limit(6).toArray();
    
    // 4人目を警告状態に
    if (randomUsers[3]) {
      await usersCollection.updateOne(
        { _id: randomUsers[3]._id },
        { 
          $set: { 
            warningCount: 2,
            lastLogin: new Date(Date.now() - 3600000) // 1時間前
          } 
        }
      );
      console.log(`Set warning for: ${randomUsers[3].email}`);
    }

    // 5人目を停止状態に
    if (randomUsers[4]) {
      await usersCollection.updateOne(
        { _id: randomUsers[4]._id },
        { 
          $set: { 
            status: 'suspended',
            suspendedUntil: new Date(Date.now() + 7 * 24 * 3600000), // 7日後まで
            lastLogin: new Date(Date.now() - 86400000) // 1日前
          } 
        }
      );
      console.log(`Suspended: ${randomUsers[4].email}`);
    }

    // 6人目を最近ログインした状態に
    if (randomUsers[5]) {
      await usersCollection.updateOne(
        { _id: randomUsers[5]._id },
        { 
          $set: { 
            lastLogin: new Date() // 今
          } 
        }
      );
      console.log(`Updated last login for: ${randomUsers[5].email}`);
    }

    console.log('User update completed!');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

updateUsers();