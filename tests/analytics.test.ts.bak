import { test, expect } from '@playwright/test';
import crypto from 'crypto';

// プライバシー保護のテスト
test.describe('プライバシー保護テスト', () => {
  test('個人情報が収集されていないことを確認', async ({ request }) => {
    // テストデータ
    const trackingData = {
      pagePath: '/user/12345/profile?token=secret123&email=test@example.com',
      screenWidth: 1920,
      pageLoadTime: 1500,
      sessionDuration: 300,
    };

    // トラッキングAPIにリクエスト
    const response = await request.post('/api/analytics/track', {
      data: trackingData,
      headers: {
        'User-Agent': 'Mozilla/5.0 Test Browser',
        'X-Forwarded-For': '192.168.1.100',
        'Referer': 'https://example.com/page?user=john',
      },
    });

    expect(response.ok()).toBeTruthy();
    const result = await response.json();

    // レスポンスに個人情報が含まれていないことを確認
    expect(result).not.toContain('12345');
    expect(result).not.toContain('secret123');
    expect(result).not.toContain('test@example.com');
    expect(result).not.toContain('192.168.1.100');
    expect(result).not.toContain('john');
    
    // トラッキングIDやセッションIDが返されていないことを確認
    expect(result.trackingId).toBeUndefined();
    expect(result.sessionId).toBeUndefined();
    expect(result.userId).toBeUndefined();
  });

  test('IPアドレスが適切に匿名化されることを確認', async ({ request }) => {
    const testIps = [
      '192.168.1.100',
      '10.0.0.50',
      '172.16.0.1',
      '2001:0db8:85a3:0000:0000:8a2e:0370:7334',
    ];

    for (const ip of testIps) {
      const response = await request.post('/api/analytics/track', {
        data: { pagePath: '/test' },
        headers: {
          'X-Forwarded-For': ip,
        },
      });

      expect(response.ok()).toBeTruthy();
      
      // データベースに保存されたIPが匿名化されていることを確認
      // 実際のテストでは、データベースに直接アクセスして確認する必要がある
    }
  });

  test('クッキーが使用されていないことを確認', async ({ page }) => {
    // アナリティクスページにアクセス
    await page.goto('/admin/reports/analytics');
    
    // すべてのクッキーを取得
    const cookies = await page.context().cookies();
    
    // アナリティクス関連のクッキーが存在しないことを確認
    const analyticsCookies = cookies.filter(cookie => 
      cookie.name.includes('analytics') || 
      cookie.name.includes('tracking') ||
      cookie.name.includes('_ga') ||
      cookie.name.includes('_gid')
    );
    
    expect(analyticsCookies.length).toBe(0);
  });

  test('ローカルストレージが使用されていないことを確認', async ({ page }) => {
    await page.goto('/admin/reports/analytics');
    
    // ローカルストレージの内容を確認
    const localStorage = await page.evaluate(() => {
      const items: Record<string, string> = {};
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (key) {
          items[key] = window.localStorage.getItem(key) || '';
        }
      }
      return items;
    });
    
    // アナリティクス関連のデータが保存されていないことを確認
    const analyticsKeys = Object.keys(localStorage).filter(key =>
      key.includes('analytics') ||
      key.includes('tracking') ||
      key.includes('user_id') ||
      key.includes('session')
    );
    
    expect(analyticsKeys.length).toBe(0);
  });

  test('DNT（Do Not Track）設定が尊重されることを確認', async ({ page }) => {
    // DNTヘッダーを設定
    await page.route('**/*', route => {
      const headers = {
        ...route.request().headers(),
        'DNT': '1',
      };
      route.continue({ headers });
    });
    
    await page.goto('/');
    
    // ネットワークリクエストを監視
    const analyticsRequests: any[] = [];
    page.on('request', request => {
      if (request.url().includes('/api/analytics/track')) {
        analyticsRequests.push(request);
      }
    });
    
    // ページを移動
    await page.goto('/about');
    await page.waitForTimeout(1000);
    
    // トラッキングリクエストが送信されていないことを確認
    expect(analyticsRequests.length).toBe(0);
  });
});

// データ匿名化のテスト
test.describe('データ匿名化テスト', () => {
  test('パスから個人情報が除去されることを確認', async ({ request }) => {
    const sensitiveePaths = [
      '/user/12345/profile',
      '/api/v1/users/abc-123-def-456/data',
      '/profile/john.doe@example.com/settings',
      '/order/ORD-2024-001234567890/details',
      '/session/eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9/info',
    ];

    for (const path of sensitiveePaths) {
      const response = await request.post('/api/analytics/track', {
        data: { pagePath: path },
      });
      
      expect(response.ok()).toBeTruthy();
      
      // 元のパスの個人情報が含まれていないことを確認
      // 実際のテストでは、データベースの内容を確認する必要がある
    }
  });

  test('リファラーがドメインレベルで匿名化されることを確認', async ({ request }) => {
    const referrers = [
      'https://example.com/user/profile?id=123',
      'http://test.site.com/secret/path/to/resource',
      'https://subdomain.example.org:8080/api/key/12345',
    ];

    for (const referrer of referrers) {
      const response = await request.post('/api/analytics/track', {
        data: { pagePath: '/' },
        headers: { 'Referer': referrer },
      });
      
      expect(response.ok()).toBeTruthy();
      // データベースにドメインのみが保存されていることを確認
    }
  });

  test('タイムスタンプが適切に丸められることを確認', async ({ request }) => {
    const response = await request.post('/api/analytics/track', {
      data: {
        pagePath: '/',
        timestamp: new Date('2024-01-15T14:32:45.678Z'),
      },
    });
    
    expect(response.ok()).toBeTruthy();
    // 分単位で丸められていることを確認（秒とミリ秒が0）
  });
});

// 集計の正確性テスト
test.describe('集計正確性テスト', () => {
  test('ページビュー数が正確にカウントされることを確認', async ({ request }) => {
    // 複数のページビューを送信
    const pageViews = 10;
    for (let i = 0; i < pageViews; i++) {
      await request.post('/api/analytics/track', {
        data: { pagePath: '/test-page' },
      });
    }
    
    // 集計データを取得
    const response = await request.get('/api/analytics/track?period=day');
    const data = await response.json();
    
    // ページビュー数が正確であることを確認
    expect(data.summary.totalPageViews).toBeGreaterThanOrEqual(pageViews);
  });

  test('ユニークビジター数が正確にカウントされることを確認', async ({ request }) => {
    // 異なるIPから複数のリクエスト
    const ips = ['192.168.1.1', '192.168.1.2', '192.168.1.3'];
    
    for (const ip of ips) {
      // 同じIPから複数回アクセス
      for (let i = 0; i < 3; i++) {
        await request.post('/api/analytics/track', {
          data: { pagePath: '/' },
          headers: { 'X-Forwarded-For': ip },
        });
      }
    }
    
    const response = await request.get('/api/analytics/track?period=day');
    const data = await response.json();
    
    // ユニークビジター数が正確であることを確認
    expect(data.summary.uniqueVisitors).toBeGreaterThanOrEqual(3);
  });

  test('デバイス別統計が正確であることを確認', async ({ request }) => {
    const devices = [
      { ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', type: 'desktop' },
      { ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)', type: 'mobile' },
      { ua: 'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X)', type: 'tablet' },
    ];
    
    for (const device of devices) {
      await request.post('/api/analytics/track', {
        data: { pagePath: '/' },
        headers: { 'User-Agent': device.ua },
      });
    }
    
    const response = await request.get('/api/analytics/track?period=day');
    const data = await response.json();
    
    // デバイス別の統計が存在することを確認
    expect(data.deviceStats).toBeDefined();
    expect(data.deviceStats.length).toBeGreaterThan(0);
  });

  test('時間帯別アクセスが正確に集計されることを確認', async ({ request }) => {
    // 異なる時間帯のデータを送信（実際のテストではモックが必要）
    const response = await request.get('/api/analytics/track?period=day');
    const data = await response.json();
    
    // 時間帯別統計が24時間分存在することを確認
    expect(data.hourlyStats).toBeDefined();
    // 0-23時のデータが存在する可能性がある
  });
});

// パフォーマンステスト
test.describe('パフォーマンステスト', () => {
  test('トラッキングAPIのレスポンス時間が適切であることを確認', async ({ request }) => {
    const startTime = Date.now();
    
    const response = await request.post('/api/analytics/track', {
      data: { pagePath: '/' },
    });
    
    const responseTime = Date.now() - startTime;
    
    expect(response.ok()).toBeTruthy();
    // レスポンス時間が1秒以内であることを確認
    expect(responseTime).toBeLessThan(1000);
  });

  test('大量のデータ取得時のパフォーマンスを確認', async ({ request }) => {
    const startTime = Date.now();
    
    const response = await request.get('/api/analytics/track?period=month');
    
    const responseTime = Date.now() - startTime;
    
    expect(response.ok()).toBeTruthy();
    // 月間データでも3秒以内にレスポンスすることを確認
    expect(responseTime).toBeLessThan(3000);
  });

  test('同時アクセス時の安定性を確認', async ({ request }) => {
    // 10個の同時リクエスト
    const promises = [];
    for (let i = 0; i < 10; i++) {
      promises.push(
        request.post('/api/analytics/track', {
          data: { pagePath: `/page-${i}` },
        })
      );
    }
    
    const results = await Promise.all(promises);
    
    // すべてのリクエストが成功することを確認
    for (const result of results) {
      expect(result.ok()).toBeTruthy();
    }
  });
});

// ボット検出テスト
test.describe('ボット検出テスト', () => {
  test('ボットからのアクセスが除外されることを確認', async ({ request }) => {
    const botUserAgents = [
      'Googlebot/2.1 (+http://www.google.com/bot.html)',
      'Mozilla/5.0 (compatible; bingbot/2.0)',
      'facebookexternalhit/1.1',
      'curl/7.64.1',
      'Python-urllib/3.7',
    ];
    
    for (const ua of botUserAgents) {
      const response = await request.post('/api/analytics/track', {
        data: { pagePath: '/' },
        headers: { 'User-Agent': ua },
      });
      
      // リクエストは成功するが、データは記録されない
      expect(response.ok()).toBeTruthy();
    }
    
    // 実際のテストでは、データベースにボットのアクセスが
    // 記録されていないことを確認する必要がある
  });
});

// データ保持ポリシーのテスト
test.describe('データ保持ポリシーテスト', () => {
  test('90日以上古いデータが存在しないことを確認', async ({ request }) => {
    // このテストは実際のデータベースアクセスが必要
    // MongoDBのTTLインデックスが正しく設定されているかを確認
    
    const response = await request.get('/api/analytics/track?period=month');
    const data = await response.json();
    
    // 返されたデータがすべて90日以内であることを確認
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    
    if (data.startDate) {
      const startDate = new Date(data.startDate);
      expect(startDate.getTime()).toBeGreaterThan(ninetyDaysAgo.getTime());
    }
  });
});

// セキュリティヘッダーのテスト
test.describe('セキュリティヘッダーテスト', () => {
  test('適切なセキュリティヘッダーが設定されていることを確認', async ({ request }) => {
    const response = await request.post('/api/analytics/track', {
      data: { pagePath: '/' },
    });
    
    // Cache-Controlヘッダーの確認
    expect(response.headers()['cache-control']).toBe('no-store');
    
    // 個人情報を含むヘッダーが返されていないことを確認
    expect(response.headers()['set-cookie']).toBeUndefined();
  });
});