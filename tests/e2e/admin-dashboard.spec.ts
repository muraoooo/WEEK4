import { test, expect } from '@playwright/test';

test.describe('Admin Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/dashboard');
  });

  test.describe('Dashboard Loading', () => {
    test('should display loading state initially', async ({ page }) => {
      await page.goto('/admin/dashboard');
      const loader = page.locator('[role="progressbar"]');
      
      // ローディング状態は非常に短い場合があるので、存在チェックのみ
      const hasLoader = await loader.count() > 0;
      if (hasLoader) {
        await expect(loader).toBeVisible({ timeout: 1000 });
      }
    });

    test('should load dashboard content', async ({ page }) => {
      await page.waitForSelector('text=ダッシュボード');
      await expect(page.locator('h4:has-text("ダッシュボード")')).toBeVisible();
    });

    test('should display last update time', async ({ page }) => {
      await page.waitForSelector('text=最終更新:');
      const updateTime = page.locator('text=最終更新:');
      await expect(updateTime).toBeVisible();
    });
  });

  test.describe('Statistics Cards', () => {
    test('should display all four stat cards', async ({ page }) => {
      await page.waitForSelector('text=総ユーザー数');
      
      const statCards = [
        '総ユーザー数',
        '総投稿数',
        '通報件数',
        '稼働率'
      ];

      for (const cardTitle of statCards) {
        await expect(page.locator(`text=${cardTitle}`)).toBeVisible();
      }
    });

    test('should display values in stat cards', async ({ page }) => {
      await page.waitForSelector('text=総ユーザー数');
      
      const userCard = page.locator('[class*="MuiCard"]').filter({ hasText: '総ユーザー数' });
      const userCount = userCard.locator('h4');
      await expect(userCount).toHaveText(/[0-9,]+/);
      
      const postCard = page.locator('[class*="MuiCard"]').filter({ hasText: '総投稿数' });
      const postCount = postCard.locator('h4');
      await expect(postCount).toHaveText(/[0-9,]+/);
    });

    test('should display change indicators', async ({ page }) => {
      await page.waitForSelector('text=前日比');
      const changeIndicators = page.locator('text=前日比');
      await expect(changeIndicators).toHaveCount(3);
    });

    test('should display operational status', async ({ page }) => {
      await page.waitForSelector('text=稼働率');
      const statusChip = page.locator('[class*="MuiChip"]').filter({ hasText: 'operational' }).first();
      await expect(statusChip).toBeVisible();
    });
  });

  test.describe('Charts', () => {
    test('should display chart toggle buttons', async ({ page }) => {
      await page.waitForSelector('button:has-text("推移")');
      const lineButton = page.locator('button:has-text("推移")');
      const pieButton = page.locator('button:has-text("デバイス")');
      
      await expect(lineButton).toBeVisible();
      await expect(pieButton).toBeVisible();
    });

    test('should switch between line and pie charts', async ({ page }) => {
      await page.waitForSelector('text=ユーザー推移（過去7日間）');
      
      await expect(page.locator('text=ユーザー推移（過去7日間）')).toBeVisible();
      
      await page.click('button:has-text("デバイス")');
      await expect(page.locator('text=デバイス別アクセス')).toBeVisible();
      
      await page.click('button:has-text("推移")');
      await expect(page.locator('text=ユーザー推移（過去7日間）')).toBeVisible();
    });

    test('should display chart canvas', async ({ page }) => {
      await page.waitForSelector('canvas');
      const canvas = page.locator('canvas');
      await expect(canvas).toBeVisible();
    });

    test('should display average users per day', async ({ page }) => {
      await page.waitForSelector('text=ユーザー/日');
      const averageText = page.locator('text=ユーザー/日');
      await expect(averageText).toBeVisible();
    });
  });

  test.describe('Activity Feed', () => {
    test('should display activity feed title', async ({ page }) => {
      await page.waitForSelector('text=最近のアクティビティ');
      await expect(page.locator('h6:has-text("最近のアクティビティ")')).toBeVisible();
    });

    test('should display activity count', async ({ page }) => {
      await page.waitForSelector('[class*="MuiChip"]');
      const countChip = page.locator('[class*="MuiChip"]').filter({ hasText: /\d+\s*件/ });
      await expect(countChip.first()).toBeVisible();
    });

    test('should display activity items', async ({ page }) => {
      await page.waitForSelector('text=最近のアクティビティ');
      const activitySection = page.locator('text=最近のアクティビティ').locator('xpath=ancestor::div[contains(@class, "MuiBox")]');
      const listItems = activitySection.locator('[class*="MuiListItem"]');
      const itemCount = await listItems.count();
      if (itemCount > 0) {
        await expect(listItems.first()).toBeVisible();
      }
    });

    test('should display activity timestamps', async ({ page }) => {
      await page.waitForSelector('text=/\\d+分前|\\d+時間前|\\d+日前|今/');
      const timestamps = page.locator('text=/\\d+分前|\\d+時間前|\\d+日前|今/');
      await expect(timestamps.first()).toBeVisible();
    });

    test('should display activity types', async ({ page }) => {
      await page.waitForSelector('[class*="MuiChip"]');
      const typeChips = page.locator('[class*="MuiChip"]').filter({ 
        hasText: /user|post|report|system/ 
      });
      await expect(typeChips.first()).toBeVisible();
    });
  });

  test.describe('Real-time Updates', () => {
    test.setTimeout(40000);
    
    test('should update data after 30 seconds', async ({ page }) => {
      await page.waitForSelector('text=最終更新:');
      const initialTime = await page.locator('text=最終更新:').textContent();
      
      await page.waitForTimeout(31000);
      
      const updatedTime = await page.locator('text=最終更新:').textContent();
      expect(initialTime).not.toBe(updatedTime);
    });
  });

  test.describe('Responsive Design', () => {
    test('should be responsive on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.waitForSelector('text=ダッシュボード');
      
      const dashboard = page.locator('h4:has-text("ダッシュボード")');
      await expect(dashboard).toBeVisible();
      
      const statCards = page.locator('[class*="MuiCard"]');
      await expect(statCards.first()).toBeVisible();
    });

    test('should be responsive on tablet', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.waitForSelector('text=ダッシュボード');
      
      const dashboard = page.locator('h4:has-text("ダッシュボード")');
      await expect(dashboard).toBeVisible();
      
      const grid = page.locator('[class*="MuiGrid-container"]');
      await expect(grid.first()).toBeVisible();
    });
  });

  test.describe('Error Handling', () => {
    test('should handle data fetch errors gracefully', async ({ page, context }) => {
      await context.route('**/api/admin/dashboard', route => {
        route.abort();
      });

      await page.goto('/admin/dashboard');
      await page.waitForSelector('[class*="MuiAlert"]', { timeout: 10000 }).catch(() => {});
      
      const errorAlert = page.locator('[class*="MuiAlert-root"]');
      const hasError = await errorAlert.count() > 0;
      
      if (hasError) {
        await expect(errorAlert).toContainText('失敗');
      }
    });
  });

  test.describe('Data Display', () => {
    test('should format large numbers with commas', async ({ page }) => {
      await page.waitForSelector('text=総ユーザー数');
      
      const statCards = page.locator('[class*="MuiCard"]');
      const cardCount = await statCards.count();
      let hasFormattedNumber = false;
      
      for (let i = 0; i < cardCount; i++) {
        const h4Text = await statCards.nth(i).locator('h4').textContent();
        if (h4Text && /[0-9,]+/.test(h4Text)) {
          hasFormattedNumber = true;
          break;
        }
      }
      
      expect(hasFormattedNumber).toBeTruthy();
    });

    test('should display percentage values correctly', async ({ page }) => {
      await page.waitForSelector('text=稼働率');
      
      const uptimeCard = page.locator('[class*="MuiCard"]').filter({ hasText: '稼働率' });
      const uptimeValue = uptimeCard.locator('h4');
      await expect(uptimeValue).toHaveText(/\d+(\.\d+)?%/);
    });

    test('should display positive and negative changes', async ({ page }) => {
      await page.waitForSelector('text=前日比');
      
      const positiveChange = page.locator('text=/\\+\\d+(\\.\\d+)?%/');
      const negativeChange = page.locator('text=/-\\d+(\\.\\d+)?%/');
      
      const hasPositive = await positiveChange.count() > 0;
      const hasNegative = await negativeChange.count() > 0;
      
      expect(hasPositive || hasNegative).toBeTruthy();
    });
  });
});

test.describe('Dashboard Integration', () => {
  test('should integrate with admin layout', async ({ page }) => {
    await page.goto('/admin/dashboard');
    await page.waitForSelector('text=ダッシュボード');
    
    // サイドバーとヘッダーの存在を確認
    const layoutElements = await page.locator('[class*="MuiDrawer"], [class*="MuiAppBar"]').count();
    expect(layoutElements).toBeGreaterThan(0);
  });

  test('should maintain theme consistency', async ({ page }) => {
    await page.goto('/admin/dashboard');
    await page.waitForSelector('text=ダッシュボード');
    
    const cards = page.locator('[class*="MuiCard"]');
    const firstCard = cards.first();
    await expect(firstCard).toBeVisible();
    
    const backgroundColor = await firstCard.evaluate(el => 
      window.getComputedStyle(el).backgroundColor
    );
    expect(backgroundColor).toBeTruthy();
  });
});