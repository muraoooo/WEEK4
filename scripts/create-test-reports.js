const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://adimin:gpt5love@cluster0.zu4p8ot.mongodb.net/embrocal?retryWrites=true&w=majority&appName=Cluster0';

async function createTestReports() {
  try {
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');
    
    const db = mongoose.connection.db;
    const postsCollection = db.collection('posts');
    const reportsCollection = db.collection('reports');
    
    // Get posts that are marked as reported
    const reportedPosts = await postsCollection.find({ reported: true }).toArray();
    console.log(`Found ${reportedPosts.length} reported posts`);
    
    const testReports = [];
    
    const reportReasons = [
      'スパム',
      '暴力的なコンテンツ',
      'ハラスメント',
      '誤情報',
      '不適切なコンテンツ',
      'その他'
    ];
    
    const reportDescriptions = [
      'この投稿はスパムです。商業的な内容を含んでいます。',
      '暴力的な表現が含まれています。',
      '他のユーザーへの嫌がらせが含まれています。',
      '誤った情報を広めています。',
      '不適切な言葉遣いがあります。',
      'コミュニティガイドラインに違反しています。'
    ];
    
    const reporters = [
      { name: '通報者1', email: 'reporter1@example.com' },
      { name: '通報者2', email: 'reporter2@example.com' },
      { name: '通報者3', email: 'reporter3@example.com' },
      { name: '通報者4', email: 'reporter4@example.com' },
      { name: '通報者5', email: 'reporter5@example.com' }
    ];
    
    // Create reports for reported posts
    for (const post of reportedPosts) {
      const numReports = Math.min(post.reportCount || 3, 5); // Create up to 5 reports per post
      
      for (let i = 0; i < numReports; i++) {
        const reporter = reporters[Math.floor(Math.random() * reporters.length)];
        const reason = reportReasons[Math.floor(Math.random() * reportReasons.length)];
        const description = reportDescriptions[Math.floor(Math.random() * reportDescriptions.length)];
        const createdAt = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000); // Within last 30 days
        
        // Random status
        const statuses = ['pending', 'pending', 'reviewed', 'resolved']; // More pending reports
        const status = statuses[Math.floor(Math.random() * statuses.length)];
        
        testReports.push({
          targetId: post._id,
          targetType: 'post',
          reporterId: new mongoose.Types.ObjectId().toString(),
          reporterName: reporter.name,
          reporterEmail: reporter.email,
          reason: reason,
          description: description,
          status: status,
          createdAt: createdAt,
          updatedAt: createdAt
        });
      }
    }
    
    // Insert reports
    if (testReports.length > 0) {
      const result = await reportsCollection.insertMany(testReports);
      console.log(`\n✅ Created ${result.insertedCount} test reports`);
      
      // Count by status
      const statusCount = {
        pending: testReports.filter(r => r.status === 'pending').length,
        reviewed: testReports.filter(r => r.status === 'reviewed').length,
        resolved: testReports.filter(r => r.status === 'resolved').length
      };
      
      console.log('\n📊 Report Statistics:');
      console.log(`  Pending: ${statusCount.pending}`);
      console.log(`  Reviewed: ${statusCount.reviewed}`);
      console.log(`  Resolved: ${statusCount.resolved}`);
      console.log(`  Total: ${testReports.length}`);
      
      // Update report counts in posts
      for (const post of reportedPosts) {
        const postReports = testReports.filter(r => r.targetId.toString() === post._id.toString());
        await postsCollection.updateOne(
          { _id: post._id },
          { 
            $set: { 
              reportCount: postReports.length,
              lastReportedAt: postReports[0]?.createdAt || new Date()
            } 
          }
        );
      }
    } else {
      console.log('No reported posts found, skipping report creation');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

createTestReports();