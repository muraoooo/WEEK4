const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://adimin:gpt5love@cluster0.zu4p8ot.mongodb.net/embrocal?retryWrites=true&w=majority&appName=Cluster0';

// ランダムなコンテンツ生成用のサンプルデータ
const sampleContents = [
  '今日は素晴らしい一日でした。公園で散歩を楽しみました。',
  '新しいプロジェクトの開発が始まりました。ワクワクしています！',
  'プログラミングの勉強をしています。JavaScriptは楽しいですね。',
  'お昼ご飯は美味しいラーメンでした。また行きたいです。',
  '最近読んだ本がとても面白かったです。おすすめします。',
  'AIの技術について学んでいます。未来が楽しみです。',
  '週末は家族と過ごしました。充実した時間でした。',
  '新しいカフェを発見しました。コーヒーが最高でした！',
  'ヨガを始めてみました。心身ともにリフレッシュできます。',
  '映画を観てきました。感動的なストーリーでした。',
];

const spamContents = [
  'クリックして無料で商品をゲット！今すぐアクセス！',
  '簡単に稼げる方法を教えます！詳細はこちら！',
  '限定オファー！今すぐ購入して50%OFF！',
  '無料でダウンロード！登録不要！',
  'ビットコインで大儲け！今すぐ始めよう！',
];

const violentContents = [
  'この内容は不適切です。暴力的な表現を含みます。',
  '攻撃的な言葉遣いは控えてください。',
  '死ね！バカ！アホ！',
  'ふざけるな！許さない！',
  '殺してやる！覚悟しろ！',
];

const names = [
  '田中太郎', '鈴木花子', '佐藤次郎', '山田美香', '高橋健一',
  '伊藤麻衣', '中村剛', '小林由美', '加藤隆', '吉田真理',
  '渡辺修', '山本愛', '松本大輔', '井上恵子', '木村正',
  '林さくら', '清水健太', '藤田優子', '池田浩', '橋本美咲',
  '山口翔', '岡田奈々', '長谷川誠', '石田香織', '前田学',
  '藤原みどり', '小川直樹', '後藤理恵', '近藤武', '遠藤由紀'
];

const categories = ['general', 'news', 'discussion', 'question', null];

function getRandomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function getRandomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function generateEmail(name) {
  const romanized = name.toLowerCase().replace(/[^a-z]/g, '');
  return `${romanized}${Math.floor(Math.random() * 1000)}@example.com`;
}

async function create30TestPosts() {
  try {
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');
    
    const db = mongoose.connection.db;
    const postsCollection = db.collection('posts');
    
    const testPosts = [];
    
    for (let i = 0; i < 30; i++) {
      const name = getRandomElement(names);
      const email = generateEmail(name);
      const createdAt = getRandomDate(new Date('2024-11-01'), new Date());
      const updatedAt = new Date(createdAt.getTime() + Math.random() * 24 * 60 * 60 * 1000);
      
      // 投稿タイプを決定（70%通常、20%スパム、10%暴力的）
      const random = Math.random();
      let content, reported, reportCount, status, aiScore, aiFlags, category;
      
      if (random < 0.7) {
        // 通常の投稿
        content = getRandomElement(sampleContents);
        reported = Math.random() < 0.1; // 10%の確率で通報
        reportCount = reported ? Math.floor(Math.random() * 3) : 0;
        status = 'active';
        aiScore = Math.random() * 0.3; // 0-0.3のスコア
        aiFlags = [];
        category = getRandomElement(categories);
      } else if (random < 0.9) {
        // スパム投稿
        content = getRandomElement(spamContents);
        reported = true;
        reportCount = Math.floor(Math.random() * 10) + 5;
        status = Math.random() < 0.5 ? 'hidden' : 'active';
        aiScore = 0.7 + Math.random() * 0.2; // 0.7-0.9のスコア
        aiFlags = ['spam_content', 'suspicious_links'];
        category = 'spam';
      } else {
        // 暴力的な投稿
        content = getRandomElement(violentContents);
        reported = true;
        reportCount = Math.floor(Math.random() * 15) + 10;
        status = Math.random() < 0.3 ? 'deleted' : 'hidden';
        aiScore = 0.8 + Math.random() * 0.2; // 0.8-1.0のスコア
        aiFlags = ['violent_content', 'harassment', 'offensive_language'];
        category = null;
      }
      
      const post = {
        authorId: new mongoose.Types.ObjectId().toString(),
        authorName: name,
        authorEmail: email,
        content: content,
        likes: Array.from({ length: Math.floor(Math.random() * 20) }, (_, i) => `user${i + 1}`),
        commentCount: Math.floor(Math.random() * 15),
        category: category,
        reported: reported,
        reportCount: reportCount,
        isDeleted: status === 'deleted',
        isHidden: status === 'hidden',
        aiModerationScore: aiScore,
        aiModerationFlags: aiFlags,
        createdAt: createdAt,
        updatedAt: updatedAt
      };
      
      if (status === 'deleted') {
        post.deletedAt = updatedAt;
        post.deletedBy = 'admin';
      }
      
      if (status === 'hidden') {
        post.hiddenAt = updatedAt;
        post.hiddenBy = 'admin';
      }
      
      testPosts.push(post);
    }
    
    // テスト投稿を挿入
    const result = await postsCollection.insertMany(testPosts);
    console.log(`Created ${result.insertedCount} test posts`);
    
    // 統計を表示
    const stats = {
      total: testPosts.length,
      active: testPosts.filter(p => !p.isDeleted && !p.isHidden).length,
      hidden: testPosts.filter(p => p.isHidden).length,
      deleted: testPosts.filter(p => p.isDeleted).length,
      reported: testPosts.filter(p => p.reported).length,
      highRisk: testPosts.filter(p => p.aiModerationScore > 0.7).length
    };
    
    console.log('\n=== 投稿統計 ===');
    console.log(`総投稿数: ${stats.total}`);
    console.log(`アクティブ: ${stats.active}`);
    console.log(`非表示: ${stats.hidden}`);
    console.log(`削除済み: ${stats.deleted}`);
    console.log(`通報あり: ${stats.reported}`);
    console.log(`高リスク (AI > 70%): ${stats.highRisk}`);
    
    // カテゴリ別統計
    const categoryStats = {};
    testPosts.forEach(post => {
      const cat = post.category || '未分類';
      categoryStats[cat] = (categoryStats[cat] || 0) + 1;
    });
    
    console.log('\n=== カテゴリ別 ===');
    Object.entries(categoryStats).forEach(([cat, count]) => {
      console.log(`${cat}: ${count}`);
    });
    
    // データベースの総投稿数
    const totalInDB = await postsCollection.countDocuments({});
    console.log(`\nデータベース内の総投稿数: ${totalInDB}`);
    
  } catch (error) {
    console.error('Error creating test posts:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

create30TestPosts();