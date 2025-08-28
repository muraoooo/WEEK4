const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');

// MongoDB接続URI
const MONGODB_URI = 'mongodb+srv://adimin:gpt5love@cluster0.zu4p8ot.mongodb.net/embrocal?retryWrites=true&w=majority&appName=Cluster0';

async function createAdminUser() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    console.log('MongoDB に接続中...');
    await client.connect();
    console.log('MongoDB に接続成功');
    
    const db = client.db('embrocal');
    const usersCollection = db.collection('users');
    
    // 既存のadminユーザーをチェック
    const existingAdmin = await usersCollection.findOne({ email: 'admin@example.com' });
    
    if (existingAdmin) {
      console.log('管理者ユーザーは既に存在します。パスワードを更新します...');
      
      // パスワードをハッシュ化
      const hashedPassword = await bcrypt.hash('Admin123!@#', 10);
      
      // パスワードとロールを更新
      const updateResult = await usersCollection.updateOne(
        { email: 'admin@example.com' },
        {
          $set: {
            password: hashedPassword,
            role: 'admin',
            status: 'active',
            updatedAt: new Date()
          }
        }
      );
      
      console.log('管理者ユーザーのパスワードを更新しました');
      console.log('更新結果:', updateResult);
    } else {
      console.log('新しい管理者ユーザーを作成中...');
      
      // パスワードをハッシュ化
      const hashedPassword = await bcrypt.hash('Admin123!@#', 10);
      
      // 新しい管理者ユーザーを作成
      const newAdmin = {
        email: 'admin@example.com',
        name: 'System Administrator',
        password: hashedPassword,
        role: 'admin',
        status: 'active',
        warningCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        emailVerified: true
      };
      
      const insertResult = await usersCollection.insertOne(newAdmin);
      console.log('管理者ユーザーを作成しました');
      console.log('作成結果:', insertResult);
    }
    
    // デバッグ用：作成/更新されたユーザーを確認
    const adminUser = await usersCollection.findOne({ email: 'admin@example.com' });
    console.log('\n現在の管理者ユーザー情報:');
    console.log('- Email:', adminUser.email);
    console.log('- Name:', adminUser.name);
    console.log('- Role:', adminUser.role);
    console.log('- Status:', adminUser.status);
    console.log('- Password hash exists:', !!adminUser.password);
    
    // パスワードの検証テスト
    const isPasswordValid = await bcrypt.compare('Admin123!@#', adminUser.password);
    console.log('- Password verification test:', isPasswordValid ? 'PASSED' : 'FAILED');
    
    console.log('\n✅ セットアップ完了!');
    console.log('ログイン情報:');
    console.log('  Email: admin@example.com');
    console.log('  Password: Admin123!@#');
    
  } catch (error) {
    console.error('エラーが発生しました:', error);
  } finally {
    await client.close();
    console.log('\nMongoDBから切断しました');
  }
}

createAdminUser();