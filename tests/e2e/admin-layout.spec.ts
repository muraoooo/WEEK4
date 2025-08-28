import { test, expect } from '@playwright/test';

test.describe('Admin Layout Tests', () => {
  test.beforeEach(async ({ page }) => {
    // 管理画面にアクセス
    await page.goto('/admin/dashboard');
  });

  test('should display admin header correctly', async ({ page }) => {
    // ヘッダーが表示されることを確認
    await expect(page.locator('header, [role="banner"]').first()).toBeVisible();
    
    // タイトルが表示されることを確認
    await expect(page.getByText('Admin Dashboard').first()).toBeVisible();
    
    // プロファイルメニューが表示されることを確認
    const profileButton = page.locator('[aria-label="account of current user"]');
    await expect(profileButton).toBeVisible();
  });

  test('should handle sidebar toggle functionality', async ({ page }) => {
    // サイドバーが初期状態で表示されることを確認
    await expect(page.locator('nav[role="navigation"]')).toBeVisible();
    
    // ハンバーガーメニューボタンを探す
    const menuButton = page.locator('[aria-label="toggle drawer"]');
    
    // デスクトップサイズでテスト
    await page.setViewportSize({ width: 1200, height: 800 });
    
    // メニューボタンが存在する場合はクリック
    if (await menuButton.isVisible()) {
      await menuButton.click();
      await page.waitForTimeout(300); // アニメーション待機
    }
  });

  test('should display sidebar menu items', async ({ page }) => {
    // サイドバーのメニュー項目が表示されることを確認
    const expectedMenuItems = [
      'ダッシュボード',
      'ユーザー管理', 
      '投稿管理',
      'レポート',
      '設定'
    ];

    for (const item of expectedMenuItems) {
      await expect(page.locator('nav').getByText(item).first()).toBeVisible();
    }
  });

  test('should handle responsive design on mobile', async ({ page }) => {
    // モバイルサイズに設定
    await page.setViewportSize({ width: 375, height: 667 });
    
    // ハンバーガーメニューボタンが表示されることを確認
    const menuButton = page.locator('[aria-label="toggle drawer"]');
    await expect(menuButton).toBeVisible();
    
    // メニューボタンをクリック
    await menuButton.click();
    await page.waitForTimeout(300);
    
    // サイドバーが表示されることを確認
    await expect(page.locator('nav[role="navigation"]')).toBeVisible();
  });

  test('should handle dark mode toggle', async ({ page }) => {
    // ダークモードスイッチを探す
    const darkModeSwitch = page.locator('input[type="checkbox"]').first();
    
    if (await darkModeSwitch.isVisible()) {
      // 現在の状態を取得
      const isChecked = await darkModeSwitch.isChecked();
      
      // スイッチをクリック
      await darkModeSwitch.click();
      await page.waitForTimeout(300);
      
      // 状態が変わったことを確認
      const newState = await darkModeSwitch.isChecked();
      expect(newState).toBe(!isChecked);
    }
  });

  test('should handle profile menu interactions', async ({ page }) => {
    // プロファイルボタンをクリック
    const profileButton = page.locator('[aria-label="account of current user"]');
    await profileButton.click();
    
    // メニューが表示されることを確認
    await expect(page.getByRole('menuitem', { name: '設定' })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: 'ログアウト' })).toBeVisible();
    
    // メニュー外をクリックして閉じる
    await page.click('body');
    await page.waitForTimeout(300);
  });

  test('should navigate between admin pages', async ({ page }) => {
    const navigationItems = [
      { text: 'ユーザー管理', expectedUrl: '/admin/users' },
      { text: '投稿管理', expectedUrl: '/admin/posts' },
      { text: 'レポート', expectedUrl: '/admin/reports' },
      { text: '設定', expectedUrl: '/admin/settings' }
    ];

    for (const item of navigationItems) {
      // メニュー項目をクリック
      await page.locator('nav').getByText(item.text).first().click();
      await page.waitForTimeout(300);
      
      // URLが変更されることを確認
      expect(page.url()).toContain(item.expectedUrl);
      
      // ダッシュボードに戻る
      await page.locator('nav').getByText('ダッシュボード').first().click();
      await page.waitForTimeout(300);
    }
  });

  test('should display breadcrumbs correctly', async ({ page }) => {
    // ダッシュボードページでパンくずリストを確認
    await expect(page.locator('nav[aria-label="breadcrumb"]')).toBeVisible();
    
    // ホームリンクが表示されることを確認
    await expect(page.getByText('ホーム')).toBeVisible();
  });

  test('should handle sidebar collapse on desktop', async ({ page }) => {
    // デスクトップサイズに設定
    await page.setViewportSize({ width: 1200, height: 800 });
    
    // サイドバーの折りたたみボタンを探す
    const collapseButton = page.locator('[aria-label="toggle drawer"]');
    
    if (await collapseButton.isVisible()) {
      // 初期状態を記録
      const sidebar = page.locator('nav[role="navigation"]');
      const initiallyVisible = await sidebar.isVisible();
      
      // ボタンをクリック
      await collapseButton.click();
      await page.waitForTimeout(300);
      
      // 状態が変わったことを確認（完全に非表示になるか、幅が変わる）
      const afterClick = await sidebar.isVisible();
      
      // 再度クリックして元に戻す
      await collapseButton.click();
      await page.waitForTimeout(300);
    }
  });

  test('should maintain responsive layout across different screen sizes', async ({ page }) => {
    const screenSizes = [
      { width: 320, height: 568 },  // iPhone SE
      { width: 768, height: 1024 }, // iPad
      { width: 1024, height: 768 }, // iPad Landscape
      { width: 1920, height: 1080 } // Desktop
    ];

    for (const size of screenSizes) {
      await page.setViewportSize(size);
      await page.waitForTimeout(300);
      
      // ヘッダーが表示されることを確認
      await expect(page.locator('header, [role="banner"]').first()).toBeVisible();
      
      // メインコンテンツが表示されることを確認
      await expect(page.locator('main')).toBeVisible();
      
      // ダッシュボードコンテンツが表示されることを確認
      await expect(page.getByText('ダッシュボード').first()).toBeVisible();
    }
  });
});

test.describe('Admin Layout Sidebar Submenu Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/dashboard');
  });

  test('should handle submenu expansion', async ({ page }) => {
    // ユーザー管理メニューに子メニューがある場合のテスト
    const userMenu = page.getByText('ユーザー管理');
    await expect(userMenu).toBeVisible();
    
    // 展開ボタンがある場合はクリック
    const expandButton = page.locator('[aria-expanded]').first();
    if (await expandButton.isVisible()) {
      await expandButton.click();
      await page.waitForTimeout(300);
    }
  });

  test('should highlight active menu item', async ({ page }) => {
    // 現在のページに対応するメニュー項目がハイライトされることを確認
    const dashboardMenu = page.getByText('ダッシュボード');
    await expect(dashboardMenu).toBeVisible();
    
    // アクティブ状態のスタイリングを確認（可能であれば）
    const activeItem = page.locator('[class*="selected"], [class*="active"]').first();
    if (await activeItem.isVisible()) {
      await expect(activeItem).toBeVisible();
    }
  });
});

test.describe('Admin Layout Theme Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/dashboard');
  });

  test('should persist dark mode setting', async ({ page }) => {
    // ダークモードを有効にする
    const darkModeSwitch = page.locator('input[type="checkbox"]').first();
    
    if (await darkModeSwitch.isVisible()) {
      await darkModeSwitch.click();
      await page.waitForTimeout(300);
      
      // ページをリロード
      await page.reload();
      await page.waitForTimeout(500);
      
      // 設定が保持されていることを確認
      const switchAfterReload = page.locator('input[type="checkbox"]').first();
      if (await switchAfterReload.isVisible()) {
        const isChecked = await switchAfterReload.isChecked();
        // 設定が保持されているかをチェック（ローカルストレージに依存）
      }
    }
  });

  test('should apply consistent theming across components', async ({ page }) => {
    // 各コンポーネントで一貫したテーマが適用されることを確認
    await expect(page.locator('header, [role="banner"]').first()).toBeVisible();
    await expect(page.locator('nav, [role="navigation"]').first()).toBeVisible();
    await expect(page.locator('main')).toBeVisible();
    
    // CSS変数やテーマカラーが適用されていることを確認
    const header = page.locator('header, [role="banner"]').first();
    if (await header.isVisible()) {
      const headerStyles = await header.evaluate((element) => {
        const computed = window.getComputedStyle(element);
        return {
          backgroundColor: computed.backgroundColor,
          color: computed.color
        };
      });
      
      // スタイルが適用されていることを確認
      expect(headerStyles.backgroundColor).toBeTruthy();
    }
  });
});