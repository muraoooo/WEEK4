import { test, expect } from '@playwright/test';

test.describe('Homepage Tests', () => {
  test('should display the main page correctly', async ({ page }) => {
    await page.goto('/');

    // ページタイトルを確認
    await expect(page).toHaveTitle(/Secure Session System/);

    // メインヘッダーが表示されているか確認
    await expect(page.locator('h1')).toContainText('Secure Session System');

    // 説明文が表示されているか確認
    const description = page.locator('p').first();
    await expect(description).toContainText('エンタープライズレベルのセキュリティを提供');

    // リフレッシュトークンAPIリンクが存在するか確認
    const apiLink = page.locator('a[href="/api/auth/refresh"]');
    await expect(apiLink).toBeVisible();
    await expect(apiLink).toContainText('リフレッシュトークンAPI');

    // セキュリティ機能リストが表示されているか確認
    await expect(page.locator('ul')).toBeVisible();
    await expect(page.locator('li')).toHaveCount(6);
    
    // 各セキュリティ機能が表示されているか確認
    await expect(page.locator('li')).toContainText(['JWT認証', 'セキュアクッキー', 'デバイスフィンガープリント', 'セッションタイムアウト', 'CSRF保護', '同時ログイン制御']);
  });

  test('should have proper meta tags for security', async ({ page }) => {
    await page.goto('/');

    // セキュリティメタタグが設定されているか確認
    const viewport = page.locator('meta[name="viewport"]').first();
    await expect(viewport).toHaveAttribute('content', 'width=device-width, initial-scale=1');

    const robots = page.locator('meta[name="robots"]');
    await expect(robots).toHaveAttribute('content', 'noindex, nofollow');
  });

  test('should have responsive design', async ({ page }) => {
    // デスクトップ表示
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.goto('/');
    
    const container = page.locator('.max-w-md');
    await expect(container).toBeVisible();

    // モバイル表示
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(container).toBeVisible();

    // タブレット表示  
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(container).toBeVisible();
  });
});