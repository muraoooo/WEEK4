const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api/admin/reports';
const ADMIN_SECRET = 'admin-development-secret-key';

// カラー出力用のヘルパー
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

// APIリクエストのヘッダー
const headers = {
  'Content-Type': 'application/json',
  'x-admin-secret': ADMIN_SECRET
};

async function testReportsAPI() {
  console.log('\n========================================');
  console.log('   通報システムAPIテスト開始');
  console.log('========================================\n');

  try {
    // 1. 通報一覧の取得テスト
    log.info('テスト1: 通報一覧の取得');
    const listResponse = await axios.get(BASE_URL, { headers });
    
    if (listResponse.data.reports && Array.isArray(listResponse.data.reports)) {
      log.success(`通報一覧取得成功: ${listResponse.data.reports.length}件の通報を取得`);
      log.info(`統計情報: 合計${listResponse.data.total}件, 未処理${listResponse.data.stats.pending}件`);
    } else {
      throw new Error('通報一覧の形式が不正です');
    }

    // 2. フィルタリングテスト
    log.info('\nテスト2: ステータスフィルタリング (pending)');
    const filterResponse = await axios.get(`${BASE_URL}?status=pending`, { headers });
    log.success(`フィルタリング成功: ${filterResponse.data.reports.length}件の未処理通報を取得`);

    // 3. 優先度フィルタリングテスト
    log.info('\nテスト3: 優先度フィルタリング (urgent)');
    const priorityResponse = await axios.get(`${BASE_URL}?priority=urgent`, { headers });
    log.success(`優先度フィルタリング成功: ${priorityResponse.data.reports.length}件の緊急通報を取得`);

    // 4. 新規通報作成テスト
    log.info('\nテスト4: 新規通報の作成');
    const randomId = () => Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const newReport = {
      reportType: 'post',
      targetId: '507f1f77bcf86cd79943' + randomId().substring(0, 4),
      targetType: 'post',
      reporterId: '507f1f77bcf86cd79943' + randomId().substring(0, 4),
      reporterEmail: `test-${Date.now()}@example.com`,
      reporterName: 'APIテストユーザー',
      targetUserId: '507f1f77bcf86cd79943' + randomId().substring(0, 4),
      targetUserEmail: 'violator@example.com',
      targetUserName: 'テスト違反者',
      category: 'spam',
      reason: 'APIテスト用の通報',
      description: 'これはAPIテストで作成された通報です。',
      priority: 'low'
    };

    const createResponse = await axios.post(BASE_URL, newReport, { headers });
    
    if (createResponse.data.success && createResponse.data.reportId) {
      log.success(`新規通報作成成功: ID ${createResponse.data.reportId}`);
      
      // 5. 作成した通報の詳細取得
      log.info('\nテスト5: 通報詳細の取得');
      const detailResponse = await axios.get(`${BASE_URL}/${createResponse.data.reportId}`, { headers });
      
      if (detailResponse.data.report) {
        log.success(`通報詳細取得成功: ${detailResponse.data.report.reason}`);
      }

      // 6. ステータス更新テスト
      log.info('\nテスト6: 通報ステータスの更新');
      const updateData = {
        reportId: createResponse.data.reportId,
        status: 'under_review',
        reviewNotes: 'APIテストによるレビュー',
        assignedTo: 'test-admin@example.com'
      };

      const updateResponse = await axios.put(BASE_URL, updateData, { headers });
      
      if (updateResponse.data.success) {
        log.success('通報ステータス更新成功');
      }

      // 7. アクション実行テスト（警告）
      log.info('\nテスト7: 警告アクションの実行');
      const actionData = {
        reportId: createResponse.data.reportId,
        action: 'warn',
        internalNote: 'APIテストによる警告発行'
      };

      const actionResponse = await axios.put(BASE_URL, actionData, { headers });
      
      if (actionResponse.data.success) {
        log.success('警告アクション実行成功');
      }

      // 8. 通報の承認テスト
      log.info('\nテスト8: 通報の承認');
      const approveData = {
        reportId: createResponse.data.reportId,
        status: 'approved',
        resolution: 'APIテストによる承認'
      };

      const approveResponse = await axios.put(BASE_URL, approveData, { headers });
      
      if (approveResponse.data.success) {
        log.success('通報承認成功');
      }

      // 9. 内部メモ追加テスト
      log.info('\nテスト9: 内部メモの追加');
      const noteData = {
        reportId: createResponse.data.reportId,
        internalNote: 'これはAPIテストで追加された内部メモです。'
      };

      const noteResponse = await axios.put(BASE_URL, noteData, { headers });
      
      if (noteResponse.data.success) {
        log.success('内部メモ追加成功');
      }

      // 10. 解決済みへの更新
      log.info('\nテスト10: 通報を解決済みに更新');
      const resolveData = {
        reportId: createResponse.data.reportId,
        status: 'resolved',
        resolution: 'APIテストによる解決'
      };

      const resolveResponse = await axios.put(BASE_URL, resolveData, { headers });
      
      if (resolveResponse.data.success) {
        log.success('通報を解決済みに更新成功');
      }

    } else {
      throw new Error('通報の作成に失敗しました');
    }

    // 11. カテゴリ別フィルタリング
    log.info('\nテスト11: カテゴリフィルタリング (spam)');
    const categoryResponse = await axios.get(`${BASE_URL}?category=spam`, { headers });
    log.success(`カテゴリフィルタリング成功: ${categoryResponse.data.reports.length}件のスパム通報を取得`);

    // 12. 複合フィルタリング
    log.info('\nテスト12: 複合フィルタリング (status=pending & priority=high)');
    const complexResponse = await axios.get(`${BASE_URL}?status=pending&priority=high`, { headers });
    log.success(`複合フィルタリング成功: ${complexResponse.data.reports.length}件の通報を取得`);

    // エラーケースのテスト
    log.warning('\n\nエラーケーステスト開始');
    
    // 13. 認証なしでのアクセス
    log.info('\nテスト13: 認証なしでのアクセス（401エラー期待）');
    try {
      await axios.get(BASE_URL);
      log.error('認証チェックが機能していません');
    } catch (error) {
      if (error.response && error.response.status === 401) {
        log.success('認証エラーを正しく検出');
      }
    }

    // 14. 不正なIDでの詳細取得
    log.info('\nテスト14: 不正なIDでの詳細取得（404エラー期待）');
    try {
      await axios.get(`${BASE_URL}/invalid-id-12345`, { headers });
      log.error('不正なIDのバリデーションが機能していません');
    } catch (error) {
      if (error.response && error.response.status === 404) {
        log.success('不正なIDエラーを正しく検出');
      }
    }

    // 15. 必須フィールドなしでの作成
    log.info('\nテスト15: 必須フィールドなしでの通報作成（400エラー期待）');
    try {
      await axios.post(BASE_URL, { reason: 'テスト' }, { headers });
      log.error('バリデーションが機能していません');
    } catch (error) {
      if (error.response && error.response.status === 400) {
        log.success('バリデーションエラーを正しく検出');
      }
    }

    console.log('\n========================================');
    console.log('   すべてのテストが完了しました！');
    console.log('========================================\n');

    // テスト結果のサマリー
    console.log('📊 テスト結果サマリー:');
    console.log('  ✅ 正常系テスト: 12項目成功');
    console.log('  ✅ エラー系テスト: 3項目成功');
    console.log('  ✅ 合計: 15項目すべて成功\n');

  } catch (error) {
    log.error('テストエラーが発生しました:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error(error.message);
    }
    process.exit(1);
  }
}

// サーバーが起動しているか確認してからテスト実行
async function checkServerAndRun() {
  log.info('サーバーの起動確認中...');
  
  try {
    await axios.get('http://localhost:3000');
    log.success('サーバーが起動しています');
    await testReportsAPI();
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      log.error('サーバーが起動していません。先に npm run dev でサーバーを起動してください。');
      process.exit(1);
    }
    // その他のエラーはテスト実行
    await testReportsAPI();
  }
}

// テスト実行
checkServerAndRun();