/**
 * パフォーマンス監視システムのテストスクリプト
 */

const { performanceMonitor } = require('../lib/performance-monitor.ts');

async function testPerformanceMonitoring() {
  console.log('🚀 パフォーマンス監視システムのテスト開始\n');

  try {
    // 1. 基本的なメトリクス記録のテスト
    console.log('📊 メトリクス記録のテスト...');
    
    // 複数のテストメトリクスを生成
    const testMetrics = [
      { endpoint: '/api/posts', method: 'GET', responseTime: 150, statusCode: 200, cacheHit: true },
      { endpoint: '/api/posts', method: 'GET', responseTime: 180, statusCode: 200, cacheHit: true },
      { endpoint: '/api/posts', method: 'POST', responseTime: 350, statusCode: 201, cacheHit: false },
      { endpoint: '/api/users', method: 'GET', responseTime: 120, statusCode: 200, cacheHit: true },
      { endpoint: '/api/auth/login', method: 'POST', responseTime: 250, statusCode: 200, cacheHit: false },
      { endpoint: '/api/auth/login', method: 'POST', responseTime: 1500, statusCode: 500, cacheHit: false }, // エラーケース
      { endpoint: '/api/reports', method: 'GET', responseTime: 300, statusCode: 200, cacheHit: false },
      { endpoint: '/api/admin/users', method: 'GET', responseTime: 450, statusCode: 200, cacheHit: false },
    ];

    // メトリクスを記録
    for (const metric of testMetrics) {
      await performanceMonitor.recordMetric(
        metric.endpoint,
        metric.method,
        metric.responseTime,
        metric.statusCode,
        {
          ip: '127.0.0.1',
          userAgent: 'Test-Agent/1.0',
          cacheHit: metric.cacheHit
        }
      );
      
      // 少し間隔を空ける
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    console.log('✅ メトリクス記録完了\n');

    // 2. システム健全性の評価テスト
    console.log('🏥 システム健全性の評価...');
    const systemHealth = await performanceMonitor.evaluateSystemHealth();
    
    console.log(`   ステータス: ${systemHealth.status}`);
    console.log(`   スコア: ${systemHealth.score}/100`);
    console.log(`   平均レスポンス時間: ${systemHealth.metrics.avgResponseTime}ms`);
    console.log(`   エラー率: ${(systemHealth.metrics.errorRate * 100).toFixed(1)}%`);
    console.log(`   キャッシュヒット率: ${(systemHealth.metrics.cacheHitRate * 100).toFixed(1)}%`);
    console.log(`   データベース健全性: ${systemHealth.metrics.dbHealth}`);
    
    if (systemHealth.alerts.length > 0) {
      console.log(`   アクティブアラート: ${systemHealth.alerts.length}件`);
      systemHealth.alerts.forEach((alert, i) => {
        console.log(`     ${i + 1}. [${alert.severity.toUpperCase()}] ${alert.message}`);
      });
    }
    
    if (systemHealth.recommendations.length > 0) {
      console.log('   推奨事項:');
      systemHealth.recommendations.forEach((rec, i) => {
        console.log(`     ${i + 1}. ${rec}`);
      });
    }
    
    console.log('✅ システム健全性評価完了\n');

    // 3. エンドポイント分析のテスト
    console.log('📈 エンドポイント分析...');
    const endpointAnalysis = performanceMonitor.getEndpointAnalysis(60 * 1000); // 過去1分
    
    console.log('   上位エンドポイント:');
    endpointAnalysis.slice(0, 5).forEach((endpoint, i) => {
      console.log(`     ${i + 1}. ${endpoint.method} ${endpoint.endpoint}`);
      console.log(`        リクエスト数: ${endpoint.requestCount}`);
      console.log(`        平均レスポンス時間: ${endpoint.avgResponseTime}ms`);
      console.log(`        エラー率: ${(endpoint.errorRate * 100).toFixed(1)}%`);
      console.log(`        トレンド: ${endpoint.trend.trend} (${endpoint.trend.changePercent}%)`);
      console.log('');
    });
    
    console.log('✅ エンドポイント分析完了\n');

    // 4. パフォーマンスレポート生成のテスト
    console.log('📋 パフォーマンスレポート生成...');
    const report = performanceMonitor.generateReport(60 * 1000); // 過去1分
    
    console.log('   サマリー:');
    console.log(`     総リクエスト数: ${report.summary.totalRequests}`);
    console.log(`     平均レスポンス時間: ${report.summary.avgResponseTime}ms`);
    console.log(`     エラー率: ${(report.summary.errorRate * 100).toFixed(1)}%`);
    console.log(`     アップタイム: ${Math.round(report.summary.uptime)}秒`);
    
    if (report.slowestEndpoints.length > 0) {
      console.log('   最も遅いエンドポイント:');
      report.slowestEndpoints.slice(0, 3).forEach((endpoint, i) => {
        console.log(`     ${i + 1}. ${endpoint.endpoint}: ${endpoint.avgResponseTime}ms`);
      });
    }
    
    if (report.errorSummary.length > 0) {
      console.log('   エラーサマリー:');
      report.errorSummary.forEach(error => {
        console.log(`     HTTP ${error.statusCode}: ${error.count}件 (${error.percentage}%)`);
      });
    }
    
    console.log('✅ パフォーマンスレポート生成完了\n');

    // 5. アラートテスト（意図的に高負荷メトリクスを生成）
    console.log('🚨 アラートシステムのテスト...');
    
    // 高レスポンス時間のメトリクスを生成してアラートをトリガー
    await performanceMonitor.recordMetric(
      '/api/test/slow',
      'GET',
      4000, // 4秒（クリティカル閾値を超える）
      200,
      {
        ip: '127.0.0.1',
        userAgent: 'Test-Agent/1.0',
        cacheHit: false
      }
    );
    
    // エラーメトリクスを生成
    await performanceMonitor.recordMetric(
      '/api/test/error',
      'POST',
      500,
      500,
      {
        ip: '127.0.0.1',
        userAgent: 'Test-Agent/1.0',
        errorMessage: 'Test error for alerting',
        cacheHit: false
      }
    );
    
    // アラートが生成されたかチェック
    await new Promise(resolve => setTimeout(resolve, 100)); // アラート処理の時間を待つ
    const updatedHealth = await performanceMonitor.evaluateSystemHealth();
    
    console.log(`   新しいアラート数: ${updatedHealth.alerts.length}件`);
    updatedHealth.alerts.forEach((alert, i) => {
      console.log(`     ${i + 1}. [${alert.severity.toUpperCase()}] ${alert.message}`);
    });
    
    console.log('✅ アラートシステムテスト完了\n');

    // 6. 全体的な統計
    console.log('📊 テスト完了後の統計:');
    const finalHealth = await performanceMonitor.evaluateSystemHealth();
    const finalReport = performanceMonitor.generateReport();
    
    console.log(`   システム健全性: ${finalHealth.status} (${finalHealth.score}/100)`);
    console.log(`   総メトリクス数: ${finalReport.summary.totalRequests}`);
    console.log(`   アクティブアラート: ${finalHealth.alerts.length}件`);
    
    console.log('\n🎉 パフォーマンス監視システムのテストが正常に完了しました！');
    
    // テスト結果の評価
    const testResults = {
      metricsRecorded: finalReport.summary.totalRequests > 0,
      systemHealthCalculated: finalHealth.score >= 0,
      endpointAnalysisWorking: endpointAnalysis.length > 0,
      reportGenerated: finalReport.summary.totalRequests > 0,
      alertsTriggered: finalHealth.alerts.length > 0
    };
    
    console.log('\n📋 テスト結果:');
    Object.entries(testResults).forEach(([test, passed]) => {
      console.log(`   ${test}: ${passed ? '✅ PASS' : '❌ FAIL'}`);
    });
    
    const allTestsPassed = Object.values(testResults).every(result => result);
    console.log(`\n総合結果: ${allTestsPassed ? '✅ 全テスト成功' : '❌ 一部テスト失敗'}`);

  } catch (error) {
    console.error('❌ テスト中にエラーが発生しました:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

// テスト実行
if (require.main === module) {
  testPerformanceMonitoring().then(() => {
    console.log('\nテスト完了 - プロセスを終了します');
    process.exit(0);
  }).catch(error => {
    console.error('テスト実行エラー:', error);
    process.exit(1);
  });
}

module.exports = { testPerformanceMonitoring };