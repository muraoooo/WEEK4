/**
 * システム総合テスト
 * データベース接続、通報システム、監査ログの動作確認
 */

// 環境変数を読み込み
require('dotenv').config({ path: '.env.local' });

const mongoose = require('mongoose');

// 環境変数の確認
console.log('🔍 環境変数チェック...');
const requiredEnvVars = [
  'MONGODB_URI',
  'JWT_SECRET',
  'EMAIL_SERVER_HOST',
  'EMAIL_SERVER_USER',
  'ADMIN_SECRET_KEY'
];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
  console.error('❌ 不足している環境変数:', missingVars);
  process.exit(1);
}

console.log('✅ 環境変数 - すべて設定済み');

// データベース接続テスト
async function testDatabaseConnection() {
  console.log('\n📊 データベース接続テスト...');
  
  try {
    // 接続オプション（最適化済み）
    const opts = {
      bufferCommands: false,
      maxPoolSize: 20,
      minPoolSize: 5,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 30000,
      connectTimeoutMS: 10000,
      family: 4,
      compressors: ['zlib'],
      readPreference: 'primaryPreferred',
    };

    console.log('🔗 MongoDB接続中...');
    const connection = await mongoose.connect(process.env.MONGODB_URI, opts);
    
    console.log('✅ MongoDB接続成功');
    console.log(`📍 接続先: ${connection.connection.host}:${connection.connection.port}`);
    console.log(`🗄️  データベース: ${connection.connection.name}`);
    
    // 接続状態の詳細
    console.log(`📊 接続プール情報:`);
    console.log(`   - 最大接続数: ${opts.maxPoolSize}`);
    console.log(`   - 最小接続数: ${opts.minPoolSize}`);
    console.log(`   - 圧縮: ${opts.compressors.join(', ')}`);
    
    return true;
  } catch (error) {
    console.error('❌ MongoDB接続失敗:', error.message);
    return false;
  }
}

// コレクション存在確認
async function testCollections() {
  console.log('\n📋 コレクション確認テスト...');
  
  try {
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);
    
    console.log('📁 既存のコレクション:');
    collectionNames.forEach(name => {
      console.log(`   - ${name}`);
    });
    
    // 必要なコレクションの確認
    const requiredCollections = ['users', 'posts', 'reports', 'audit_logs'];
    const missingCollections = requiredCollections.filter(name => 
      !collectionNames.includes(name)
    );
    
    if (missingCollections.length > 0) {
      console.log('⚠️  不足しているコレクション:', missingCollections);
      console.log('   これらは初回データ作成時に自動生成されます');
    } else {
      console.log('✅ 必要なコレクション - すべて存在');
    }
    
    return true;
  } catch (error) {
    console.error('❌ コレクション確認失敗:', error.message);
    return false;
  }
}

// データ操作テスト
async function testDataOperations() {
  console.log('\n🧪 データ操作テスト...');
  
  try {
    const testCollection = mongoose.connection.collection('test_logs');
    
    // テストデータの作成
    console.log('📝 テストデータ作成中...');
    const testDoc = {
      timestamp: new Date(),
      action: 'SYSTEM_TEST',
      userId: 'test-user',
      details: {
        testType: 'database_connection',
        status: 'running'
      },
      ipAddress: '127.0.0.1',
      userAgent: 'Node.js Test Runner'
    };
    
    const insertResult = await testCollection.insertOne(testDoc);
    console.log('✅ データ作成成功 - ID:', insertResult.insertedId);
    
    // データの読み取り
    console.log('📖 テストデータ読み取り中...');
    const foundDoc = await testCollection.findOne({ _id: insertResult.insertedId });
    
    if (foundDoc) {
      console.log('✅ データ読み取り成功');
    } else {
      throw new Error('挿入したデータが見つかりません');
    }
    
    // データの更新
    console.log('🔄 テストデータ更新中...');
    const updateResult = await testCollection.updateOne(
      { _id: insertResult.insertedId },
      { $set: { 'details.status': 'completed' } }
    );
    
    if (updateResult.modifiedCount > 0) {
      console.log('✅ データ更新成功');
    } else {
      throw new Error('データの更新に失敗しました');
    }
    
    // データの削除（クリーンアップ）
    console.log('🗑️  テストデータクリーンアップ中...');
    const deleteResult = await testCollection.deleteOne({ _id: insertResult.insertedId });
    
    if (deleteResult.deletedCount > 0) {
      console.log('✅ データ削除成功');
    } else {
      throw new Error('データの削除に失敗しました');
    }
    
    return true;
  } catch (error) {
    console.error('❌ データ操作テスト失敗:', error.message);
    return false;
  }
}

// 通報システムの動作確認
async function testReportingSystem() {
  console.log('\n🚨 通報システム動作確認...');
  
  try {
    const reportsCollection = mongoose.connection.collection('reports');
    
    // 通報データのサンプル作成
    const sampleReport = {
      reporterId: new mongoose.Types.ObjectId(),
      targetType: 'post',
      targetId: new mongoose.Types.ObjectId(),
      category: 'harassment',
      description: 'システムテスト用の通報データ',
      priority: 'medium',
      status: 'pending',
      createdAt: new Date(),
      falseReportScore: 0.1,
      priorityScore: 65
    };
    
    console.log('📝 サンプル通報作成中...');
    const result = await reportsCollection.insertOne(sampleReport);
    
    console.log('✅ 通報作成成功');
    console.log(`📋 通報ID: ${result.insertedId}`);
    console.log(`⚠️  優先度: ${sampleReport.priority}`);
    console.log(`📊 優先度スコア: ${sampleReport.priorityScore}`);
    
    // 通報の検索テスト
    console.log('🔍 通報検索テスト...');
    const foundReport = await reportsCollection.findOne({
      category: 'harassment',
      status: 'pending'
    });
    
    if (foundReport) {
      console.log('✅ 通報検索成功');
    } else {
      console.log('⚠️  通報検索 - データが見つかりません');
    }
    
    // 統計情報の取得テスト
    console.log('📊 通報統計テスト...');
    const stats = await reportsCollection.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]).toArray();
    
    console.log('✅ 統計取得成功:');
    stats.forEach(stat => {
      console.log(`   - ${stat._id}: ${stat.count}件`);
    });
    
    // テストデータのクリーンアップ
    await reportsCollection.deleteOne({ _id: result.insertedId });
    console.log('🗑️  テストデータクリーンアップ完了');
    
    return true;
  } catch (error) {
    console.error('❌ 通報システムテスト失敗:', error.message);
    return false;
  }
}

// APIエンドポイントのテスト（簡易版）
async function testAPIEndpoints() {
  console.log('\n🌐 API構造確認...');
  
  // ファイルシステムでAPIルートの存在確認
  const fs = require('fs');
  const path = require('path');
  
  const apiRoutes = [
    'app/api/reports/route.ts',
    'app/api/admin/users/route.ts',
    'app/api/admin/posts/route.ts',
    'app/api/admin/reports/route.ts'
  ];
  
  let allExist = true;
  
  apiRoutes.forEach(route => {
    const fullPath = path.join(process.cwd(), route);
    if (fs.existsSync(fullPath)) {
      console.log(`✅ ${route} - 存在`);
    } else {
      console.log(`❌ ${route} - 不存在`);
      allExist = false;
    }
  });
  
  return allExist;
}

// パフォーマンステスト
async function testPerformance() {
  console.log('\n⚡ パフォーマンステスト...');
  
  try {
    const testCollection = mongoose.connection.collection('performance_test');
    const startTime = Date.now();
    
    // 100件のデータを一括挿入
    console.log('📝 一括挿入テスト（100件）...');
    const testDocs = Array.from({ length: 100 }, (_, i) => ({
      index: i,
      timestamp: new Date(),
      data: `test-data-${i}`,
      randomValue: Math.random()
    }));
    
    const insertResult = await testCollection.insertMany(testDocs);
    const insertTime = Date.now() - startTime;
    
    console.log(`✅ 一括挿入完了: ${insertResult.insertedCount}件 (${insertTime}ms)`);
    
    // インデックス作成テスト
    console.log('🔍 インデックス作成テスト...');
    const indexStartTime = Date.now();
    await testCollection.createIndex({ index: 1, timestamp: -1 });
    const indexTime = Date.now() - indexStartTime;
    
    console.log(`✅ インデックス作成完了 (${indexTime}ms)`);
    
    // 検索パフォーマンステスト
    console.log('🔎 検索パフォーマンステスト...');
    const searchStartTime = Date.now();
    const searchResult = await testCollection.find({
      index: { $gte: 50 }
    }).sort({ timestamp: -1 }).limit(10).toArray();
    const searchTime = Date.now() - searchStartTime;
    
    console.log(`✅ 検索完了: ${searchResult.length}件取得 (${searchTime}ms)`);
    
    // クリーンアップ
    await testCollection.drop();
    console.log('🗑️  パフォーマンステストデータクリーンアップ完了');
    
    // パフォーマンス評価
    console.log('\n📊 パフォーマンス評価:');
    console.log(`   - 一括挿入: ${insertTime}ms (${insertTime < 1000 ? '良好' : '要改善'})`);
    console.log(`   - インデックス: ${indexTime}ms (${indexTime < 100 ? '良好' : '普通'})`);
    console.log(`   - 検索: ${searchTime}ms (${searchTime < 50 ? '良好' : '普通'})`);
    
    return true;
  } catch (error) {
    console.error('❌ パフォーマンステスト失敗:', error.message);
    return false;
  }
}

// メインテスト実行
async function runAllTests() {
  console.log('🚀 システム総合テスト開始\n');
  console.log('='.repeat(50));
  
  const testResults = {
    database: false,
    collections: false,
    dataOperations: false,
    reportingSystem: false,
    apiStructure: false,
    performance: false
  };
  
  // 各テストを順次実行
  testResults.database = await testDatabaseConnection();
  
  if (testResults.database) {
    testResults.collections = await testCollections();
    testResults.dataOperations = await testDataOperations();
    testResults.reportingSystem = await testReportingSystem();
    testResults.performance = await testPerformance();
  }
  
  testResults.apiStructure = await testAPIEndpoints();
  
  // テスト結果サマリー
  console.log('\n' + '='.repeat(50));
  console.log('📋 テスト結果サマリー');
  console.log('='.repeat(50));
  
  Object.entries(testResults).forEach(([testName, result]) => {
    const status = result ? '✅ 成功' : '❌ 失敗';
    const testNames = {
      database: 'データベース接続',
      collections: 'コレクション確認',
      dataOperations: 'データ操作',
      reportingSystem: '通報システム',
      apiStructure: 'API構造',
      performance: 'パフォーマンス'
    };
    console.log(`${status} - ${testNames[testName]}`);
  });
  
  const successCount = Object.values(testResults).filter(Boolean).length;
  const totalCount = Object.keys(testResults).length;
  
  console.log('\n📊 総合結果:');
  console.log(`✅ 成功: ${successCount}/${totalCount}`);
  console.log(`❌ 失敗: ${totalCount - successCount}/${totalCount}`);
  
  if (successCount === totalCount) {
    console.log('\n🎉 すべてのテストが成功しました！');
    console.log('システムは正常に動作しています。');
  } else {
    console.log('\n⚠️  一部のテストが失敗しました。');
    console.log('ログを確認して問題を解決してください。');
  }
  
  // MongoDB接続を閉じる
  if (mongoose.connection.readyState === 1) {
    await mongoose.disconnect();
    console.log('\n🔌 MongoDB接続を切断しました');
  }
  
  process.exit(successCount === totalCount ? 0 : 1);
}

// エラーハンドリング
process.on('uncaughtException', (error) => {
  console.error('❌ 未捕捉エラー:', error.message);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ 未処理のPromise拒否:', reason);
  process.exit(1);
});

// テスト実行
runAllTests().catch((error) => {
  console.error('❌ テスト実行エラー:', error.message);
  process.exit(1);
});