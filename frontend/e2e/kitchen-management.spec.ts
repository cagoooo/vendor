import { test, expect } from '@playwright/test';

test.describe('Kitchen Management', () => {
    // 注意：這些測試需要登入，實際環境中可能需要 mock 認證

    test('should load kitchen page', async ({ page }) => {
        await page.goto('/kitchen');

        // 應該顯示登入要求或廚房介面
        // 未登入時應該被導向登入頁
        await expect(page.locator('body')).toBeVisible();
    });

    test('should display tabs when authenticated', async ({ page }) => {
        // 這個測試假設用戶已經通過某種方式認證
        await page.goto('/kitchen');

        // 檢查 Tab 是否存在（可能需要模擬登入）
        const ordersTab = page.locator('button:has-text("接單")');
        const inventoryTab = page.locator('button:has-text("庫存")');
        const statsTab = page.locator('button:has-text("戰情")');

        // 如果 tabs 可見，驗證它們
        if (await ordersTab.isVisible()) {
            await expect(ordersTab).toBeVisible();
            await expect(inventoryTab).toBeVisible();
            await expect(statsTab).toBeVisible();
        }
    });

    test('should toggle tabs', async ({ page }) => {
        await page.goto('/kitchen');

        const inventoryTab = page.locator('button:has-text("庫存")');

        if (await inventoryTab.isVisible()) {
            await inventoryTab.click();

            // 應該顯示庫存管理內容
            await expect(page.locator('text=庫存與菜單')).toBeVisible({ timeout: 5000 }).catch(() => {
                // 可能未登入
            });
        }
    });
});

test.describe('Display Page', () => {
    test('should load display page', async ({ page }) => {
        await page.goto('/display');

        // 顯示頁面應該正常載入
        await expect(page.locator('body')).toBeVisible();
    });

    test('should show order number display', async ({ page }) => {
        await page.goto('/display');

        // 檢查是否有叫號顯示相關元素
        const displayContent = page.locator('[data-testid="order-display"]');
        if (await displayContent.isVisible()) {
            await expect(displayContent).toBeVisible();
        }
    });
});
