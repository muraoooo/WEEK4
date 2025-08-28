/**
 * システム設定機能の包括的テストスイート
 * 各設定カテゴリのCRUD操作、バリデーション、統合テストを実行
 */

const axios = require('axios');
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const BASE_URL = 'http://localhost:3001';
const ADMIN_SECRET = process.env.ADMIN_SECRET_KEY || 'admin-development-secret-key';

// テスト用のヘッダー
const headers = {
  'Content-Type': 'application/json',
  'x-admin-secret': ADMIN_SECRET,
};

// テストデータ
const testSettings = {
  general: {
    siteName: 'Test System',
    siteDescription: 'テストシステムの説明',
    adminEmail: 'test-admin@example.com',
    timezone: 'Asia/Tokyo',
    defaultLanguage: 'ja',
    maintenanceMode: false,
    maintenanceMessage: 'テストメンテナンス',
    maintenanceExcludedIPs: ['127.0.0.1', '192.168.1.1']
  },
  security: {
    sessionTimeout: 60,
    maxLoginAttempts: 3,
    lockoutDuration: 15,
    passwordMinLength: 10,
    passwordRequireUppercase: true,
    passwordRequireLowercase: true,
    passwordRequireNumbers: true,
    passwordRequireSpecialChars: true,
    passwordExpiryDays: 90,
    passwordHistoryCount: 5,
    forceHttps: true,
    force2FA: false,
    csrfProtection: true,
    ipWhitelist: ['192.168.0.0/24'],
    ipBlacklist: ['10.0.0.1']
  },
  email: {
    smtpHost: 'smtp.test.com',
    smtpPort: 587,
    smtpUser: 'test@test.com',
    smtpPassword: 'testpassword',
    smtpSecure: false,
    emailFrom: 'noreply@test.com',
    emailFromName: 'Test System',
    emailSendDelay: 2,
    emailMaxRetries: 5
  },
  storage: {
    maxFileSize: 20,
    allowedFileTypes: ['jpg', 'png', 'pdf', 'docx'],
    imageAutoResize: true,
    imageMaxWidth: 1920,
    imageMaxHeight: 1080,
    storageType: 'local',
    cdnEnabled: true,
    cdnUrl: 'https://cdn.test.com',
    cacheExpiry: 3600,
    autoBackup: true,
    backupInterval: 12,
    backupRetention: 60
  },
  notification: {
    notifyNewUser: true,
    notifyReport: true,
    notifyError: true,
    errorLogLevel: 'warning',
    alertFrequency: 30,
    notificationEmails: ['alert1@test.com', 'alert2@test.com'],
    cpuAlertThreshold: 75,
    memoryAlertThreshold: 80,
    diskAlertThreshold: 85
  },
  api: {
    rateLimitPerMinute: 100,
    rateLimitPerHour: 5000,
    rateLimitExcludedIPs: ['127.0.0.1'],
    corsEnabled: true,
    allowedOrigins: ['http://localhost:3000', 'https://test.com'],
    allowedMethods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    webhookUrl: 'https://webhook.test.com/endpoint',
    webhookSecret: 'test-webhook-secret',
    webhookEvents: ['user.created', 'post.created'],
    webhookRetries: 5,
    webhookTimeout: 15
  }
};

// カラー出力用のヘルパー
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// テストカテゴリ
class SystemSettingsTest {
  constructor() {
    this.passedTests = 0;
    this.failedTests = 0;
    this.totalTests = 0;
  }

  async runAllTests() {
    log('\n========================================', 'bright');
    log('   システム設定機能 総合テスト開始', 'cyan');
    log('========================================\n', 'bright');

    // MongoDB接続テスト
    await this.testMongoConnection();

    // 各カテゴリのテスト
    await this.testGeneralSettings();
    await this.testSecuritySettings();
    await this.testEmailSettings();
    await this.testStorageSettings();
    await this.testNotificationSettings();
    await this.testApiSettings();

    // バリデーションテスト
    await this.testValidation();

    // 統合テスト
    await this.testIntegration();

    // テスト結果のサマリー
    this.printSummary();
  }

  async testMongoConnection() {
    log('\n【MongoDB接続テスト】', 'blue');
    try {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/secure_session_db');
      this.passTest('MongoDB接続');
      await mongoose.connection.close();
    } catch (error) {
      this.failTest('MongoDB接続', error.message);
    }
  }

  async testGeneralSettings() {
    log('\n【一般設定テスト】', 'blue');
    
    // 1. 設定の取得
    try {
      const response = await axios.get(`${BASE_URL}/api/admin/settings/general`, { headers });
      if (response.data.success) {
        this.passTest('一般設定の取得');
      } else {
        this.failTest('一般設定の取得', 'レスポンスが不正');
      }
    } catch (error) {
      this.failTest('一般設定の取得', error.message);
    }

    // 2. 設定の更新
    try {
      const response = await axios.put(
        `${BASE_URL}/api/admin/settings/general`,
        {
          settings: testSettings.general,
          reason: 'テスト更新'
        },
        { headers }
      );
      if (response.data.success) {
        this.passTest('一般設定の更新');
      } else {
        this.failTest('一般設定の更新', 'レスポンスが不正');
      }
    } catch (error) {
      this.failTest('一般設定の更新', error.message);
    }

    // 3. 更新後の確認
    try {
      const response = await axios.get(`${BASE_URL}/api/admin/settings/general`, { headers });
      if (response.data.settings.siteName === testSettings.general.siteName) {
        this.passTest('一般設定の永続化');
      } else {
        this.failTest('一般設定の永続化', '設定が保存されていない');
      }
    } catch (error) {
      this.failTest('一般設定の永続化', error.message);
    }
  }

  async testSecuritySettings() {
    log('\n【セキュリティ設定テスト】', 'blue');
    
    // 1. 設定の更新
    try {
      const response = await axios.put(
        `${BASE_URL}/api/admin/settings/security`,
        {
          settings: testSettings.security,
          reason: 'セキュリティ設定のテスト'
        },
        { headers }
      );
      if (response.data.success) {
        this.passTest('セキュリティ設定の更新');
      }
    } catch (error) {
      this.failTest('セキュリティ設定の更新', error.message);
    }

    // 2. パスワードポリシーの確認
    try {
      const response = await axios.get(`${BASE_URL}/api/admin/settings/security`, { headers });
      const settings = response.data.settings;
      if (
        settings.passwordMinLength === 10 &&
        settings.passwordRequireUppercase === true &&
        settings.passwordRequireNumbers === true
      ) {
        this.passTest('パスワードポリシー設定');
      } else {
        this.failTest('パスワードポリシー設定', '設定値が不正');
      }
    } catch (error) {
      this.failTest('パスワードポリシー設定', error.message);
    }

    // 3. IPアクセス制限の確認
    try {
      const response = await axios.get(`${BASE_URL}/api/admin/settings/security`, { headers });
      const settings = response.data.settings;
      if (
        settings.ipWhitelist?.includes('192.168.0.0/24') &&
        settings.ipBlacklist?.includes('10.0.0.1')
      ) {
        this.passTest('IPアクセス制限設定');
      } else {
        this.failTest('IPアクセス制限設定', 'IPリストが不正');
      }
    } catch (error) {
      this.failTest('IPアクセス制限設定', error.message);
    }
  }

  async testEmailSettings() {
    log('\n【メール設定テスト】', 'blue');
    
    // 1. SMTP設定の更新
    try {
      const response = await axios.put(
        `${BASE_URL}/api/admin/settings/email`,
        {
          settings: testSettings.email,
          reason: 'メール設定のテスト'
        },
        { headers }
      );
      if (response.data.success) {
        this.passTest('メール設定の更新');
      }
    } catch (error) {
      this.failTest('メール設定の更新', error.message);
    }

    // 2. 設定値の確認
    try {
      const response = await axios.get(`${BASE_URL}/api/admin/settings/email`, { headers });
      const settings = response.data.settings;
      if (
        settings.smtpHost === 'smtp.test.com' &&
        settings.smtpPort === 587 &&
        settings.emailFrom === 'noreply@test.com'
      ) {
        this.passTest('SMTP設定の確認');
      } else {
        this.failTest('SMTP設定の確認', '設定値が不正');
      }
    } catch (error) {
      this.failTest('SMTP設定の確認', error.message);
    }

    // 3. テストメール送信（スキップ可能）
    log('  ※ テストメール送信はSMTP設定が必要なためスキップ', 'yellow');
  }

  async testStorageSettings() {
    log('\n【ストレージ設定テスト】', 'blue');
    
    // 1. ストレージ設定の更新
    try {
      const response = await axios.put(
        `${BASE_URL}/api/admin/settings/storage`,
        {
          settings: testSettings.storage,
          reason: 'ストレージ設定のテスト'
        },
        { headers }
      );
      if (response.data.success) {
        this.passTest('ストレージ設定の更新');
      }
    } catch (error) {
      this.failTest('ストレージ設定の更新', error.message);
    }

    // 2. ファイルアップロード設定の確認
    try {
      const response = await axios.get(`${BASE_URL}/api/admin/settings/storage`, { headers });
      const settings = response.data.settings;
      if (
        settings.maxFileSize === 20 &&
        settings.allowedFileTypes?.includes('pdf') &&
        settings.imageAutoResize === true
      ) {
        this.passTest('ファイルアップロード設定');
      } else {
        this.failTest('ファイルアップロード設定', '設定値が不正');
      }
    } catch (error) {
      this.failTest('ファイルアップロード設定', error.message);
    }

    // 3. CDN・バックアップ設定の確認
    try {
      const response = await axios.get(`${BASE_URL}/api/admin/settings/storage`, { headers });
      const settings = response.data.settings;
      if (
        settings.cdnEnabled === true &&
        settings.cdnUrl === 'https://cdn.test.com' &&
        settings.autoBackup === true
      ) {
        this.passTest('CDN・バックアップ設定');
      } else {
        this.failTest('CDN・バックアップ設定', '設定値が不正');
      }
    } catch (error) {
      this.failTest('CDN・バックアップ設定', error.message);
    }
  }

  async testNotificationSettings() {
    log('\n【通知設定テスト】', 'blue');
    
    // 1. 通知設定の更新
    try {
      const response = await axios.put(
        `${BASE_URL}/api/admin/settings/notification`,
        {
          settings: testSettings.notification,
          reason: '通知設定のテスト'
        },
        { headers }
      );
      if (response.data.success) {
        this.passTest('通知設定の更新');
      }
    } catch (error) {
      this.failTest('通知設定の更新', error.message);
    }

    // 2. 通知メール設定の確認
    try {
      const response = await axios.get(`${BASE_URL}/api/admin/settings/notification`, { headers });
      const settings = response.data.settings;
      if (
        settings.notifyNewUser === true &&
        settings.notificationEmails?.includes('alert1@test.com')
      ) {
        this.passTest('通知メール設定');
      } else {
        this.failTest('通知メール設定', '設定値が不正');
      }
    } catch (error) {
      this.failTest('通知メール設定', error.message);
    }

    // 3. パフォーマンスアラート設定の確認
    try {
      const response = await axios.get(`${BASE_URL}/api/admin/settings/notification`, { headers });
      const settings = response.data.settings;
      if (
        settings.cpuAlertThreshold === 75 &&
        settings.memoryAlertThreshold === 80 &&
        settings.diskAlertThreshold === 85
      ) {
        this.passTest('パフォーマンスアラート設定');
      } else {
        this.failTest('パフォーマンスアラート設定', '閾値が不正');
      }
    } catch (error) {
      this.failTest('パフォーマンスアラート設定', error.message);
    }
  }

  async testApiSettings() {
    log('\n【API設定テスト】', 'blue');
    
    // 1. API設定の更新
    try {
      const response = await axios.put(
        `${BASE_URL}/api/admin/settings/api`,
        {
          settings: testSettings.api,
          reason: 'API設定のテスト'
        },
        { headers }
      );
      if (response.data.success) {
        this.passTest('API設定の更新');
      }
    } catch (error) {
      this.failTest('API設定の更新', error.message);
    }

    // 2. レート制限設定の確認
    try {
      const response = await axios.get(`${BASE_URL}/api/admin/settings/api`, { headers });
      const settings = response.data.settings;
      if (
        settings.rateLimitPerMinute === 100 &&
        settings.rateLimitPerHour === 5000 &&
        settings.rateLimitExcludedIPs?.includes('127.0.0.1')
      ) {
        this.passTest('レート制限設定');
      } else {
        this.failTest('レート制限設定', '設定値が不正');
      }
    } catch (error) {
      this.failTest('レート制限設定', error.message);
    }

    // 3. CORS設定の確認
    try {
      const response = await axios.get(`${BASE_URL}/api/admin/settings/api`, { headers });
      const settings = response.data.settings;
      if (
        settings.corsEnabled === true &&
        settings.allowedOrigins?.includes('https://test.com') &&
        settings.allowedMethods?.includes('POST')
      ) {
        this.passTest('CORS設定');
      } else {
        this.failTest('CORS設定', '設定値が不正');
      }
    } catch (error) {
      this.failTest('CORS設定', error.message);
    }

    // 4. Webhook設定の確認
    try {
      const response = await axios.get(`${BASE_URL}/api/admin/settings/api`, { headers });
      const settings = response.data.settings;
      if (
        settings.webhookUrl === 'https://webhook.test.com/endpoint' &&
        settings.webhookEvents?.includes('user.created')
      ) {
        this.passTest('Webhook設定');
      } else {
        this.failTest('Webhook設定', '設定値が不正');
      }
    } catch (error) {
      this.failTest('Webhook設定', error.message);
    }
  }

  async testValidation() {
    log('\n【バリデーションテスト】', 'blue');

    // 1. 不正なカテゴリ
    try {
      await axios.get(`${BASE_URL}/api/admin/settings/invalid_category`, { headers });
      this.failTest('不正カテゴリのバリデーション', 'エラーが発生しなかった');
    } catch (error) {
      if (error.response?.status === 400) {
        this.passTest('不正カテゴリのバリデーション');
      } else {
        this.failTest('不正カテゴリのバリデーション', error.message);
      }
    }

    // 2. パスワード最小長の範囲外
    try {
      await axios.put(
        `${BASE_URL}/api/admin/settings/security`,
        {
          settings: { passwordMinLength: 5 }, // 最小値8未満
          reason: 'バリデーションテスト'
        },
        { headers }
      );
      this.failTest('パスワード最小長バリデーション', 'エラーが発生しなかった');
    } catch (error) {
      if (error.response?.status === 400) {
        this.passTest('パスワード最小長バリデーション');
      } else {
        this.failTest('パスワード最小長バリデーション', error.message);
      }
    }

    // 3. 不正なメールアドレス形式
    try {
      await axios.put(
        `${BASE_URL}/api/admin/settings/email`,
        {
          settings: { emailFrom: 'invalid-email' }, // 不正な形式
          reason: 'バリデーションテスト'
        },
        { headers }
      );
      this.failTest('メールアドレスバリデーション', 'エラーが発生しなかった');
    } catch (error) {
      if (error.response?.status === 400) {
        this.passTest('メールアドレスバリデーション');
      } else {
        this.failTest('メールアドレスバリデーション', error.message);
      }
    }

    // 4. 権限なしアクセス
    try {
      await axios.get(`${BASE_URL}/api/admin/settings/general`, {
        headers: { 'x-admin-secret': 'wrong-secret' }
      });
      this.failTest('権限チェック', '不正な権限でアクセスできた');
    } catch (error) {
      if (error.response?.status === 401) {
        this.passTest('権限チェック');
      } else {
        this.failTest('権限チェック', error.message);
      }
    }
  }

  async testIntegration() {
    log('\n【統合テスト】', 'blue');

    // 1. 全設定の一括取得
    try {
      const response = await axios.get(`${BASE_URL}/api/admin/settings`, { headers });
      if (
        response.data.settings &&
        response.data.settings.general &&
        response.data.settings.security &&
        response.data.settings.email &&
        response.data.settings.storage &&
        response.data.settings.notification &&
        response.data.settings.api
      ) {
        this.passTest('全設定の一括取得');
      } else {
        this.failTest('全設定の一括取得', 'カテゴリが不足');
      }
    } catch (error) {
      this.failTest('全設定の一括取得', error.message);
    }

    // 2. 設定変更の永続性
    const testValue = `Test_${Date.now()}`;
    try {
      // 設定を変更
      await axios.put(
        `${BASE_URL}/api/admin/settings/general`,
        {
          settings: { siteName: testValue },
          reason: '永続性テスト'
        },
        { headers }
      );

      // 再取得して確認
      const response = await axios.get(`${BASE_URL}/api/admin/settings/general`, { headers });
      if (response.data.settings.siteName === testValue) {
        this.passTest('設定変更の永続性');
      } else {
        this.failTest('設定変更の永続性', '設定が保存されていない');
      }
    } catch (error) {
      this.failTest('設定変更の永続性', error.message);
    }

    // 3. 複数カテゴリの同時更新
    try {
      const updates = [
        axios.put(`${BASE_URL}/api/admin/settings/general`, {
          settings: { siteName: 'Updated General' },
          reason: '同時更新テスト'
        }, { headers }),
        axios.put(`${BASE_URL}/api/admin/settings/security`, {
          settings: { sessionTimeout: 45 },
          reason: '同時更新テスト'
        }, { headers }),
        axios.put(`${BASE_URL}/api/admin/settings/api`, {
          settings: { rateLimitPerMinute: 200 },
          reason: '同時更新テスト'
        }, { headers })
      ];

      const results = await Promise.all(updates);
      if (results.every(r => r.data.success)) {
        this.passTest('複数カテゴリの同時更新');
      } else {
        this.failTest('複数カテゴリの同時更新', '一部の更新が失敗');
      }
    } catch (error) {
      this.failTest('複数カテゴリの同時更新', error.message);
    }
  }

  passTest(testName) {
    this.passedTests++;
    this.totalTests++;
    log(`  ✓ ${testName}`, 'green');
  }

  failTest(testName, reason) {
    this.failedTests++;
    this.totalTests++;
    log(`  ✗ ${testName}: ${reason}`, 'red');
  }

  printSummary() {
    log('\n========================================', 'bright');
    log('           テスト結果サマリー', 'cyan');
    log('========================================', 'bright');
    
    const successRate = ((this.passedTests / this.totalTests) * 100).toFixed(1);
    
    log(`\n合計テスト数: ${this.totalTests}`, 'bright');
    log(`成功: ${this.passedTests}`, 'green');
    log(`失敗: ${this.failedTests}`, this.failedTests > 0 ? 'red' : 'green');
    log(`成功率: ${successRate}%`, successRate >= 80 ? 'green' : 'yellow');
    
    if (this.failedTests === 0) {
      log('\n🎉 すべてのテストに合格しました！', 'green');
    } else {
      log(`\n⚠️  ${this.failedTests}件のテストが失敗しました`, 'yellow');
      log('失敗したテストを確認して修正してください', 'yellow');
    }
    
    log('\n========================================\n', 'bright');
  }
}

// テスト実行
async function runTests() {
  const tester = new SystemSettingsTest();
  await tester.runAllTests();
  process.exit(tester.failedTests > 0 ? 1 : 0);
}

// メイン実行
if (require.main === module) {
  runTests().catch(error => {
    log(`\nテスト実行中にエラーが発生しました: ${error.message}`, 'red');
    process.exit(1);
  });
}

module.exports = SystemSettingsTest;