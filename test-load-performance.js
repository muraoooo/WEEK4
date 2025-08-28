const axios = require('axios');
const { performance } = require('perf_hooks');

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

const BASE_URL = 'http://localhost:3000';
const ADMIN_SECRET = 'admin-development-secret-key';
const headers = {
  'Content-Type': 'application/json',
  'x-admin-secret': ADMIN_SECRET
};

// パフォーマンス統計を記録
class PerformanceStats {
  constructor(name) {
    this.name = name;
    this.times = [];
    this.errors = 0;
  }

  addTime(time) {
    this.times.push(time);
  }

  addError() {
    this.errors++;
  }

  getStats() {
    if (this.times.length === 0) {
      return { error: 'No data' };
    }

    const sorted = [...this.times].sort((a, b) => a - b);
    const sum = sorted.reduce((a, b) => a + b, 0);
    const avg = sum / sorted.length;
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const median = sorted[Math.floor(sorted.length / 2)];
    const p95 = sorted[Math.floor(sorted.length * 0.95)];
    const p99 = sorted[Math.floor(sorted.length * 0.99)];

    return {
      requests: this.times.length,
      errors: this.errors,
      min: min.toFixed(2),
      max: max.toFixed(2),
      avg: avg.toFixed(2),
      median: median.toFixed(2),
      p95: p95.toFixed(2),
      p99: p99.toFixed(2)
    };
  }
}

// 1. 負荷テスト - 順次リクエスト
async function sequentialLoadTest(endpoint, count = 100) {
  log.info(`順次負荷テスト開始: ${endpoint} (${count}回)`);
  const stats = new PerformanceStats('Sequential');
  
  for (let i = 0; i < count; i++) {
    const start = performance.now();
    try {
      await axios.get(`${BASE_URL}${endpoint}`, { headers });
      const time = performance.now() - start;
      stats.addTime(time);
      
      // プログレス表示
      if ((i + 1) % 20 === 0) {
        process.stdout.write(`  ${i + 1}/${count} 完了\r`);
      }
    } catch (error) {
      stats.addError();
    }
  }
  
  console.log(''); // 改行
  return stats.getStats();
}

// 2. 並列負荷テスト
async function parallelLoadTest(endpoint, parallel = 10, rounds = 10) {
  log.info(`並列負荷テスト開始: ${endpoint} (${parallel}並列 × ${rounds}ラウンド)`);
  const stats = new PerformanceStats('Parallel');
  
  for (let round = 0; round < rounds; round++) {
    const promises = [];
    const roundStart = performance.now();
    
    for (let i = 0; i < parallel; i++) {
      promises.push(
        axios.get(`${BASE_URL}${endpoint}`, { headers })
          .catch(() => { stats.addError(); return null; })
      );
    }
    
    await Promise.all(promises);
    const roundTime = performance.now() - roundStart;
    stats.addTime(roundTime / parallel); // 平均時間
    
    process.stdout.write(`  ラウンド ${round + 1}/${rounds} 完了\r`);
  }
  
  console.log(''); // 改行
  return stats.getStats();
}

// 3. スパイクテスト
async function spikeTest(endpoint, normalLoad = 5, spikeLoad = 50) {
  log.info(`スパイクテスト開始: ${endpoint} (通常${normalLoad} → スパイク${spikeLoad})`);
  const stats = new PerformanceStats('Spike');
  
  // 通常負荷フェーズ
  log.info('  通常負荷フェーズ...');
  for (let i = 0; i < 20; i++) {
    const promises = [];
    for (let j = 0; j < normalLoad; j++) {
      promises.push(
        axios.get(`${BASE_URL}${endpoint}`, { headers })
          .then(() => performance.now())
          .catch(() => { stats.addError(); return null; })
      );
    }
    
    const start = performance.now();
    await Promise.all(promises);
    const avgTime = (performance.now() - start) / normalLoad;
    stats.addTime(avgTime);
  }
  
  // スパイクフェーズ
  log.info('  スパイクフェーズ...');
  for (let i = 0; i < 5; i++) {
    const promises = [];
    for (let j = 0; j < spikeLoad; j++) {
      promises.push(
        axios.get(`${BASE_URL}${endpoint}`, { headers })
          .catch(() => { stats.addError(); return null; })
      );
    }
    
    const start = performance.now();
    await Promise.all(promises);
    const avgTime = (performance.now() - start) / spikeLoad;
    stats.addTime(avgTime);
  }
  
  return stats.getStats();
}

// 4. エンドポイント別パフォーマンス比較
async function compareEndpoints() {
  log.info('エンドポイント別パフォーマンステスト');
  
  const endpoints = [
    { path: '/api/admin/reports', name: '通報一覧' },
    { path: '/api/admin/reports?status=pending', name: '通報（フィルタ付き）' },
    { path: '/api/admin/users', name: 'ユーザー一覧' },
    { path: '/api/admin/posts', name: '投稿一覧' }
  ];
  
  const results = {};
  
  for (const endpoint of endpoints) {
    const stats = new PerformanceStats(endpoint.name);
    
    for (let i = 0; i < 50; i++) {
      const start = performance.now();
      try {
        await axios.get(`${BASE_URL}${endpoint.path}`, { headers });
        stats.addTime(performance.now() - start);
      } catch (error) {
        stats.addError();
      }
    }
    
    results[endpoint.name] = stats.getStats();
  }
  
  return results;
}

// 5. キャッシュ効果測定
async function measureCacheEffect() {
  log.info('キャッシュ効果測定テスト');
  
  const endpoint = '/api/admin/reports?page=1&limit=20&status=pending';
  const results = {
    firstRun: [],
    cachedRun: []
  };
  
  // 初回実行（キャッシュなし）
  for (let i = 0; i < 10; i++) {
    // 異なるページでキャッシュをクリア
    await axios.get(`${BASE_URL}/api/admin/reports?page=${100+i}`, { headers });
    
    const start = performance.now();
    await axios.get(`${BASE_URL}${endpoint}`, { headers });
    results.firstRun.push(performance.now() - start);
  }
  
  // キャッシュあり実行
  for (let i = 0; i < 10; i++) {
    const start = performance.now();
    await axios.get(`${BASE_URL}${endpoint}`, { headers });
    results.cachedRun.push(performance.now() - start);
    
    // 少し待機（キャッシュ維持のため）
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  const avgFirst = results.firstRun.reduce((a, b) => a + b, 0) / results.firstRun.length;
  const avgCached = results.cachedRun.reduce((a, b) => a + b, 0) / results.cachedRun.length;
  const improvement = ((avgFirst - avgCached) / avgFirst * 100).toFixed(1);
  
  return {
    firstRun: avgFirst.toFixed(2),
    cachedRun: avgCached.toFixed(2),
    improvement: `${improvement}%`
  };
}

// 6. データ量別パフォーマンステスト
async function testByDataVolume() {
  log.info('データ量別パフォーマンステスト');
  
  const limits = [1, 5, 10, 20, 50, 100];
  const results = {};
  
  for (const limit of limits) {
    const stats = new PerformanceStats(`Limit ${limit}`);
    
    for (let i = 0; i < 20; i++) {
      const start = performance.now();
      try {
        await axios.get(`${BASE_URL}/api/admin/reports?limit=${limit}`, { headers });
        stats.addTime(performance.now() - start);
      } catch (error) {
        stats.addError();
      }
    }
    
    results[`${limit}件`] = {
      avg: stats.getStats().avg,
      min: stats.getStats().min,
      max: stats.getStats().max
    };
  }
  
  return results;
}

// メイン実行関数
async function runPerformanceTests() {
  console.log('\n========================================');
  console.log('   負荷・パフォーマンステスト');
  console.log('========================================\n');
  
  try {
    // サーバー確認
    log.info('サーバー接続確認中...');
    await axios.get(`${BASE_URL}/api/admin/reports`, { headers });
    log.success('サーバー接続OK\n');
    
    const results = {};
    
    // 1. 順次負荷テスト
    console.log('\n📊 1. 順次負荷テスト');
    console.log('─────────────────────');
    results.sequential = await sequentialLoadTest('/api/admin/reports', 100);
    console.log('結果:', results.sequential);
    
    // 2. 並列負荷テスト
    console.log('\n📊 2. 並列負荷テスト');
    console.log('─────────────────────');
    results.parallel = await parallelLoadTest('/api/admin/reports', 20, 10);
    console.log('結果:', results.parallel);
    
    // 3. スパイクテスト
    console.log('\n📊 3. スパイクテスト');
    console.log('─────────────────────');
    results.spike = await spikeTest('/api/admin/reports', 5, 30);
    console.log('結果:', results.spike);
    
    // 4. エンドポイント比較
    console.log('\n📊 4. エンドポイント別パフォーマンス');
    console.log('─────────────────────');
    results.endpoints = await compareEndpoints();
    Object.entries(results.endpoints).forEach(([name, stats]) => {
      console.log(`${name}:`, stats);
    });
    
    // 5. キャッシュ効果
    console.log('\n📊 5. キャッシュ効果測定');
    console.log('─────────────────────');
    results.cache = await measureCacheEffect();
    console.log('結果:', results.cache);
    
    // 6. データ量テスト
    console.log('\n📊 6. データ量別パフォーマンス');
    console.log('─────────────────────');
    results.dataVolume = await testByDataVolume();
    Object.entries(results.dataVolume).forEach(([limit, stats]) => {
      console.log(`${limit}:`, stats);
    });
    
    // 最終サマリー
    console.log('\n========================================');
    console.log('   パフォーマンステストサマリー');
    console.log('========================================\n');
    
    console.log('🎯 主要指標:');
    console.log(`  順次処理平均: ${results.sequential.avg}ms`);
    console.log(`  並列処理平均: ${results.parallel.avg}ms`);
    console.log(`  キャッシュ改善率: ${results.cache.improvement}`);
    console.log(`  エラー率: ${((results.sequential.errors + results.parallel.errors) / 300 * 100).toFixed(1)}%`);
    
    // パフォーマンス評価
    const avgResponseTime = parseFloat(results.sequential.avg);
    if (avgResponseTime < 100) {
      log.success('\n🏆 優秀: 応答時間が非常に高速です（<100ms）');
    } else if (avgResponseTime < 500) {
      log.success('\n👍 良好: 応答時間が適切です（<500ms）');
    } else if (avgResponseTime < 1000) {
      log.warning('\n⚠️  改善余地: 応答時間がやや遅いです（<1s）');
    } else {
      log.error('\n❌ 要改善: 応答時間が遅すぎます（>1s）');
    }
    
  } catch (error) {
    log.error(`テストエラー: ${error.message}`);
    process.exit(1);
  }
}

// 実行
runPerformanceTests();