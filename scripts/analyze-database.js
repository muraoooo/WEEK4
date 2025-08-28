const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;

async function analyzeDatabase() {
  let client;
  
  try {
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    console.log('✅ MongoDBに接続しました\n');
    
    const db = client.db('embrocal');
    const collections = await db.listCollections().toArray();
    
    const statistics = {};
    
    for (const collectionInfo of collections) {
      const collection = db.collection(collectionInfo.name);
      const count = await collection.countDocuments();
      const sample = await collection.findOne();
      
      // 各フィールドの型を取得
      const fields = {};
      if (sample) {
        for (const [key, value] of Object.entries(sample)) {
          fields[key] = {
            type: Array.isArray(value) ? 'Array' : typeof value,
            example: value instanceof Date ? value.toISOString() : 
                    (typeof value === 'object' && value !== null ? '...' : value)
          };
        }
      }
      
      // 各コレクションの統計
      const stats = await collection.aggregate([
        {
          $facet: {
            statusCount: [
              { $match: { status: { $exists: true } } },
              { $group: { _id: '$status', count: { $sum: 1 } } }
            ],
            priorityCount: [
              { $match: { priority: { $exists: true } } },
              { $group: { _id: '$priority', count: { $sum: 1 } } }
            ],
            roleCount: [
              { $match: { role: { $exists: true } } },
              { $group: { _id: '$role', count: { $sum: 1 } } }
            ],
            typeCount: [
              { $match: { reportType: { $exists: true } } },
              { $group: { _id: '$reportType', count: { $sum: 1 } } }
            ],
            categoryCount: [
              { $match: { category: { $exists: true } } },
              { $group: { _id: '$category', count: { $sum: 1 } } }
            ]
          }
        }
      ]).toArray();
      
      statistics[collectionInfo.name] = {
        count,
        fields,
        stats: stats[0] || {}
      };
    }
    
    // 結果を出力
    console.log('=== データベース統計情報 ===\n');
    console.log(JSON.stringify(statistics, null, 2));
    
    // マークダウン形式で出力
    let markdown = '# MongoDBデータベース仕様書\n\n';
    markdown += '## データベース情報\n\n';
    markdown += '- **データベース名**: embrocal\n';
    markdown += '- **接続URI**: MongoDB Atlas Cluster\n';
    markdown += `- **更新日時**: ${new Date().toISOString()}\n\n`;
    
    markdown += '## コレクション一覧と統計\n\n';
    
    for (const [name, data] of Object.entries(statistics)) {
      markdown += `### ${name} コレクション\n\n`;
      markdown += `**総ドキュメント数**: ${data.count}件\n\n`;
      
      // フィールド定義
      if (Object.keys(data.fields).length > 0) {
        markdown += '#### フィールド定義\n\n';
        markdown += '| フィールド名 | データ型 | 説明 |\n';
        markdown += '|-------------|---------|------|\n';
        
        for (const [fieldName, fieldInfo] of Object.entries(data.fields)) {
          let description = '';
          
          // フィールドの説明を追加
          const fieldDescriptions = {
            '_id': 'ドキュメントの一意識別子',
            'email': 'ユーザーのメールアドレス',
            'name': 'ユーザー名/名前',
            'password': 'ハッシュ化されたパスワード',
            'role': 'ユーザーの権限（admin/moderator/user）',
            'status': 'ステータス（active/suspended/banned等）',
            'warningCount': '警告回数',
            'createdAt': '作成日時',
            'updatedAt': '更新日時',
            'lastLoginAt': '最終ログイン日時',
            'content': 'コンテンツ内容',
            'authorId': '投稿者ID',
            'likes': 'いいね数/リスト',
            'comments': 'コメントリスト',
            'reportType': '通報タイプ',
            'targetId': '通報対象ID',
            'reporterId': '通報者ID',
            'reason': '通報理由',
            'priority': '優先度（urgent/high/medium/low）',
            'category': 'カテゴリ',
            'action': 'アクション種別',
            'adminId': '管理者ID',
            'timestamp': 'タイムスタンプ',
            'ipAddress': 'IPアドレス',
            'userAgent': 'ユーザーエージェント'
          };
          
          description = fieldDescriptions[fieldName] || '-';
          markdown += `| ${fieldName} | ${fieldInfo.type} | ${description} |\n`;
        }
        markdown += '\n';
      }
      
      // 統計情報
      const hasStats = Object.values(data.stats).some(stat => stat.length > 0);
      if (hasStats) {
        markdown += '#### 統計情報\n\n';
        
        // ステータス別
        if (data.stats.statusCount && data.stats.statusCount.length > 0) {
          markdown += '**ステータス別件数:**\n';
          for (const item of data.stats.statusCount) {
            markdown += `- ${item._id || 'null'}: ${item.count}件\n`;
          }
          markdown += '\n';
        }
        
        // 優先度別
        if (data.stats.priorityCount && data.stats.priorityCount.length > 0) {
          markdown += '**優先度別件数:**\n';
          for (const item of data.stats.priorityCount) {
            markdown += `- ${item._id || 'null'}: ${item.count}件\n`;
          }
          markdown += '\n';
        }
        
        // 権限別
        if (data.stats.roleCount && data.stats.roleCount.length > 0) {
          markdown += '**権限別件数:**\n';
          for (const item of data.stats.roleCount) {
            markdown += `- ${item._id || 'null'}: ${item.count}件\n`;
          }
          markdown += '\n';
        }
        
        // レポートタイプ別
        if (data.stats.typeCount && data.stats.typeCount.length > 0) {
          markdown += '**通報タイプ別件数:**\n';
          for (const item of data.stats.typeCount) {
            markdown += `- ${item._id || 'null'}: ${item.count}件\n`;
          }
          markdown += '\n';
        }
        
        // カテゴリ別
        if (data.stats.categoryCount && data.stats.categoryCount.length > 0) {
          markdown += '**カテゴリ別件数:**\n';
          for (const item of data.stats.categoryCount) {
            markdown += `- ${item._id || 'null'}: ${item.count}件\n`;
          }
          markdown += '\n';
        }
      }
    }
    
    // ファイルに保存
    const fs = require('fs');
    fs.writeFileSync('DATABASE.md', markdown);
    console.log('\n✅ DATABASE.mdファイルを作成しました');
    
  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
  } finally {
    if (client) {
      await client.close();
    }
  }
}

analyzeDatabase();