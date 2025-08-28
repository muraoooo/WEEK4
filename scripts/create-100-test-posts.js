const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://adimin:gpt5love@cluster0.zu4p8ot.mongodb.net/embrocal?retryWrites=true&w=majority&appName=Cluster0';

// サンプルコンテンツ
const normalContents = [
  '今日は素晴らしい一日でした！',
  'プログラミングの勉強をしています',
  'お昼ご飯が美味しかったです',
  '新しいプロジェクトが始まりました',
  '週末は家族と過ごしました',
  '映画を観てきました',
  'ヨガでリフレッシュ',
  '読書を楽しんでいます',
  'カフェで仕事中',
  '散歩で気分転換',
];

const spamContents = [
  'クリックして無料プレゼント！',
  '今すぐ購入で50%OFF！',
  '簡単に稼げる方法教えます！',
  '無料ダウンロード！登録不要！',
  'ビットコインで大儲け！'
];

const violentContents = [
  '死ね！バカ！',
  '殺してやる！',
  'ふざけるな！許さない！',
  '攻撃的な言葉',
  '暴力的な表現'
];

function getRandomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateName() {
  const lastNames = ['田中', '鈴木', '佐藤', '山田', '高橋', '伊藤', '中村', '小林', '加藤', '吉田'];
  const firstNames = ['太郎', '花子', '一郎', '美香', '健一', '麻衣', '剛', '由美', '隆', '真理'];
  return getRandomElement(lastNames) + getRandomElement(firstNames);
}

async function create100TestPosts() {
  try {
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');
    
    const db = mongoose.connection.db;
    const postsCollection = db.collection('posts');
    
    const testPosts = [];
    const categories = ['general', 'news', 'discussion', 'question', null];
    
    for (let i = 0; i < 100; i++) {
      const name = generateName() + (i + 1);
      const email = `user${i+1}@example.com`;
      const createdAt = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000);
      
      // 70%通常、20%スパム、10%暴力的
      const random = Math.random();
      let content, reported, reportCount, status, aiScore, aiFlags, category;
      
      if (random < 0.7) {
        // 通常投稿
        content = getRandomElement(normalContents) + ` #投稿${i+1}`;
        reported = Math.random() < 0.05;
        reportCount = reported ? Math.floor(Math.random() * 3) : 0;
        status = 'active';
        aiScore = Math.random() * 0.3;
        aiFlags = [];
        category = getRandomElement(categories);
      } else if (random < 0.9) {
        // スパム
        content = getRandomElement(spamContents);
        reported = true;
        reportCount = Math.floor(Math.random() * 10) + 5;
        status = Math.random() < 0.5 ? 'hidden' : 'active';
        aiScore = 0.7 + Math.random() * 0.2;
        aiFlags = ['spam_content'];
        category = 'spam';
      } else {
        // 暴力的
        content = getRandomElement(violentContents);
        reported = true;
        reportCount = Math.floor(Math.random() * 20) + 10;
        status = Math.random() < 0.5 ? 'deleted' : 'hidden';
        aiScore = 0.85 + Math.random() * 0.15;
        aiFlags = ['violent_content', 'harassment'];
        category = null;
      }
      
      const post = {
        authorId: new mongoose.Types.ObjectId().toString(),
        authorName: name,
        authorEmail: email,
        content: content,
        likes: Array.from({ length: Math.floor(Math.random() * 30) }, (_, j) => `user${j+1}`),
        commentCount: Math.floor(Math.random() * 20),
        category: category,
        reported: reported,
        reportCount: reportCount,
        isDeleted: status === 'deleted',
        isHidden: status === 'hidden',
        aiModerationScore: aiScore,
        aiModerationFlags: aiFlags,
        createdAt: createdAt,
        updatedAt: createdAt
      };
      
      if (status === 'deleted') {
        post.deletedAt = createdAt;
      }
      if (status === 'hidden') {
        post.hiddenAt = createdAt;
      }
      
      testPosts.push(post);
    }
    
    const result = await postsCollection.insertMany(testPosts);
    console.log(`\n✅ ${result.insertedCount}件のテスト投稿を作成しました`);
    
    // 統計表示
    const stats = {
      total: testPosts.length,
      active: testPosts.filter(p => !p.isDeleted && !p.isHidden).length,
      hidden: testPosts.filter(p => p.isHidden).length,
      deleted: testPosts.filter(p => p.isDeleted).length,
      reported: testPosts.filter(p => p.reported).length,
      highRisk: testPosts.filter(p => p.aiModerationScore > 0.7).length
    };
    
    console.log('\n📊 投稿統計:');
    console.log(`  総数: ${stats.total}`);
    console.log(`  アクティブ: ${stats.active}`);
    console.log(`  非表示: ${stats.hidden}`);
    console.log(`  削除済み: ${stats.deleted}`);
    console.log(`  通報あり: ${stats.reported}`);
    console.log(`  高リスク: ${stats.highRisk}`);
    
    const totalInDB = await postsCollection.countDocuments({});
    console.log(`\n💾 データベース内の総投稿数: ${totalInDB}`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n切断しました');
  }
}

create100TestPosts();