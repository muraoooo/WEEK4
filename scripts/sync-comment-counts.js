const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://adimin:gpt5love@cluster0.zu4p8ot.mongodb.net/embrocal?retryWrites=true&w=majority&appName=Cluster0';

async function syncCommentCounts() {
  try {
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');
    
    const db = mongoose.connection.db;
    const postsCollection = db.collection('posts');
    const commentsCollection = db.collection('comments');
    
    // すべての投稿を取得
    const posts = await postsCollection.find({}).toArray();
    console.log(`Found ${posts.length} posts`);
    
    let updatedCount = 0;
    
    // 各投稿のコメント数を更新
    for (const post of posts) {
      const actualCommentCount = await commentsCollection.countDocuments({ 
        postId: post._id 
      });
      
      // データベース内のcommentCountを更新
      await postsCollection.updateOne(
        { _id: post._id },
        { 
          $set: { 
            commentCount: actualCommentCount,
            comments: [] // 古いcommentsフィールドをクリア（コメントは別コレクションで管理）
          } 
        }
      );
      
      if (actualCommentCount > 0) {
        console.log(`Post ${post._id}: ${actualCommentCount} comments`);
        updatedCount++;
      }
    }
    
    console.log(`\n✅ Updated comment counts for ${updatedCount} posts with comments`);
    
    // 統計情報を表示
    const stats = await commentsCollection.aggregate([
      { $group: { 
        _id: null, 
        totalComments: { $sum: 1 },
        uniquePosts: { $addToSet: '$postId' }
      }}
    ]).toArray();
    
    if (stats.length > 0) {
      console.log('\n📊 Comment Statistics:');
      console.log(`  Total comments: ${stats[0].totalComments}`);
      console.log(`  Posts with comments: ${stats[0].uniquePosts.length}`);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

syncCommentCounts();