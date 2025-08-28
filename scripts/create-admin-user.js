const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://adimin:gpt5love@cluster0.zu4p8ot.mongodb.net/embrocal?retryWrites=true&w=majority&appName=Cluster0';

async function createAdminUser() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db('embrocal');
    const usersCollection = db.collection('users');
    
    // 既存の管理者を確認
    const existingAdmin = await usersCollection.findOne({ email: 'admin@example.com' });
    
    if (existingAdmin) {
      console.log('Admin user already exists');
      
      // パスワードを更新
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await usersCollection.updateOne(
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
      console.log('Admin password updated');
    } else {
      // 新しい管理者ユーザーを作成
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      await usersCollection.insertOne({
        email: 'admin@example.com',
        name: 'System Administrator',
        password: hashedPassword,
        role: 'admin',
        status: 'active',
        warningCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        emailVerified: true,
        bio: 'System administrator account'
      });
      
      console.log('Admin user created successfully');
      console.log('Email: admin@example.com');
      console.log('Password: admin123');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

createAdminUser();