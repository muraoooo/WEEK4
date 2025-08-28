const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://adimin:gpt5love@cluster0.zu4p8ot.mongodb.net/embrocal?retryWrites=true&w=majority&appName=Cluster0';

async function createTestPosts() {
  try {
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');
    
    const db = mongoose.connection.db;
    const postsCollection = db.collection('posts');
    
    // テスト投稿データ
    const testPosts = [
      {
        authorId: '676f1c1a9a123456789abcd1',
        authorName: '田中太郎',
        authorEmail: 'tanaka@example.com',
        content: 'こんにちは！今日はとても良い天気ですね。散歩に行ってきました。',
        likes: ['user1', 'user2', 'user3'],
        commentCount: 2,
        category: 'general',
        reported: false,
        reportCount: 0,
        isDeleted: false,
        isHidden: false,
        createdAt: new Date('2024-12-01T10:00:00'),
        updatedAt: new Date('2024-12-01T10:00:00')
      },
      {
        authorId: '676f1c1a9a123456789abcd2',
        authorName: '鈴木花子',
        authorEmail: 'suzuki@example.com',
        content: '最新のニュースをチェックしています。技術の進歩は素晴らしいですね！',
        likes: ['user1', 'user4'],
        commentCount: 5,
        category: 'news',
        reported: false,
        reportCount: 0,
        isDeleted: false,
        isHidden: false,
        createdAt: new Date('2024-12-02T14:30:00'),
        updatedAt: new Date('2024-12-02T14:30:00')
      },
      {
        authorId: '676f1c1a9a123456789abcd3',
        authorName: '佐藤次郎',
        authorEmail: 'sato@example.com',
        content: 'クリックして無料で商品を購入！今すぐアクセス！',
        likes: [],
        commentCount: 0,
        category: 'spam',
        reported: true,
        reportCount: 5,
        isDeleted: false,
        isHidden: true,
        aiModerationScore: 0.85,
        aiModerationFlags: ['spam_content', 'suspicious_links'],
        createdAt: new Date('2024-12-03T09:15:00'),
        updatedAt: new Date('2024-12-03T10:00:00')
      },
      {
        authorId: '676f1c1a9a123456789abcd4',
        authorName: '山田美香',
        authorEmail: 'yamada@example.com',
        content: 'プログラミングの質問があります。JavaScriptの非同期処理について教えてください。',
        likes: ['user2', 'user3', 'user5', 'user6'],
        commentCount: 8,
        category: 'question',
        reported: false,
        reportCount: 0,
        isDeleted: false,
        isHidden: false,
        createdAt: new Date('2024-12-04T16:45:00'),
        updatedAt: new Date('2024-12-04T17:30:00')
      },
      {
        authorId: '676f1c1a9a123456789abcd5',
        authorName: '高橋健一',
        authorEmail: 'takahashi@example.com',
        content: 'この投稿は不適切な内容を含んでいます。暴力的な表現があります。',
        likes: [],
        commentCount: 1,
        category: 'general',
        reported: true,
        reportCount: 8,
        isDeleted: true,
        isHidden: false,
        aiModerationScore: 0.92,
        aiModerationFlags: ['violent_content', 'inappropriate_content'],
        deletedAt: new Date('2024-12-05T12:00:00'),
        createdAt: new Date('2024-12-05T11:00:00'),
        updatedAt: new Date('2024-12-05T12:00:00')
      },
      {
        authorId: '676f1c1a9a123456789abcd6',
        authorName: '伊藤麻衣',
        authorEmail: 'ito@example.com',
        content: '今日のランチは美味しかったです！写真をシェアします。',
        likes: ['user1', 'user2', 'user3', 'user4', 'user5'],
        commentCount: 3,
        category: 'general',
        reported: false,
        reportCount: 0,
        isDeleted: false,
        isHidden: false,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        authorId: '676f1c1a9a123456789abcd7',
        authorName: '中村剛',
        authorEmail: 'nakamura@example.com',
        content: 'AIについての議論を始めましょう。皆さんの意見を聞かせてください。',
        likes: ['user2', 'user6'],
        commentCount: 12,
        category: 'discussion',
        reported: false,
        reportCount: 0,
        isDeleted: false,
        isHidden: false,
        createdAt: new Date('2024-12-06T13:20:00'),
        updatedAt: new Date('2024-12-06T15:45:00')
      },
      {
        authorId: '676f1c1a9a123456789abcd8',
        authorName: '小林由美',
        authorEmail: 'kobayashi@example.com',
        content: 'バカ！アホ！死ね！',
        likes: [],
        commentCount: 0,
        category: null,
        reported: true,
        reportCount: 15,
        isDeleted: false,
        isHidden: true,
        aiModerationScore: 0.95,
        aiModerationFlags: ['harassment', 'offensive_language'],
        hiddenAt: new Date('2024-12-07T10:30:00'),
        createdAt: new Date('2024-12-07T10:00:00'),
        updatedAt: new Date('2024-12-07T10:30:00')
      }
    ];
    
    // 既存の投稿をクリア（オプション）
    // await postsCollection.deleteMany({});
    
    // テスト投稿を挿入
    const result = await postsCollection.insertMany(testPosts);
    console.log(`Created ${result.insertedCount} test posts`);
    
    // 作成された投稿を表示
    const posts = await postsCollection.find({}).toArray();
    console.log(`Total posts in database: ${posts.length}`);
    
  } catch (error) {
    console.error('Error creating test posts:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

createTestPosts();