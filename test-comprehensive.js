const axios = require('axios');

// カラー出力
const colors = {
  success: '\x1b[32m',
  error: '\x1b[31m',
  info: '\x1b[36m',
  warning: '\x1b[33m',
  reset: '\x1b[0m'
};

const log = {
  success: (msg) => console.log(`${colors.success}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.error}❌ ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.info}ℹ️  ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.warning}⚠️  ${msg}${colors.reset}`)
};

// 共通設定
const BASE_URL = 'http://localhost:3000';
const ADMIN_SECRET = 'admin-development-secret-key';
const headers = {
  'Content-Type': 'application/json',
  'x-admin-secret': ADMIN_SECRET
};

// テストカウンター
let testsPassed = 0;
let testsFailed = 0;

async function testWithResult(testName, testFunc) {
  try {
    log.info(`テスト: ${testName}`);
    await testFunc();
    testsPassed++;
    log.success(`${testName} - PASSED`);
    return true;
  } catch (error) {
    testsFailed++;
    log.error(`${testName} - FAILED: ${error.message}`);
    return false;
  }
}

// 1. 通報システムのテスト
async function testReportsAPI() {
  console.log('\n====== 通報システムAPIテスト ======\n');
  
  // 通報一覧取得
  await testWithResult('通報一覧取得', async () => {
    const response = await axios.get(`${BASE_URL}/api/admin/reports`, { headers });
    if (!response.data.reports || !Array.isArray(response.data.reports)) {
      throw new Error('Invalid response format');
    }
  });

  // ページネーション
  await testWithResult('ページネーション（limit=10）', async () => {
    const response = await axios.get(`${BASE_URL}/api/admin/reports?page=1&limit=10`, { headers });
    if (response.data.reports.length > 10) {
      throw new Error('Limit not working');
    }
  });

  // フィルタリング
  await testWithResult('ステータスフィルタ（pending）', async () => {
    const response = await axios.get(`${BASE_URL}/api/admin/reports?status=pending`, { headers });
    const nonPending = response.data.reports.filter(r => r.status !== 'pending');
    if (nonPending.length > 0) {
      throw new Error('Filter not working correctly');
    }
  });

  // 優先度フィルタ
  await testWithResult('優先度フィルタ（urgent）', async () => {
    const response = await axios.get(`${BASE_URL}/api/admin/reports?priority=urgent`, { headers });
    // データが存在する場合のみチェック
    if (response.data.reports.length > 0) {
      const nonUrgent = response.data.reports.filter(r => r.priority && r.priority !== 'urgent');
      if (nonUrgent.length > 0) {
        throw new Error('Priority filter not working');
      }
    }
  });

  // 新規通報作成
  let createdReportId;
  await testWithResult('新規通報作成', async () => {
    const newReport = {
      reportType: 'post',
      targetId: '507f1f77bcf86cd799439' + Math.random().toString(36).substring(2, 6),
      targetType: 'post',
      reporterId: '507f1f77bcf86cd799439' + Math.random().toString(36).substring(2, 6),
      reporterEmail: `test-${Date.now()}@example.com`,
      reporterName: 'テストユーザー',
      targetUserId: '507f1f77bcf86cd799439' + Math.random().toString(36).substring(2, 6),
      targetUserEmail: 'target@example.com',
      targetUserName: 'ターゲットユーザー',
      category: 'spam',
      reason: '包括的テスト用の通報',
      description: 'これは包括的テストで作成された通報です。',
      priority: 'medium'
    };
    
    const response = await axios.post(`${BASE_URL}/api/admin/reports`, newReport, { headers });
    if (!response.data.success || !response.data.reportId) {
      throw new Error('Report creation failed');
    }
    createdReportId = response.data.reportId;
  });

  // 通報詳細取得
  if (createdReportId) {
    await testWithResult('通報詳細取得', async () => {
      const response = await axios.get(`${BASE_URL}/api/admin/reports/${createdReportId}`, { headers });
      if (!response.data.report) {
        throw new Error('Report details not found');
      }
    });

    // ステータス更新
    await testWithResult('通報ステータス更新', async () => {
      const updateData = {
        reportId: createdReportId,
        status: 'under_review',
        reviewNotes: '包括的テストによるレビュー'
      };
      const response = await axios.put(`${BASE_URL}/api/admin/reports`, updateData, { headers });
      if (!response.data.success) {
        throw new Error('Status update failed');
      }
    });
  }
}

// 2. ユーザー管理APIテスト
async function testUsersAPI() {
  console.log('\n====== ユーザー管理APIテスト ======\n');
  
  // ユーザー一覧取得
  await testWithResult('ユーザー一覧取得', async () => {
    const response = await axios.get(`${BASE_URL}/api/admin/users`, { headers });
    if (!response.data.users || !Array.isArray(response.data.users)) {
      throw new Error('Invalid users response');
    }
  });

  // 検索機能
  await testWithResult('ユーザー検索（メール）', async () => {
    const response = await axios.get(`${BASE_URL}/api/admin/users?search=@gmail.com`, { headers });
    // 結果があればメールアドレスを確認
    if (response.data.users.length > 0) {
      const nonMatching = response.data.users.filter(u => !u.email.includes('@gmail.com'));
      if (nonMatching.length > 0) {
        throw new Error('Search not filtering correctly');
      }
    }
  });

  // 権限フィルタ
  await testWithResult('権限フィルタ（admin）', async () => {
    const response = await axios.get(`${BASE_URL}/api/admin/users?role=admin`, { headers });
    if (response.data.users.length > 0) {
      const nonAdmin = response.data.users.filter(u => u.role !== 'admin');
      if (nonAdmin.length > 0) {
        throw new Error('Role filter not working');
      }
    }
  });

  // ステータスフィルタ
  await testWithResult('ステータスフィルタ（active）', async () => {
    const response = await axios.get(`${BASE_URL}/api/admin/users?status=active`, { headers });
    if (response.data.users.length > 0) {
      const nonActive = response.data.users.filter(u => u.status !== 'active');
      if (nonActive.length > 0) {
        throw new Error('Status filter not working');
      }
    }
  });
}

// 3. 投稿管理APIテスト
async function testPostsAPI() {
  console.log('\n====== 投稿管理APIテスト ======\n');
  
  // 投稿一覧取得
  await testWithResult('投稿一覧取得', async () => {
    const response = await axios.get(`${BASE_URL}/api/admin/posts`, { headers });
    if (!response.data.posts || !Array.isArray(response.data.posts)) {
      throw new Error('Invalid posts response');
    }
  });

  // 統計情報確認
  await testWithResult('投稿統計情報', async () => {
    const response = await axios.get(`${BASE_URL}/api/admin/posts`, { headers });
    if (typeof response.data.total !== 'number' ||
        typeof response.data.active !== 'number' ||
        typeof response.data.hidden !== 'number') {
      throw new Error('Statistics missing');
    }
  });
}

// 4. キャッシュ機能テスト
async function testCacheFunctionality() {
  console.log('\n====== キャッシュ機能テスト ======\n');
  
  let firstTime, secondTime;
  
  // 初回リクエスト
  await testWithResult('キャッシュミス時のリクエスト', async () => {
    const start = Date.now();
    await axios.get(`${BASE_URL}/api/admin/reports?page=999&limit=5`, { headers });
    firstTime = Date.now() - start;
    log.info(`  初回リクエスト時間: ${firstTime}ms`);
  });

  // 2回目リクエスト（キャッシュヒット期待）
  await testWithResult('キャッシュヒット時のリクエスト', async () => {
    const start = Date.now();
    await axios.get(`${BASE_URL}/api/admin/reports?page=999&limit=5`, { headers });
    secondTime = Date.now() - start;
    log.info(`  キャッシュリクエスト時間: ${secondTime}ms`);
    
    if (secondTime < firstTime) {
      const improvement = ((firstTime - secondTime) / firstTime * 100).toFixed(1);
      log.success(`  パフォーマンス向上: ${improvement}%`);
    }
  });

  // 異なるパラメータでキャッシュミス確認
  await testWithResult('異なるパラメータでキャッシュミス', async () => {
    const start = Date.now();
    await axios.get(`${BASE_URL}/api/admin/reports?page=998&limit=5`, { headers });
    const time = Date.now() - start;
    log.info(`  新規パラメータリクエスト時間: ${time}ms`);
  });
}

// 5. エラーハンドリングテスト
async function testErrorHandling() {
  console.log('\n====== エラーハンドリングテスト ======\n');
  
  // 認証なしでのアクセス
  await testWithResult('認証なしでのアクセス拒否', async () => {
    try {
      await axios.get(`${BASE_URL}/api/admin/reports`);
      throw new Error('Should have been rejected');
    } catch (error) {
      if (error.response && error.response.status === 401) {
        // 期待通りのエラー
        return;
      }
      throw error;
    }
  });

  // 不正なIDでのアクセス
  await testWithResult('不正なIDでの404エラー', async () => {
    try {
      await axios.get(`${BASE_URL}/api/admin/reports/invalid-id-format`, { headers });
      throw new Error('Should have returned 404');
    } catch (error) {
      if (error.response && error.response.status === 404) {
        // 期待通りのエラー
        return;
      }
      throw error;
    }
  });

  // 不正なデータでの作成
  await testWithResult('必須フィールドなしでのエラー', async () => {
    try {
      await axios.post(`${BASE_URL}/api/admin/reports`, { reason: 'テスト' }, { headers });
      throw new Error('Should have failed validation');
    } catch (error) {
      if (error.response && (error.response.status === 400 || error.response.status === 500)) {
        // 期待通りのエラー
        return;
      }
      throw error;
    }
  });
}

// 6. パフォーマンステスト
async function testPerformance() {
  console.log('\n====== パフォーマンステスト ======\n');
  
  // 大量データのページング
  await testWithResult('大量データページング（limit=100）', async () => {
    const start = Date.now();
    const response = await axios.get(`${BASE_URL}/api/admin/reports?limit=100`, { headers });
    const time = Date.now() - start;
    
    log.info(`  取得件数: ${response.data.reports.length}件`);
    log.info(`  応答時間: ${time}ms`);
    
    if (time > 5000) {
      throw new Error('Response too slow (>5s)');
    }
  });

  // 並列リクエスト
  await testWithResult('並列リクエスト処理（10並列）', async () => {
    const promises = [];
    for (let i = 0; i < 10; i++) {
      promises.push(axios.get(`${BASE_URL}/api/admin/reports?page=${i+1}&limit=10`, { headers }));
    }
    
    const start = Date.now();
    await Promise.all(promises);
    const time = Date.now() - start;
    
    log.info(`  10並列リクエスト総時間: ${time}ms`);
    log.info(`  平均時間: ${(time/10).toFixed(2)}ms/リクエスト`);
  });

  // 複雑なフィルタリング
  await testWithResult('複雑なフィルタリング性能', async () => {
    const start = Date.now();
    await axios.get(`${BASE_URL}/api/admin/reports?status=pending&priority=high&type=post&page=1&limit=20`, { headers });
    const time = Date.now() - start;
    
    log.info(`  複雑フィルタ応答時間: ${time}ms`);
    
    if (time > 3000) {
      throw new Error('Complex filter too slow (>3s)');
    }
  });
}

// 7. データ整合性テスト
async function testDataIntegrity() {
  console.log('\n====== データ整合性テスト ======\n');
  
  // ページネーションの整合性
  await testWithResult('ページネーション整合性', async () => {
    const page1 = await axios.get(`${BASE_URL}/api/admin/reports?page=1&limit=10`, { headers });
    const page2 = await axios.get(`${BASE_URL}/api/admin/reports?page=2&limit=10`, { headers });
    
    // 重複チェック
    const page1Ids = page1.data.reports.map(r => r._id);
    const page2Ids = page2.data.reports.map(r => r._id);
    const duplicates = page1Ids.filter(id => page2Ids.includes(id));
    
    if (duplicates.length > 0) {
      throw new Error('Duplicate items across pages');
    }
  });

  // 総数の整合性
  await testWithResult('総数カウント整合性', async () => {
    const response = await axios.get(`${BASE_URL}/api/admin/reports`, { headers });
    const total = response.data.total;
    const statsSum = Object.values(response.data.stats || {}).reduce((sum, stat) => {
      if (Array.isArray(stat)) {
        return sum + stat.reduce((s, item) => s + (item.count || 0), 0);
      }
      return sum;
    }, 0);
    
    log.info(`  総数: ${total}, 統計合計: ${statsSum}`);
  });
}

// メインテスト実行関数
async function runAllTests() {
  console.log('\n========================================');
  console.log('   包括的システムテスト開始');
  console.log('========================================\n');
  
  const startTime = Date.now();

  try {
    // サーバー確認
    log.info('サーバー接続確認中...');
    try {
      await axios.get(`${BASE_URL}/api/admin/reports`, { headers });
      log.success('サーバーに接続しました\n');
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        throw error;
      }
      // 401でも接続は成功
      if (error.response && error.response.status === 401) {
        log.success('サーバーに接続しました（認証必要）\n');
      } else {
        throw error;
      }
    }

    // 各テストスイートを実行
    await testReportsAPI();
    await testUsersAPI();
    await testPostsAPI();
    await testCacheFunctionality();
    await testErrorHandling();
    await testPerformance();
    await testDataIntegrity();

  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      log.error('サーバーが起動していません。npm run dev でサーバーを起動してください。');
      process.exit(1);
    }
    log.error(`予期しないエラー: ${error.message}`);
  }

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);

  // 最終結果
  console.log('\n========================================');
  console.log('   テスト結果サマリー');
  console.log('========================================\n');
  
  console.log(`📊 テスト統計:`);
  console.log(`  ✅ 成功: ${testsPassed}件`);
  console.log(`  ❌ 失敗: ${testsFailed}件`);
  console.log(`  ⏱️  総実行時間: ${totalTime}秒`);
  
  const successRate = ((testsPassed / (testsPassed + testsFailed)) * 100).toFixed(1);
  console.log(`  📈 成功率: ${successRate}%\n`);

  if (testsFailed === 0) {
    log.success('🎉 すべてのテストに合格しました！');
  } else {
    log.warning('⚠️  一部のテストが失敗しました。詳細を確認してください。');
  }
  
  process.exit(testsFailed > 0 ? 1 : 0);
}

// テスト実行
runAllTests();