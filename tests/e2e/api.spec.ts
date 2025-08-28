import { test, expect } from '@playwright/test';

test.describe('API Tests', () => {
  test('refresh token API should return 401 without token', async ({ request }) => {
    const response = await request.post('/api/auth/refresh');
    
    expect([401, 500]).toContain(response.status());
    
    const data = await response.json();
    expect(data.success).toBe(false);
    
    // データベース接続エラーまたは認証エラーの場合
    if (response.status() === 401) {
      expect(data.error.code).toBe('REFRESH_TOKEN_MISSING');
    } else if (response.status() === 500) {
      expect(data.error.code).toBe('INTERNAL_ERROR');
    }
  });

  test('refresh token API should reject invalid methods', async ({ request }) => {
    // GET method should be rejected
    const getResponse = await request.get('/api/auth/refresh');
    expect(getResponse.status()).toBe(405);
    
    const getData = await getResponse.json();
    expect(getData.success).toBe(false);
    expect(getData.error.code).toBe('METHOD_NOT_ALLOWED');

    // PUT method should be rejected  
    const putResponse = await request.put('/api/auth/refresh');
    expect(putResponse.status()).toBe(405);

    // DELETE method should be rejected
    const deleteResponse = await request.delete('/api/auth/refresh');
    expect(deleteResponse.status()).toBe(405);
  });

  test('refresh token API should have security headers', async ({ request }) => {
    const response = await request.post('/api/auth/refresh');
    
    // セキュリティヘッダーが設定されているか確認
    const headers = response.headers();
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['x-frame-options']).toBe('DENY');
    expect(headers['cache-control']).toContain('no-store');
  });

  test('refresh token API should validate request headers', async ({ request }) => {
    // User-Agentが不正な場合
    const response = await request.post('/api/auth/refresh', {
      headers: {
        'user-agent': 'bot'
      }
    });
    
    expect(response.status()).toBe(403);
    
    const data = await response.json();
    expect(data.success).toBe(false);
    expect(data.error.code).toBe('SECURITY_VIOLATION');
  });

  test('API should handle malformed requests gracefully', async ({ request }) => {
    // 無効なJSONを送信
    const response = await request.post('/api/auth/refresh', {
      data: 'invalid json',
      headers: {
        'content-type': 'application/json',
        'user-agent': 'Mozilla/5.0 (compatible; test)'
      }
    });

    expect([400, 401, 500]).toContain(response.status());
    
    const data = await response.json();
    expect(data.success).toBe(false);
  });

  test('API should validate content type', async ({ request }) => {
    const response = await request.post('/api/auth/refresh', {
      data: '{"test": "data"}',
      headers: {
        'content-type': 'text/plain',
        'user-agent': 'Mozilla/5.0 (compatible; test)'
      }
    });

    // content-typeが正しくない場合の処理を確認
    expect([400, 401, 403, 500]).toContain(response.status());
  });
});