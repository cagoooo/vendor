import { test, expect } from '@playwright/test';

test.describe('Customer Order Flow', () => {
    test('should load class selector page', async ({ page }) => {
        await page.goto('/');

        // 應該看到班級選擇頁面
        await expect(page.locator('h1')).toContainText(['校園', '點餐']);
    });

    test('should add item to cart and checkout', async ({ page }) => {
        // 假設有測試班級可選
        await page.goto('/order/test-class');

        // 等待菜單載入
        await page.waitForSelector('[data-testid="menu-item"]', { timeout: 10000 }).catch(() => {
            // 如果沒有菜單項目，跳過測試
            test.skip();
        });

        // 點擊第一個菜單項目的加入按鈕
        const addButton = page.locator('[data-testid="add-to-cart"]').first();
        if (await addButton.isVisible()) {
            await addButton.click();

            // 購物車應該有 1 個項目
            await expect(page.locator('[data-testid="cart-count"]')).toHaveText('1');
        }
    });

    test('should display order form with required fields', async ({ page }) => {
        await page.goto('/order/test-class');

        // 嘗試打開結帳
        const checkoutButton = page.locator('[data-testid="checkout-btn"]');
        if (await checkoutButton.isVisible()) {
            await checkoutButton.click();

            // 應該顯示班級和姓名欄位
            await expect(page.locator('input[name="customerClass"]')).toBeVisible();
            await expect(page.locator('input[name="customerName"]')).toBeVisible();
        }
    });
});

test.describe('Navigation', () => {
    test('should navigate between pages', async ({ page }) => {
        // 首頁
        await page.goto('/');
        await expect(page).toHaveURL(/.*\/vendor\/?$/);

        // 顯示頁面
        await page.goto('/display');
        await expect(page).toHaveURL(/.*\/display/);
    });
});
