const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;

// テスト用の通報データ
const testReports = [
  {
    reportType: 'post',
    targetId: new ObjectId(),
    targetType: 'post',
    reporterId: new ObjectId().toString(),
    reporterEmail: 'user1@example.com',
    reporterName: 'テストユーザー1',
    targetUserId: new ObjectId().toString(),
    targetUserEmail: 'violator1@example.com',
    targetUserName: '違反ユーザー1',
    category: 'inappropriate_content',
    reason: '不適切なコンテンツが含まれています。性的な内容や暴力的な表現が見受けられます。',
    description: 'この投稿には不適切な画像と暴力的な言葉が含まれています。コミュニティガイドラインに違反していると思われます。',
    evidence: {
      screenshots: ['screenshot1.jpg', 'screenshot2.jpg'],
      urls: ['https://example.com/post/123'],
      additionalInfo: '投稿日時: 2025-08-25 14:30'
    },
    priority: 'high',
    status: 'pending',
    createdAt: new Date('2025-08-26T10:00:00Z'),
    updatedAt: new Date('2025-08-26T10:00:00Z')
  },
  {
    reportType: 'user',
    targetId: new ObjectId(),
    targetType: 'user',
    reporterId: new ObjectId().toString(),
    reporterEmail: 'user2@example.com',
    reporterName: 'テストユーザー2',
    targetUserId: new ObjectId().toString(),
    targetUserEmail: 'spammer@example.com',
    targetUserName: 'スパマー太郎',
    category: 'spam',
    reason: 'スパム投稿を繰り返しています',
    description: '同じ内容の広告を複数回投稿しており、他のユーザーの迷惑になっています。',
    evidence: {
      screenshots: ['spam1.jpg', 'spam2.jpg', 'spam3.jpg'],
      urls: ['https://example.com/user/spammer'],
      additionalInfo: '過去24時間で50回以上同じ内容を投稿'
    },
    priority: 'urgent',
    status: 'pending',
    createdAt: new Date('2025-08-26T09:00:00Z'),
    updatedAt: new Date('2025-08-26T09:00:00Z')
  },
  {
    reportType: 'comment',
    targetId: new ObjectId(),
    targetType: 'comment',
    reporterId: new ObjectId().toString(),
    reporterEmail: 'user3@example.com',
    reporterName: 'テストユーザー3',
    targetUserId: new ObjectId().toString(),
    targetUserEmail: 'troll@example.com',
    targetUserName: 'トロール次郎',
    category: 'harassment',
    reason: '他のユーザーへの嫌がらせ',
    description: '特定のユーザーに対して執拗に攻撃的なコメントを送り続けています。',
    evidence: {
      screenshots: ['harassment1.jpg'],
      urls: ['https://example.com/comment/456'],
      additionalInfo: '被害者からの報告が複数あり'
    },
    priority: 'high',
    status: 'under_review',
    assignedTo: 'admin@example.com',
    reviewNotes: '現在調査中。過去の投稿履歴も確認中。',
    createdAt: new Date('2025-08-26T08:00:00Z'),
    updatedAt: new Date('2025-08-26T11:00:00Z'),
    history: [
      {
        timestamp: new Date('2025-08-26T11:00:00Z'),
        action: 'status_change',
        details: { from: 'pending', to: 'under_review' },
        performedBy: 'admin@example.com'
      }
    ]
  },
  {
    reportType: 'post',
    targetId: new ObjectId(),
    targetType: 'post',
    reporterId: new ObjectId().toString(),
    reporterEmail: 'user4@example.com',
    reporterName: 'テストユーザー4',
    targetUserId: new ObjectId().toString(),
    targetUserEmail: 'faker@example.com',
    targetUserName: '偽情報花子',
    category: 'misinformation',
    reason: '誤情報の拡散',
    description: '明らかに誤った医療情報を拡散しており、危険です。',
    evidence: {
      screenshots: ['misinfo1.jpg'],
      urls: ['https://example.com/post/789'],
      additionalInfo: '医療専門家から指摘あり'
    },
    priority: 'urgent',
    status: 'approved',
    assignedTo: 'admin@example.com',
    reviewNotes: '内容を確認し、明らかな誤情報と判断。投稿を削除し、ユーザーに警告を発行。',
    resolution: 'コンテンツを削除し、ユーザーに警告を発行しました。',
    resolvedAt: new Date('2025-08-26T12:00:00Z'),
    createdAt: new Date('2025-08-25T15:00:00Z'),
    updatedAt: new Date('2025-08-26T12:00:00Z'),
    history: [
      {
        timestamp: new Date('2025-08-26T10:00:00Z'),
        action: 'status_change',
        details: { from: 'pending', to: 'under_review' },
        performedBy: 'admin@example.com'
      },
      {
        timestamp: new Date('2025-08-26T12:00:00Z'),
        action: 'status_change',
        details: { from: 'under_review', to: 'approved' },
        performedBy: 'admin@example.com'
      },
      {
        timestamp: new Date('2025-08-26T12:00:00Z'),
        action: 'content_removed',
        details: { postId: new ObjectId().toString() },
        performedBy: 'admin@example.com'
      }
    ],
    internalNotes: [
      {
        note: '医療専門家に確認済み。明らかな誤情報と判断。',
        createdBy: 'admin@example.com',
        createdAt: new Date('2025-08-26T11:30:00Z')
      }
    ]
  },
  {
    reportType: 'user',
    targetId: new ObjectId(),
    targetType: 'user',
    reporterId: new ObjectId().toString(),
    reporterEmail: 'user5@example.com',
    reporterName: 'テストユーザー5',
    targetUserId: new ObjectId().toString(),
    targetUserEmail: 'impersonator@example.com',
    targetUserName: 'なりすまし三郎',
    category: 'impersonation',
    reason: '他人になりすまし',
    description: '有名人になりすまして活動しています。',
    evidence: {
      screenshots: ['impersonation1.jpg', 'impersonation2.jpg'],
      urls: ['https://example.com/user/fake-celebrity'],
      additionalInfo: '本人から報告あり'
    },
    priority: 'high',
    status: 'rejected',
    assignedTo: 'moderator@example.com',
    reviewNotes: '調査の結果、パロディアカウントであり、なりすましの意図はないと判断。',
    resolution: 'パロディアカウントとして明記するよう指導。',
    resolvedAt: new Date('2025-08-26T13:00:00Z'),
    createdAt: new Date('2025-08-25T20:00:00Z'),
    updatedAt: new Date('2025-08-26T13:00:00Z'),
    history: [
      {
        timestamp: new Date('2025-08-26T11:00:00Z'),
        action: 'status_change',
        details: { from: 'pending', to: 'under_review' },
        performedBy: 'moderator@example.com'
      },
      {
        timestamp: new Date('2025-08-26T13:00:00Z'),
        action: 'status_change',
        details: { from: 'under_review', to: 'rejected' },
        performedBy: 'moderator@example.com'
      }
    ]
  },
  {
    reportType: 'post',
    targetId: new ObjectId(),
    targetType: 'post',
    reporterId: new ObjectId().toString(),
    reporterEmail: 'user6@example.com',
    reporterName: 'テストユーザー6',
    targetUserId: new ObjectId().toString(),
    targetUserEmail: 'copyright@example.com',
    targetUserName: '著作権侵害子',
    category: 'copyright',
    reason: '著作権侵害',
    description: '私の作品を無断で転載しています。',
    evidence: {
      screenshots: ['copyright1.jpg'],
      urls: ['https://example.com/post/original', 'https://example.com/post/copied'],
      additionalInfo: 'オリジナル作品の投稿日: 2025-08-20'
    },
    priority: 'medium',
    status: 'resolved',
    assignedTo: 'admin@example.com',
    reviewNotes: '著作権侵害を確認。コンテンツを削除。',
    resolution: '著作権侵害コンテンツを削除し、投稿者にアカウント停止処分を実施。',
    resolvedAt: new Date('2025-08-26T14:00:00Z'),
    createdAt: new Date('2025-08-26T07:00:00Z'),
    updatedAt: new Date('2025-08-26T14:00:00Z'),
    history: [
      {
        timestamp: new Date('2025-08-26T12:00:00Z'),
        action: 'status_change',
        details: { from: 'pending', to: 'approved' },
        performedBy: 'admin@example.com'
      },
      {
        timestamp: new Date('2025-08-26T14:00:00Z'),
        action: 'status_change',
        details: { from: 'approved', to: 'resolved' },
        performedBy: 'admin@example.com'
      },
      {
        timestamp: new Date('2025-08-26T14:00:00Z'),
        action: 'user_suspended',
        details: { userId: new ObjectId().toString(), duration: '7 days' },
        performedBy: 'admin@example.com'
      }
    ],
    internalNotes: [
      {
        note: 'DMCAテイクダウン通知を受領。法務部に確認済み。',
        createdBy: 'admin@example.com',
        createdAt: new Date('2025-08-26T13:00:00Z')
      }
    ]
  },
  {
    reportType: 'comment',
    targetId: new ObjectId(),
    targetType: 'comment',
    reporterId: new ObjectId().toString(),
    reporterEmail: 'user7@example.com',
    reporterName: 'テストユーザー7',
    targetUserId: new ObjectId().toString(),
    targetUserEmail: 'hate@example.com',
    targetUserName: 'ヘイト四郎',
    category: 'hate_speech',
    reason: 'ヘイトスピーチ',
    description: '特定の民族に対する差別的な発言を繰り返しています。',
    evidence: {
      screenshots: ['hate1.jpg', 'hate2.jpg'],
      urls: ['https://example.com/comment/hate1'],
      additionalInfo: '複数のユーザーから通報あり'
    },
    priority: 'urgent',
    status: 'pending',
    createdAt: new Date('2025-08-27T06:00:00Z'),
    updatedAt: new Date('2025-08-27T06:00:00Z')
  },
  {
    reportType: 'user',
    targetId: new ObjectId(),
    targetType: 'user',
    reporterId: new ObjectId().toString(),
    reporterEmail: 'user8@example.com',
    reporterName: 'テストユーザー8',
    targetUserId: new ObjectId().toString(),
    targetUserEmail: 'minor@example.com',
    targetUserName: '未成年五郎',
    category: 'underage',
    reason: '未成年の可能性',
    description: 'プロフィールから13歳未満と思われます。',
    evidence: {
      screenshots: ['profile1.jpg'],
      urls: ['https://example.com/user/minor'],
      additionalInfo: '自己紹介に「小学6年生」と記載'
    },
    priority: 'high',
    status: 'under_review',
    assignedTo: 'admin@example.com',
    reviewNotes: 'アカウント情報を確認中。',
    createdAt: new Date('2025-08-27T05:00:00Z'),
    updatedAt: new Date('2025-08-27T07:00:00Z'),
    history: [
      {
        timestamp: new Date('2025-08-27T07:00:00Z'),
        action: 'status_change',
        details: { from: 'pending', to: 'under_review' },
        performedBy: 'admin@example.com'
      }
    ]
  },
  {
    reportType: 'post',
    targetId: new ObjectId(),
    targetType: 'post',
    reporterId: new ObjectId().toString(),
    reporterEmail: 'user9@example.com',
    reporterName: 'テストユーザー9',
    targetUserId: new ObjectId().toString(),
    targetUserEmail: 'privacy@example.com',
    targetUserName: 'プライバシー侵害美',
    category: 'privacy_violation',
    reason: 'プライバシー侵害',
    description: '私の個人情報を無断で公開しています。',
    evidence: {
      screenshots: ['privacy1.jpg'],
      urls: ['https://example.com/post/privacy-violation'],
      additionalInfo: '実名と住所が含まれている'
    },
    priority: 'urgent',
    status: 'approved',
    assignedTo: 'admin@example.com',
    reviewNotes: '個人情報の無断公開を確認。即座に削除。',
    resolution: 'プライバシー侵害コンテンツを削除し、投稿者をBAN。',
    resolvedAt: new Date('2025-08-27T08:00:00Z'),
    createdAt: new Date('2025-08-27T07:30:00Z'),
    updatedAt: new Date('2025-08-27T08:00:00Z'),
    history: [
      {
        timestamp: new Date('2025-08-27T07:45:00Z'),
        action: 'status_change',
        details: { from: 'pending', to: 'approved' },
        performedBy: 'admin@example.com'
      },
      {
        timestamp: new Date('2025-08-27T08:00:00Z'),
        action: 'user_banned',
        details: { userId: new ObjectId().toString() },
        performedBy: 'admin@example.com'
      }
    ]
  },
  {
    reportType: 'comment',
    targetId: new ObjectId(),
    targetType: 'comment',
    reporterId: new ObjectId().toString(),
    reporterEmail: 'user10@example.com',
    reporterName: 'テストユーザー10',
    targetUserId: new ObjectId().toString(),
    targetUserEmail: 'normal@example.com',
    targetUserName: '普通太郎',
    category: 'other',
    reason: 'その他',
    description: '内容が気に入らない。',
    evidence: {
      urls: ['https://example.com/comment/normal']
    },
    priority: 'low',
    status: 'rejected',
    assignedTo: 'moderator@example.com',
    reviewNotes: 'コミュニティガイドライン違反なし。',
    resolution: '違反は見つかりませんでした。',
    resolvedAt: new Date('2025-08-27T09:00:00Z'),
    createdAt: new Date('2025-08-27T08:30:00Z'),
    updatedAt: new Date('2025-08-27T09:00:00Z'),
    history: [
      {
        timestamp: new Date('2025-08-27T09:00:00Z'),
        action: 'status_change',
        details: { from: 'pending', to: 'rejected' },
        performedBy: 'moderator@example.com'
      }
    ]
  }
];

async function createTestReports() {
  let client;
  
  try {
    // MongoDB接続
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    console.log('✅ MongoDBに接続しました');
    
    const db = client.db('embrocal');
    const reportsCollection = db.collection('reports');
    
    // 既存のテストデータをクリア（オプション）
    const clearExisting = process.argv.includes('--clear');
    if (clearExisting) {
      const result = await reportsCollection.deleteMany({
        reporterEmail: { $regex: /^(user|test)\d+@example\.com$/ }
      });
      console.log(`🗑️  ${result.deletedCount}件の既存テストデータを削除しました`);
    }
    
    // テストデータを挿入
    const result = await reportsCollection.insertMany(testReports);
    console.log(`✅ ${result.insertedCount}件のテスト通報データを作成しました`);
    
    // 統計情報を表示
    const stats = await reportsCollection.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]).toArray();
    
    console.log('\n📊 通報ステータス別統計:');
    stats.forEach(stat => {
      console.log(`  ${stat._id}: ${stat.count}件`);
    });
    
    // 優先度別統計
    const priorityStats = await reportsCollection.aggregate([
      {
        $group: {
          _id: '$priority',
          count: { $sum: 1 }
        }
      }
    ]).toArray();
    
    console.log('\n🎯 優先度別統計:');
    priorityStats.forEach(stat => {
      console.log(`  ${stat._id}: ${stat.count}件`);
    });
    
    // カテゴリ別統計
    const categoryStats = await reportsCollection.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 }
        }
      }
    ]).toArray();
    
    console.log('\n📁 カテゴリ別統計:');
    categoryStats.forEach(stat => {
      console.log(`  ${stat._id}: ${stat.count}件`);
    });
    
    console.log('\n✅ テストデータの作成が完了しました！');
    console.log('📝 管理画面で確認: http://localhost:3000/admin/reports');
    
  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
      console.log('\n👋 MongoDBとの接続を終了しました');
    }
  }
}

// スクリプトを実行
createTestReports();