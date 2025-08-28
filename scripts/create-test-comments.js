const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://adimin:gpt5love@cluster0.zu4p8ot.mongodb.net/embrocal?retryWrites=true&w=majority&appName=Cluster0';

async function createTestComments() {
  try {
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');
    
    const db = mongoose.connection.db;
    const postsCollection = db.collection('posts');
    const commentsCollection = db.collection('comments');
    const auditLogsCollection = db.collection('audit_logs');
    
    // Get some posts to add comments to
    const posts = await postsCollection.find({}).limit(20).toArray();
    console.log(`Found ${posts.length} posts`);
    
    const testComments = [];
    const auditLogs = [];
    
    // Sample comment contents
    const commentContents = [
      'いいね！素晴らしい投稿です。',
      '同感です。私も同じ経験があります。',
      '詳しく教えていただけますか？',
      'ありがとうございます。参考になりました。',
      'なるほど、勉強になります。',
      '面白い視点ですね。',
      'この件について質問があります。',
      '私も賛成です！',
      'もう少し詳しく説明してもらえますか？',
      'シェアしてくれてありがとう！'
    ];
    
    const commentAuthors = [
      { name: '山田太郎', email: 'yamada@example.com' },
      { name: '鈴木花子', email: 'suzuki@example.com' },
      { name: '田中次郎', email: 'tanaka@example.com' },
      { name: '佐藤美香', email: 'sato@example.com' },
      { name: '高橋健一', email: 'takahashi@example.com' }
    ];
    
    // Add comments to posts
    posts.forEach((post, index) => {
      const numComments = Math.floor(Math.random() * 5) + 1; // 1-5 comments per post
      
      for (let i = 0; i < numComments; i++) {
        const author = commentAuthors[Math.floor(Math.random() * commentAuthors.length)];
        const content = commentContents[Math.floor(Math.random() * commentContents.length)];
        const createdAt = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000); // Within last 7 days
        
        testComments.push({
          postId: post._id,
          authorId: new mongoose.Types.ObjectId().toString(),
          authorName: author.name,
          authorEmail: author.email,
          content: content,
          likes: [],
          createdAt: createdAt,
          updatedAt: createdAt
        });
      }
      
      // Add some audit logs for this post
      const actions = ['POST_VIEWED', 'POST_HIDDEN', 'POST_UNHIDDEN', 'POST_REPORTED', 'POST_REVIEWED'];
      const numLogs = Math.floor(Math.random() * 3) + 1;
      
      for (let i = 0; i < numLogs; i++) {
        const action = actions[Math.floor(Math.random() * actions.length)];
        const timestamp = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000); // Within last 30 days
        
        auditLogs.push({
          action: action,
          adminId: 'admin-' + Math.floor(Math.random() * 5),
          targetId: post._id.toString(),
          targetType: 'post',
          details: {
            action: action.toLowerCase(),
            reason: 'Test action'
          },
          timestamp: timestamp,
          ipAddress: '192.168.1.' + Math.floor(Math.random() * 255),
          userAgent: 'Mozilla/5.0'
        });
      }
    });
    
    // Insert comments
    if (testComments.length > 0) {
      const commentResult = await commentsCollection.insertMany(testComments);
      console.log(`\n✅ Created ${commentResult.insertedCount} test comments`);
    }
    
    // Insert audit logs
    if (auditLogs.length > 0) {
      const auditResult = await auditLogsCollection.insertMany(auditLogs);
      console.log(`✅ Created ${auditResult.insertedCount} audit logs`);
    }
    
    // Update comment counts in posts
    for (const post of posts) {
      const commentCount = testComments.filter(c => c.postId.toString() === post._id.toString()).length;
      await postsCollection.updateOne(
        { _id: post._id },
        { $set: { commentCount: commentCount } }
      );
    }
    
    console.log('\n📊 Statistics:');
    console.log(`  Total comments: ${testComments.length}`);
    console.log(`  Total audit logs: ${auditLogs.length}`);
    console.log(`  Posts with comments: ${posts.length}`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

createTestComments();